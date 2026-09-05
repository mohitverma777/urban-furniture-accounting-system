/**
 * src/services/accounting/index.ts
 *
 * Core Accounting Service — the double-entry bookkeeping engine.
 *
 * Implements the six core operations required by the Urban Furniture
 * accounting system:
 *
 *   1. createJournalEntry()      — Low-level balanced journal entry creation
 *   2. validateJournalBalance()  — Validates SUM(debit) === SUM(credit)
 *   3. postCustomerInvoice()     — Posts a Sales Order → General Ledger
 *   4. postVendorBill()          — Posts a Purchase Order → General Ledger
 *   5. recordCustomerPayment()   — Records cash/bank receipt from customer
 *   6. recordVendorPayment()     — Records cash/bank disbursement to vendor
 *
 * INVARIANTS:
 *   - Every posted entry satisfies:  SUM(debit) === SUM(credit)
 *   - All monetary values are INTEGER PAISE (1 INR = 100 paise)
 *   - Operations use DB transactions for atomicity
 *   - Payments reject zero/negative amounts, duplicates, and overpayments
 *   - Posting operations are idempotent where noted
 */

import { eq, sql, and } from "drizzle-orm";
import { db, type DB } from "@/db";
import {
  journalEntries,
  journalItems,
  orders,
  payments,
  type NewJournalItem,
} from "@/db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single line item for journal entry creation */
export interface JournalLineInput {
  accountId: string;
  debit: number;
  credit: number;
  analyticAccountId?: string | null;
}

/** Input for creating a journal entry */
export interface CreateJournalEntryInput {
  journalId: string;
  date: Date;
  reference?: string;
  description?: string;
  lines: JournalLineInput[];
}

/** Result of a journal entry creation */
export interface JournalEntryResult {
  entryId: string;
  totalDebit: number;
  totalCredit: number;
  lineCount: number;
}

/** Input for posting a customer invoice */
export interface PostCustomerInvoiceInput {
  orderId: string;
  salesJournalId: string;
  debtorsAccountId: string;
  salesIncomeAccountId: string;
  taxPayableAccountId?: string;
  date?: Date;
  reference?: string;
}

/** Input for posting a vendor bill */
export interface PostVendorBillInput {
  orderId: string;
  purchaseJournalId: string;
  purchaseExpenseAccountId: string;
  creditorsAccountId: string;
  analyticAccountId?: string;
  date?: Date;
  reference?: string;
}

/** Input for recording a customer payment */
export interface RecordCustomerPaymentInput {
  orderId: string;
  amount: number;
  paymentMethod: "CASH" | "BANK";
  bankJournalId: string;
  cashJournalId: string;
  bankAccountId: string;
  cashAccountId: string;
  debtorsAccountId: string;
  paymentDate?: Date;
  paymentReference?: string;
}

/** Input for recording a vendor payment */
export interface RecordVendorPaymentInput {
  orderId: string;
  amount: number;
  paymentMethod: "CASH" | "BANK";
  bankJournalId: string;
  cashJournalId: string;
  bankAccountId: string;
  cashAccountId: string;
  creditorsAccountId: string;
  paymentDate?: Date;
  paymentReference?: string;
}

/** Payment result returned to caller */
export interface PaymentResult {
  paymentId: string;
  journalEntryId: string;
  amount: number;
  newOrderStatus: "PARTIAL" | "PAID";
}

// ---------------------------------------------------------------------------
// Custom Error Classes
// ---------------------------------------------------------------------------

export class UnbalancedJournalError extends Error {
  constructor(
    public totalDebit: number,
    public totalCredit: number,
  ) {
    super(
      `Unbalanced journal entry: total debit (${totalDebit}) !== total credit (${totalCredit}). ` +
        `Difference: ${Math.abs(totalDebit - totalCredit)} paise.`,
    );
    this.name = "UnbalancedJournalError";
  }
}

export class DuplicatePaymentError extends Error {
  constructor(
    public existingPaymentId: string,
    public reference: string,
  ) {
    super(
      `Duplicate payment detected: a payment with reference "${reference}" ` +
        `already exists (ID: ${existingPaymentId}) for this order.`,
    );
    this.name = "DuplicatePaymentError";
  }
}

export class OverpaymentError extends Error {
  constructor(
    public orderTotal: number,
    public alreadyPaid: number,
    public attemptedAmount: number,
  ) {
    super(
      `Overpayment rejected: order total is ${orderTotal} paise, ` +
        `already paid ${alreadyPaid} paise, attempted ${attemptedAmount} paise. ` +
        `Maximum payable: ${orderTotal - alreadyPaid} paise.`,
    );
    this.name = "OverpaymentError";
  }
}

export class InvalidPaymentAmountError extends Error {
  constructor(public amount: number) {
    super(
      `Invalid payment amount: ${amount} paise. ` +
        `Payment amount must be a positive integer greater than zero.`,
    );
    this.name = "InvalidPaymentAmountError";
  }
}

export class OrderNotFoundError extends Error {
  constructor(public orderId: string) {
    super(`Order not found: ${orderId}`);
    this.name = "OrderNotFoundError";
  }
}

export class InvalidOrderTypeError extends Error {
  constructor(
    public orderId: string,
    public expectedType: string,
    public actualType: string,
  ) {
    super(
      `Order ${orderId} is type "${actualType}" but expected "${expectedType}".`,
    );
    this.name = "InvalidOrderTypeError";
  }
}

// ---------------------------------------------------------------------------
// 1. validateJournalBalance()
// ---------------------------------------------------------------------------

/**
 * Validates that a set of journal line items satisfies the double-entry
 * accounting invariant: SUM(debit) === SUM(credit).
 *
 * @throws {UnbalancedJournalError} if debits and credits don't balance.
 */
export function validateJournalBalance(lines: JournalLineInput[]): {
  totalDebit: number;
  totalCredit: number;
} {
  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of lines) {
    if (line.debit < 0 || line.credit < 0) {
      throw new Error(
        `Debit and credit amounts must be non-negative. Got debit=${line.debit}, credit=${line.credit}.`,
      );
    }
    totalDebit += line.debit;
    totalCredit += line.credit;
  }

  if (totalDebit !== totalCredit) {
    throw new UnbalancedJournalError(totalDebit, totalCredit);
  }

  return { totalDebit, totalCredit };
}

// ---------------------------------------------------------------------------
// 2. createJournalEntry()
// ---------------------------------------------------------------------------

/**
 * Creates a balanced journal entry with its line items inside a DB transaction.
 *
 * @throws {UnbalancedJournalError} if lines don't balance.
 * @throws {Error} if lines array is empty.
 */
export async function createJournalEntry(
  input: CreateJournalEntryInput,
  database: DB = db,
): Promise<JournalEntryResult> {
  if (input.lines.length === 0) {
    throw new Error("Journal entry must have at least one line item.");
  }

  // Validate balance BEFORE touching the database
  const { totalDebit, totalCredit } = validateJournalBalance(input.lines);

  const entryId = crypto.randomUUID();

  // Use a transaction for atomicity
  database.transaction((tx) => {
    // Insert journal entry header
    tx.insert(journalEntries)
      .values({
        id: entryId,
        journalId: input.journalId,
        date: input.date,
        reference: input.reference ?? null,
        description: input.description ?? null,
        createdAt: new Date(),
      })
      .run();

    // Insert all line items
    const itemValues: NewJournalItem[] = input.lines.map((line) => ({
      id: crypto.randomUUID(),
      entryId,
      accountId: line.accountId,
      debit: line.debit,
      credit: line.credit,
      analyticAccountId: line.analyticAccountId ?? null,
    }));

    for (const item of itemValues) {
      tx.insert(journalItems).values(item).run();
    }
  });

  return {
    entryId,
    totalDebit,
    totalCredit,
    lineCount: input.lines.length,
  };
}

// ---------------------------------------------------------------------------
// 3. postCustomerInvoice()
// ---------------------------------------------------------------------------

/**
 * Posts a customer invoice (Sales Order) to the General Ledger.
 *
 * Accounting rule:
 *   Dr  Debtors         = totalAmount (subtotal + tax)
 *   Cr  Sales Income    = subtotal
 *   Cr  Tax Payable     = taxAmount  (only if taxAmount > 0)
 *
 * Idempotent: if the order already has status BILLED or PAID, returns
 * the existing journal entry without creating a duplicate.
 *
 * @throws {OrderNotFoundError} if orderId doesn't exist.
 * @throws {InvalidOrderTypeError} if order is not a SO.
 */
export async function postCustomerInvoice(
  input: PostCustomerInvoiceInput,
  database: DB = db,
): Promise<JournalEntryResult> {
  // Fetch the order
  const order = await database
    .select()
    .from(orders)
    .where(eq(orders.id, input.orderId))
    .then((rows) => rows[0]);

  if (!order) {
    throw new OrderNotFoundError(input.orderId);
  }

  if (order.type !== "SO") {
    throw new InvalidOrderTypeError(input.orderId, "SO", order.type);
  }

  // Idempotency: if already billed or paid, check for existing journal entry
  if (order.status === "BILLED" || order.status === "PAID") {
    const existingEntry = await database
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.journalId, input.salesJournalId),
          eq(
            journalEntries.reference,
            input.reference ?? `INV-${order.orderNumber}`,
          ),
        ),
      )
      .then((rows) => rows[0]);

    if (existingEntry) {
      // Fetch line items to return totals
      const items = await database
        .select()
        .from(journalItems)
        .where(eq(journalItems.entryId, existingEntry.id));

      let totalDebit = 0;
      let totalCredit = 0;
      for (const item of items) {
        totalDebit += item.debit;
        totalCredit += item.credit;
      }

      return {
        entryId: existingEntry.id,
        totalDebit,
        totalCredit,
        lineCount: items.length,
      };
    }
  }

  // Build journal lines
  const lines: JournalLineInput[] = [
    {
      accountId: input.debtorsAccountId,
      debit: order.totalAmount,
      credit: 0,
    },
    {
      accountId: input.salesIncomeAccountId,
      debit: 0,
      credit: order.subtotal,
    },
  ];

  // Add tax line only when there is tax
  if (order.taxAmount > 0 && input.taxPayableAccountId) {
    lines.push({
      accountId: input.taxPayableAccountId,
      debit: 0,
      credit: order.taxAmount,
    });
  }

  const ref = input.reference ?? `INV-${order.orderNumber}`;
  const date = input.date ?? order.invoiceDate ?? new Date();

  const result = await createJournalEntry(
    {
      journalId: input.salesJournalId,
      date,
      reference: ref,
      description: `Customer Invoice for ${order.orderNumber}`,
      lines,
    },
    database,
  );

  // Update order status to BILLED
  database
    .update(orders)
    .set({ status: "BILLED", updatedAt: new Date() })
    .where(eq(orders.id, input.orderId))
    .run();

  return result;
}

// ---------------------------------------------------------------------------
// 4. postVendorBill()
// ---------------------------------------------------------------------------

/**
 * Posts a vendor bill (Purchase Order) to the General Ledger.
 *
 * Accounting rule:
 *   Dr  Purchase Expense  = subtotal
 *   Dr  Tax Payable       = taxAmount  (only if taxAmount > 0 and taxPayableAccountId provided)
 *   Cr  Creditors         = totalAmount
 *
 * Idempotent: if the order already has status BILLED or PAID, returns
 * the existing journal entry without creating a duplicate.
 *
 * @throws {OrderNotFoundError} if orderId doesn't exist.
 * @throws {InvalidOrderTypeError} if order is not a PO.
 */
export async function postVendorBill(
  input: PostVendorBillInput & { taxPayableAccountId?: string },
  database: DB = db,
): Promise<JournalEntryResult> {
  // Fetch the order
  const order = await database
    .select()
    .from(orders)
    .where(eq(orders.id, input.orderId))
    .then((rows) => rows[0]);

  if (!order) {
    throw new OrderNotFoundError(input.orderId);
  }

  if (order.type !== "PO") {
    throw new InvalidOrderTypeError(input.orderId, "PO", order.type);
  }

  // Idempotency check
  if (order.status === "BILLED" || order.status === "PAID") {
    const existingEntry = await database
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.journalId, input.purchaseJournalId),
          eq(
            journalEntries.reference,
            input.reference ?? `BILL-${order.orderNumber}`,
          ),
        ),
      )
      .then((rows) => rows[0]);

    if (existingEntry) {
      const items = await database
        .select()
        .from(journalItems)
        .where(eq(journalItems.entryId, existingEntry.id));

      let totalDebit = 0;
      let totalCredit = 0;
      for (const item of items) {
        totalDebit += item.debit;
        totalCredit += item.credit;
      }

      return {
        entryId: existingEntry.id,
        totalDebit,
        totalCredit,
        lineCount: items.length,
      };
    }
  }

  // Build journal lines
  const lines: JournalLineInput[] = [
    {
      accountId: input.purchaseExpenseAccountId,
      debit: order.subtotal,
      credit: 0,
      analyticAccountId: input.analyticAccountId ?? null,
    },
  ];

  // Add tax line if there's tax and account is provided
  if (order.taxAmount > 0 && input.taxPayableAccountId) {
    lines.push({
      accountId: input.taxPayableAccountId,
      debit: order.taxAmount,
      credit: 0,
    });
  }

  lines.push({
    accountId: input.creditorsAccountId,
    debit: 0,
    credit: order.taxAmount > 0 && input.taxPayableAccountId
      ? order.totalAmount
      : order.subtotal,
  });

  const ref = input.reference ?? `BILL-${order.orderNumber}`;
  const date = input.date ?? order.invoiceDate ?? new Date();

  const result = await createJournalEntry(
    {
      journalId: input.purchaseJournalId,
      date,
      reference: ref,
      description: `Vendor Bill for ${order.orderNumber}`,
      lines,
    },
    database,
  );

  // Update order status to BILLED
  database
    .update(orders)
    .set({ status: "BILLED", updatedAt: new Date() })
    .where(eq(orders.id, input.orderId))
    .run();

  return result;
}

// ---------------------------------------------------------------------------
// Helper: compute total payments for an order
// ---------------------------------------------------------------------------

async function getTotalPaidForOrder(
  orderId: string,
  database: DB = db,
): Promise<number> {
  const result = await database
    .select({
      total: sql<number>`COALESCE(SUM(${payments.amount}), 0)`,
    })
    .from(payments)
    .where(eq(payments.orderId, orderId))
    .then((rows) => rows[0]);

  return result?.total ?? 0;
}

// ---------------------------------------------------------------------------
// Helper: validate payment common to both customer and vendor
// ---------------------------------------------------------------------------

async function validatePaymentInput(
  orderId: string,
  amount: number,
  paymentReference: string | undefined,
  database: DB,
): Promise<{ order: typeof orders.$inferSelect; alreadyPaid: number }> {
  // Zero or negative check
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new InvalidPaymentAmountError(amount);
  }

  // Fetch order
  const order = await database
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .then((rows) => rows[0]);

  if (!order) {
    throw new OrderNotFoundError(orderId);
  }

  // Duplicate payment check — by reference within the same order
  if (paymentReference) {
    const existingPayment = await database
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.orderId, orderId),
          eq(payments.reference, paymentReference),
        ),
      )
      .then((rows) => rows[0]);

    if (existingPayment) {
      throw new DuplicatePaymentError(existingPayment.id, paymentReference);
    }
  }

  // Overpayment check
  const alreadyPaid = await getTotalPaidForOrder(orderId, database);
  const remaining = order.totalAmount - alreadyPaid;

  if (amount > remaining) {
    throw new OverpaymentError(order.totalAmount, alreadyPaid, amount);
  }

  return { order, alreadyPaid };
}

// ---------------------------------------------------------------------------
// 5. recordCustomerPayment()
// ---------------------------------------------------------------------------

/**
 * Records a customer payment against a Sales Order.
 *
 * Accounting rule:
 *   Dr  Cash OR Bank  = amount
 *   Cr  Debtors       = amount
 *
 * Guard rails:
 *   - Rejects zero or negative amounts
 *   - Prevents duplicate payments (by reference within the same order)
 *   - Prevents overpayment (total paid cannot exceed order totalAmount)
 *   - Updates order status to PARTIAL or PAID
 *
 * @throws {InvalidPaymentAmountError} zero or negative amount
 * @throws {OrderNotFoundError} order doesn't exist
 * @throws {InvalidOrderTypeError} order is not a SO
 * @throws {DuplicatePaymentError} reference already used for this order
 * @throws {OverpaymentError} would exceed order total
 */
export async function recordCustomerPayment(
  input: RecordCustomerPaymentInput,
  database: DB = db,
): Promise<PaymentResult> {
  const { order, alreadyPaid } = await validatePaymentInput(
    input.orderId,
    input.amount,
    input.paymentReference,
    database,
  );

  if (order.type !== "SO") {
    throw new InvalidOrderTypeError(input.orderId, "SO", order.type);
  }

  // Determine which journal and account to use
  const isCash = input.paymentMethod === "CASH";
  const journalId = isCash ? input.cashJournalId : input.bankJournalId;
  const cashOrBankAccountId = isCash
    ? input.cashAccountId
    : input.bankAccountId;

  const ref =
    input.paymentReference ?? `PAY-${order.orderNumber}-${Date.now()}`;
  const date = input.paymentDate ?? new Date();

  // Create the journal entry
  const entryResult = await createJournalEntry(
    {
      journalId,
      date,
      reference: ref,
      description: `Customer payment for ${order.orderNumber}`,
      lines: [
        {
          accountId: cashOrBankAccountId,
          debit: input.amount,
          credit: 0,
        },
        {
          accountId: input.debtorsAccountId,
          debit: 0,
          credit: input.amount,
        },
      ],
    },
    database,
  );

  // Record the payment
  const paymentId = crypto.randomUUID();
  database
    .insert(payments)
    .values({
      id: paymentId,
      orderId: input.orderId,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      paymentDate: date,
      reference: ref,
      journalEntryId: entryResult.entryId,
    })
    .run();

  // Determine new status
  const totalPaidNow = alreadyPaid + input.amount;
  const newStatus: "PARTIAL" | "PAID" =
    totalPaidNow >= order.totalAmount ? "PAID" : "PARTIAL";

  database
    .update(orders)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(orders.id, input.orderId))
    .run();

  return {
    paymentId,
    journalEntryId: entryResult.entryId,
    amount: input.amount,
    newOrderStatus: newStatus,
  };
}

// ---------------------------------------------------------------------------
// 6. recordVendorPayment()
// ---------------------------------------------------------------------------

/**
 * Records a vendor payment against a Purchase Order.
 *
 * Accounting rule:
 *   Dr  Creditors      = amount
 *   Cr  Cash OR Bank   = amount
 *
 * Same guard rails as recordCustomerPayment() (zero, negative, duplicate,
 * overpayment).
 *
 * @throws {InvalidPaymentAmountError} zero or negative amount
 * @throws {OrderNotFoundError} order doesn't exist
 * @throws {InvalidOrderTypeError} order is not a PO
 * @throws {DuplicatePaymentError} reference already used for this order
 * @throws {OverpaymentError} would exceed order total
 */
export async function recordVendorPayment(
  input: RecordVendorPaymentInput,
  database: DB = db,
): Promise<PaymentResult> {
  const { order, alreadyPaid } = await validatePaymentInput(
    input.orderId,
    input.amount,
    input.paymentReference,
    database,
  );

  if (order.type !== "PO") {
    throw new InvalidOrderTypeError(input.orderId, "PO", order.type);
  }

  // Determine which journal and account to use
  const isCash = input.paymentMethod === "CASH";
  const journalId = isCash ? input.cashJournalId : input.bankJournalId;
  const cashOrBankAccountId = isCash
    ? input.cashAccountId
    : input.bankAccountId;

  const ref =
    input.paymentReference ?? `PAY-${order.orderNumber}-${Date.now()}`;
  const date = input.paymentDate ?? new Date();

  // Create the journal entry
  const entryResult = await createJournalEntry(
    {
      journalId,
      date,
      reference: ref,
      description: `Vendor payment for ${order.orderNumber}`,
      lines: [
        {
          accountId: input.creditorsAccountId,
          debit: input.amount,
          credit: 0,
        },
        {
          accountId: cashOrBankAccountId,
          debit: 0,
          credit: input.amount,
        },
      ],
    },
    database,
  );

  // Record the payment
  const paymentId = crypto.randomUUID();
  database
    .insert(payments)
    .values({
      id: paymentId,
      orderId: input.orderId,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      paymentDate: date,
      reference: ref,
      journalEntryId: entryResult.entryId,
    })
    .run();

  // Determine new status
  const totalPaidNow = alreadyPaid + input.amount;
  const newStatus: "PARTIAL" | "PAID" =
    totalPaidNow >= order.totalAmount ? "PAID" : "PARTIAL";

  database
    .update(orders)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(orders.id, input.orderId))
    .run();

  return {
    paymentId,
    journalEntryId: entryResult.entryId,
    amount: input.amount,
    newOrderStatus: newStatus,
  };
}

// ---------------------------------------------------------------------------
// Utility: Calculate invoice line totals
// ---------------------------------------------------------------------------

/**
 * Calculates the tax amount and line total for an order line item.
 *
 * @param unitPrice  Price per unit in PAISE (integer)
 * @param quantity   Number of units (integer)
 * @param taxRate    Tax rate in hundredths of a percent (18% = 1800)
 * @returns { taxAmount, lineTotal } both in PAISE
 */
export function calculateLineTotals(
  unitPrice: number,
  quantity: number,
  taxRate: number,
): { subtotal: number; taxAmount: number; lineTotal: number } {
  const subtotal = unitPrice * quantity;
  const taxAmount = Math.round((subtotal * taxRate) / 10000);
  const lineTotal = subtotal + taxAmount;
  return { subtotal, taxAmount, lineTotal };
}

/**
 * Calculates order-level totals from an array of line items.
 *
 * @param items Array of { unitPrice, quantity, taxRate } in PAISE / hundredths
 * @returns { subtotal, taxAmount, totalAmount } all in PAISE
 */
export function calculateOrderTotals(
  items: Array<{ unitPrice: number; quantity: number; taxRate: number }>,
): { subtotal: number; taxAmount: number; totalAmount: number } {
  let subtotal = 0;
  let taxAmount = 0;

  for (const item of items) {
    const lineTotals = calculateLineTotals(
      item.unitPrice,
      item.quantity,
      item.taxRate,
    );
    subtotal += lineTotals.subtotal;
    taxAmount += lineTotals.taxAmount;
  }

  return {
    subtotal,
    taxAmount,
    totalAmount: subtotal + taxAmount,
  };
}
