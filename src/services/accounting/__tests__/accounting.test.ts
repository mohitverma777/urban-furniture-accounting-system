/**
 * src/services/accounting/__tests__/accounting.test.ts
 *
 * Unit tests for the accounting service layer.
 *
 * Uses an isolated in-memory SQLite database per test to ensure
 * test independence and deterministic behavior.
 *
 * Covers:
 *   1.  Customer invoice posting
 *   2.  Vendor bill posting
 *   3.  Customer payment recording
 *   4.  Vendor payment recording
 *   5.  Tax calculation
 *   6.  Journal balancing
 *   7.  Unbalanced journal rejection
 *   8.  Duplicate payment protection
 *   9.  Overpayment protection
 *   10. Zero/negative payment rejection
 *   11. Invoice total calculation
 */

import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import {
  createJournalEntry,
  validateJournalBalance,
  postCustomerInvoice,
  postVendorBill,
  recordCustomerPayment,
  recordVendorPayment,
  calculateLineTotals,
  calculateOrderTotals,
  UnbalancedJournalError,
  DuplicatePaymentError,
  OverpaymentError,
  InvalidPaymentAmountError,
  OrderNotFoundError,
  InvalidOrderTypeError,
} from "../index";
import type { DB } from "@/db";

// ---------------------------------------------------------------------------
// Test Fixtures
// ---------------------------------------------------------------------------

const IDS = {
  // Accounts
  cash: "test-acc-cash",
  bank: "test-acc-bank",
  debtors: "test-acc-debtors",
  creditors: "test-acc-creditors",
  taxPayable: "test-acc-tax",
  capital: "test-acc-capital",
  salesIncome: "test-acc-sales",
  purchaseExpense: "test-acc-purchase",
  opExpense: "test-acc-opex",

  // Journals
  salesJournal: "test-jnl-sales",
  purchaseJournal: "test-jnl-purchase",
  bankJournal: "test-jnl-bank",
  cashJournal: "test-jnl-cash",

  // Contacts
  customer: "test-contact-cust",
  vendor: "test-contact-vend",

  // Products
  chair: "test-prod-chair",
  desk: "test-prod-desk",

  // Orders
  salesOrder: "test-so-001",
  purchaseOrder: "test-po-001",
  salesOrderNoTax: "test-so-notax",
};

const NOW = new Date("2026-01-15T10:00:00Z");

// ---------------------------------------------------------------------------
// In-memory DB factory
// ---------------------------------------------------------------------------

function createTestDb(): DB {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const testDb = drizzle(sqlite, { schema });

  // Apply migrations
  const migrationsFolder = resolve(process.cwd(), "src/db/migrations");
  migrate(testDb, { migrationsFolder });

  return testDb;
}

function seedTestData(testDb: DB) {
  // Accounts
  testDb
    .insert(schema.accounts)
    .values([
      { id: IDS.cash, code: "1000", name: "Cash", type: "ASSET", isActive: true, createdAt: NOW, updatedAt: NOW },
      { id: IDS.bank, code: "1010", name: "Bank", type: "ASSET", isActive: true, createdAt: NOW, updatedAt: NOW },
      { id: IDS.debtors, code: "1100", name: "Debtors", type: "ASSET", isActive: true, createdAt: NOW, updatedAt: NOW },
      { id: IDS.creditors, code: "2000", name: "Creditors", type: "LIABILITY", isActive: true, createdAt: NOW, updatedAt: NOW },
      { id: IDS.taxPayable, code: "2200", name: "Tax Payable", type: "LIABILITY", isActive: true, createdAt: NOW, updatedAt: NOW },
      { id: IDS.capital, code: "3000", name: "Capital", type: "CAPITAL", isActive: true, createdAt: NOW, updatedAt: NOW },
      { id: IDS.salesIncome, code: "4000", name: "Sales Income", type: "INCOME", isActive: true, createdAt: NOW, updatedAt: NOW },
      { id: IDS.purchaseExpense, code: "5000", name: "Purchase Expense", type: "EXPENSE", isActive: true, createdAt: NOW, updatedAt: NOW },
      { id: IDS.opExpense, code: "5100", name: "Operating Expense", type: "EXPENSE", isActive: true, createdAt: NOW, updatedAt: NOW },
    ])
    .run();

  // Journals
  testDb
    .insert(schema.journals)
    .values([
      { id: IDS.salesJournal, name: "Sales Journal", type: "SALES", defaultAccountId: IDS.salesIncome, createdAt: NOW, updatedAt: NOW },
      { id: IDS.purchaseJournal, name: "Purchase Journal", type: "PURCHASE", defaultAccountId: IDS.purchaseExpense, createdAt: NOW, updatedAt: NOW },
      { id: IDS.bankJournal, name: "Bank Journal", type: "BANK", defaultAccountId: IDS.bank, createdAt: NOW, updatedAt: NOW },
      { id: IDS.cashJournal, name: "Cash Journal", type: "CASH", defaultAccountId: IDS.cash, createdAt: NOW, updatedAt: NOW },
    ])
    .run();

  // Contacts
  testDb
    .insert(schema.contacts)
    .values([
      { id: IDS.customer, name: "Test Customer", type: "CUSTOMER", createdAt: NOW, updatedAt: NOW },
      { id: IDS.vendor, name: "Test Vendor", type: "VENDOR", createdAt: NOW, updatedAt: NOW },
    ])
    .run();

  // Products
  testDb
    .insert(schema.products)
    .values([
      { id: IDS.chair, name: "Office Chair", type: "GOODS", salesPrice: 850000, costPrice: 450000, category: "Chairs", createdAt: NOW, updatedAt: NOW },
      { id: IDS.desk, name: "Executive Desk", type: "GOODS", salesPrice: 2400000, costPrice: 1300000, category: "Desks", createdAt: NOW, updatedAt: NOW },
    ])
    .run();

  // Sales Order: 2 Chairs (₹8,500 each, 18% GST) + 1 Desk (₹24,000, 18% GST)
  // Subtotal: 17,000 + 24,000 = 41,000 = 4,100,000 paise
  // Tax: 3,060 + 4,320 = 7,380 = 738,000 paise
  // Total: 48,380 = 4,838,000 paise
  const chairLine = calculateLineTotals(850000, 2, 1800);
  const deskLine = calculateLineTotals(2400000, 1, 1800);
  const soTotals = calculateOrderTotals([
    { unitPrice: 850000, quantity: 2, taxRate: 1800 },
    { unitPrice: 2400000, quantity: 1, taxRate: 1800 },
  ]);

  testDb
    .insert(schema.orders)
    .values({
      id: IDS.salesOrder,
      orderNumber: "SO-TEST-001",
      type: "SO",
      contactId: IDS.customer,
      status: "DRAFT",
      invoiceDate: NOW,
      dueDate: new Date("2026-02-15T10:00:00Z"),
      subtotal: soTotals.subtotal,
      taxAmount: soTotals.taxAmount,
      totalAmount: soTotals.totalAmount,
      createdAt: NOW,
      updatedAt: NOW,
    })
    .run();

  // Order Items for SO
  testDb
    .insert(schema.orderItems)
    .values([
      {
        id: "test-oi-001",
        orderId: IDS.salesOrder,
        productId: IDS.chair,
        quantity: 2,
        unitPrice: 850000,
        taxRate: 1800,
        taxAmount: chairLine.taxAmount,
        lineTotal: chairLine.lineTotal,
      },
      {
        id: "test-oi-002",
        orderId: IDS.salesOrder,
        productId: IDS.desk,
        quantity: 1,
        unitPrice: 2400000,
        taxRate: 1800,
        taxAmount: deskLine.taxAmount,
        lineTotal: deskLine.lineTotal,
      },
    ])
    .run();

  // Purchase Order: 5 Chairs at cost (₹4,500 each, 18% GST)
  // Subtotal: 22,500 = 2,250,000 paise
  // Tax: 4,050 = 405,000 paise
  // Total: 26,550 = 2,655,000 paise
  const poTotals = calculateOrderTotals([
    { unitPrice: 450000, quantity: 5, taxRate: 1800 },
  ]);

  testDb
    .insert(schema.orders)
    .values({
      id: IDS.purchaseOrder,
      orderNumber: "PO-TEST-001",
      type: "PO",
      contactId: IDS.vendor,
      status: "DRAFT",
      invoiceDate: NOW,
      dueDate: new Date("2026-02-15T10:00:00Z"),
      subtotal: poTotals.subtotal,
      taxAmount: poTotals.taxAmount,
      totalAmount: poTotals.totalAmount,
      createdAt: NOW,
      updatedAt: NOW,
    })
    .run();

  // Order Items for PO
  const poChairLine = calculateLineTotals(450000, 5, 1800);
  testDb
    .insert(schema.orderItems)
    .values({
      id: "test-oi-003",
      orderId: IDS.purchaseOrder,
      productId: IDS.chair,
      quantity: 5,
      unitPrice: 450000,
      taxRate: 1800,
      taxAmount: poChairLine.taxAmount,
      lineTotal: poChairLine.lineTotal,
    })
    .run();

  // Sales Order with no tax (for testing zero-tax path)
  testDb
    .insert(schema.orders)
    .values({
      id: IDS.salesOrderNoTax,
      orderNumber: "SO-TEST-NOTAX",
      type: "SO",
      contactId: IDS.customer,
      status: "DRAFT",
      invoiceDate: NOW,
      dueDate: new Date("2026-02-15T10:00:00Z"),
      subtotal: 1000000,  // ₹10,000
      taxAmount: 0,
      totalAmount: 1000000,
      createdAt: NOW,
      updatedAt: NOW,
    })
    .run();
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe("Accounting Service", () => {
  let testDb: DB;

  beforeEach(() => {
    testDb = createTestDb();
    seedTestData(testDb);
  });

  // =========================================================================
  // 6. Journal Balancing
  // =========================================================================

  describe("validateJournalBalance()", () => {
    it("accepts balanced entries", () => {
      const result = validateJournalBalance([
        { accountId: IDS.bank, debit: 100000, credit: 0 },
        { accountId: IDS.capital, debit: 0, credit: 100000 },
      ]);

      expect(result.totalDebit).toBe(100000);
      expect(result.totalCredit).toBe(100000);
    });

    it("accepts multi-line balanced entries", () => {
      const result = validateJournalBalance([
        { accountId: IDS.debtors, debit: 100000, credit: 0 },
        { accountId: IDS.salesIncome, debit: 0, credit: 80000 },
        { accountId: IDS.taxPayable, debit: 0, credit: 20000 },
      ]);

      expect(result.totalDebit).toBe(100000);
      expect(result.totalCredit).toBe(100000);
    });

    // Test 7: Unbalanced journal rejection
    it("rejects unbalanced entries", () => {
      expect(() =>
        validateJournalBalance([
          { accountId: IDS.bank, debit: 100000, credit: 0 },
          { accountId: IDS.capital, debit: 0, credit: 99999 },
        ]),
      ).toThrow(UnbalancedJournalError);
    });

    it("rejects negative amounts", () => {
      expect(() =>
        validateJournalBalance([
          { accountId: IDS.bank, debit: -100, credit: 0 },
          { accountId: IDS.capital, debit: 0, credit: -100 },
        ]),
      ).toThrow("non-negative");
    });
  });

  // =========================================================================
  // createJournalEntry()
  // =========================================================================

  describe("createJournalEntry()", () => {
    it("creates a balanced entry with correct totals", async () => {
      const result = await createJournalEntry(
        {
          journalId: IDS.bankJournal,
          date: NOW,
          reference: "TEST-001",
          description: "Test capital injection",
          lines: [
            { accountId: IDS.bank, debit: 500000, credit: 0 },
            { accountId: IDS.capital, debit: 0, credit: 500000 },
          ],
        },
        testDb,
      );

      expect(result.entryId).toBeTruthy();
      expect(result.totalDebit).toBe(500000);
      expect(result.totalCredit).toBe(500000);
      expect(result.lineCount).toBe(2);

      // Verify in database
      const entry = await testDb
        .select()
        .from(schema.journalEntries)
        .where(eq(schema.journalEntries.id, result.entryId))
        .then((r) => r[0]);

      expect(entry).toBeTruthy();
      expect(entry!.reference).toBe("TEST-001");

      const items = await testDb
        .select()
        .from(schema.journalItems)
        .where(eq(schema.journalItems.entryId, result.entryId));

      expect(items).toHaveLength(2);
    });

    it("rejects empty lines", async () => {
      await expect(
        createJournalEntry(
          {
            journalId: IDS.bankJournal,
            date: NOW,
            lines: [],
          },
          testDb,
        ),
      ).rejects.toThrow("at least one line");
    });

    // Test 7: Unbalanced journal rejection via createJournalEntry
    it("rejects unbalanced entry creation", async () => {
      await expect(
        createJournalEntry(
          {
            journalId: IDS.bankJournal,
            date: NOW,
            reference: "BAD-001",
            lines: [
              { accountId: IDS.bank, debit: 100000, credit: 0 },
              { accountId: IDS.capital, debit: 0, credit: 50000 },
            ],
          },
          testDb,
        ),
      ).rejects.toThrow(UnbalancedJournalError);

      // Verify nothing was persisted
      const entries = await testDb
        .select()
        .from(schema.journalEntries)
        .where(eq(schema.journalEntries.reference, "BAD-001"));
      expect(entries).toHaveLength(0);
    });
  });

  // =========================================================================
  // 1. Customer Invoice
  // =========================================================================

  describe("postCustomerInvoice()", () => {
    it("posts a customer invoice with correct debits and credits", async () => {
      const result = await postCustomerInvoice(
        {
          orderId: IDS.salesOrder,
          salesJournalId: IDS.salesJournal,
          debtorsAccountId: IDS.debtors,
          salesIncomeAccountId: IDS.salesIncome,
          taxPayableAccountId: IDS.taxPayable,
          date: NOW,
        },
        testDb,
      );

      expect(result.entryId).toBeTruthy();

      // Fetch journal items to verify accounting entries
      const items = await testDb
        .select()
        .from(schema.journalItems)
        .where(eq(schema.journalItems.entryId, result.entryId));

      // Should have 3 lines: Debtors (Dr), Sales Income (Cr), Tax Payable (Cr)
      expect(items).toHaveLength(3);

      const debtorsLine = items.find((i) => i.accountId === IDS.debtors);
      const salesLine = items.find((i) => i.accountId === IDS.salesIncome);
      const taxLine = items.find((i) => i.accountId === IDS.taxPayable);

      expect(debtorsLine).toBeTruthy();
      expect(debtorsLine!.debit).toBeGreaterThan(0);
      expect(debtorsLine!.credit).toBe(0);

      expect(salesLine).toBeTruthy();
      expect(salesLine!.debit).toBe(0);
      expect(salesLine!.credit).toBeGreaterThan(0);

      expect(taxLine).toBeTruthy();
      expect(taxLine!.debit).toBe(0);
      expect(taxLine!.credit).toBeGreaterThan(0);

      // Verify Dr = Cr
      expect(result.totalDebit).toBe(result.totalCredit);

      // Verify order status updated to BILLED
      const order = await testDb
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.id, IDS.salesOrder))
        .then((r) => r[0]);
      expect(order!.status).toBe("BILLED");
    });

    it("posts a zero-tax invoice with only 2 lines", async () => {
      const result = await postCustomerInvoice(
        {
          orderId: IDS.salesOrderNoTax,
          salesJournalId: IDS.salesJournal,
          debtorsAccountId: IDS.debtors,
          salesIncomeAccountId: IDS.salesIncome,
          taxPayableAccountId: IDS.taxPayable,
          date: NOW,
        },
        testDb,
      );

      const items = await testDb
        .select()
        .from(schema.journalItems)
        .where(eq(schema.journalItems.entryId, result.entryId));

      // No tax line when taxAmount is 0
      expect(items).toHaveLength(2);
      expect(result.totalDebit).toBe(1000000);
      expect(result.totalCredit).toBe(1000000);
    });

    it("is idempotent — re-posting returns existing entry", async () => {
      const first = await postCustomerInvoice(
        {
          orderId: IDS.salesOrder,
          salesJournalId: IDS.salesJournal,
          debtorsAccountId: IDS.debtors,
          salesIncomeAccountId: IDS.salesIncome,
          taxPayableAccountId: IDS.taxPayable,
          date: NOW,
          reference: "INV-SO-TEST-001",
        },
        testDb,
      );

      const second = await postCustomerInvoice(
        {
          orderId: IDS.salesOrder,
          salesJournalId: IDS.salesJournal,
          debtorsAccountId: IDS.debtors,
          salesIncomeAccountId: IDS.salesIncome,
          taxPayableAccountId: IDS.taxPayable,
          date: NOW,
          reference: "INV-SO-TEST-001",
        },
        testDb,
      );

      expect(second.entryId).toBe(first.entryId);
    });

    it("rejects posting invoice for a PO", async () => {
      await expect(
        postCustomerInvoice(
          {
            orderId: IDS.purchaseOrder,
            salesJournalId: IDS.salesJournal,
            debtorsAccountId: IDS.debtors,
            salesIncomeAccountId: IDS.salesIncome,
          },
          testDb,
        ),
      ).rejects.toThrow(InvalidOrderTypeError);
    });

    it("rejects posting invoice for non-existent order", async () => {
      await expect(
        postCustomerInvoice(
          {
            orderId: "non-existent-id",
            salesJournalId: IDS.salesJournal,
            debtorsAccountId: IDS.debtors,
            salesIncomeAccountId: IDS.salesIncome,
          },
          testDb,
        ),
      ).rejects.toThrow(OrderNotFoundError);
    });
  });

  // =========================================================================
  // 2. Vendor Bill
  // =========================================================================

  describe("postVendorBill()", () => {
    it("posts a vendor bill with correct debits and credits", async () => {
      const result = await postVendorBill(
        {
          orderId: IDS.purchaseOrder,
          purchaseJournalId: IDS.purchaseJournal,
          purchaseExpenseAccountId: IDS.purchaseExpense,
          creditorsAccountId: IDS.creditors,
          taxPayableAccountId: IDS.taxPayable,
          date: NOW,
        },
        testDb,
      );

      expect(result.entryId).toBeTruthy();

      const items = await testDb
        .select()
        .from(schema.journalItems)
        .where(eq(schema.journalItems.entryId, result.entryId));

      // Should have 3 lines: Purchase Expense (Dr), Tax Payable (Dr), Creditors (Cr)
      expect(items).toHaveLength(3);

      const expenseLine = items.find((i) => i.accountId === IDS.purchaseExpense);
      const taxLine = items.find((i) => i.accountId === IDS.taxPayable);
      const creditorsLine = items.find((i) => i.accountId === IDS.creditors);

      expect(expenseLine!.debit).toBeGreaterThan(0);
      expect(expenseLine!.credit).toBe(0);

      expect(taxLine!.debit).toBeGreaterThan(0);
      expect(taxLine!.credit).toBe(0);

      expect(creditorsLine!.debit).toBe(0);
      expect(creditorsLine!.credit).toBeGreaterThan(0);

      // Verify balanced
      expect(result.totalDebit).toBe(result.totalCredit);

      // Verify order status updated to BILLED
      const order = await testDb
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.id, IDS.purchaseOrder))
        .then((r) => r[0]);
      expect(order!.status).toBe("BILLED");
    });

    it("rejects posting bill for a SO", async () => {
      await expect(
        postVendorBill(
          {
            orderId: IDS.salesOrder,
            purchaseJournalId: IDS.purchaseJournal,
            purchaseExpenseAccountId: IDS.purchaseExpense,
            creditorsAccountId: IDS.creditors,
          },
          testDb,
        ),
      ).rejects.toThrow(InvalidOrderTypeError);
    });
  });

  // =========================================================================
  // 3. Customer Payment
  // =========================================================================

  describe("recordCustomerPayment()", () => {
    beforeEach(async () => {
      // First post the invoice so the order is BILLED
      await postCustomerInvoice(
        {
          orderId: IDS.salesOrder,
          salesJournalId: IDS.salesJournal,
          debtorsAccountId: IDS.debtors,
          salesIncomeAccountId: IDS.salesIncome,
          taxPayableAccountId: IDS.taxPayable,
          date: NOW,
        },
        testDb,
      );
    });

    it("records a full customer payment and marks order PAID", async () => {
      // Fetch the order total
      const order = await testDb
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.id, IDS.salesOrder))
        .then((r) => r[0]);

      const result = await recordCustomerPayment(
        {
          orderId: IDS.salesOrder,
          amount: order!.totalAmount,
          paymentMethod: "BANK",
          bankJournalId: IDS.bankJournal,
          cashJournalId: IDS.cashJournal,
          bankAccountId: IDS.bank,
          cashAccountId: IDS.cash,
          debtorsAccountId: IDS.debtors,
          paymentDate: NOW,
          paymentReference: "UPI-CUST-12345",
        },
        testDb,
      );

      expect(result.paymentId).toBeTruthy();
      expect(result.journalEntryId).toBeTruthy();
      expect(result.amount).toBe(order!.totalAmount);
      expect(result.newOrderStatus).toBe("PAID");

      // Verify journal entry lines
      const items = await testDb
        .select()
        .from(schema.journalItems)
        .where(eq(schema.journalItems.entryId, result.journalEntryId));

      expect(items).toHaveLength(2);

      const bankLine = items.find((i) => i.accountId === IDS.bank);
      const debtorsLine = items.find((i) => i.accountId === IDS.debtors);

      expect(bankLine!.debit).toBe(order!.totalAmount);
      expect(bankLine!.credit).toBe(0);
      expect(debtorsLine!.debit).toBe(0);
      expect(debtorsLine!.credit).toBe(order!.totalAmount);
    });

    it("records a partial customer payment and marks order PARTIAL", async () => {
      const partialAmount = 1000000; // ₹10,000

      const result = await recordCustomerPayment(
        {
          orderId: IDS.salesOrder,
          amount: partialAmount,
          paymentMethod: "CASH",
          bankJournalId: IDS.bankJournal,
          cashJournalId: IDS.cashJournal,
          bankAccountId: IDS.bank,
          cashAccountId: IDS.cash,
          debtorsAccountId: IDS.debtors,
          paymentDate: NOW,
          paymentReference: "CASH-PARTIAL-001",
        },
        testDb,
      );

      expect(result.newOrderStatus).toBe("PARTIAL");

      // Verify cash account was debited (not bank)
      const items = await testDb
        .select()
        .from(schema.journalItems)
        .where(eq(schema.journalItems.entryId, result.journalEntryId));

      const cashLine = items.find((i) => i.accountId === IDS.cash);
      expect(cashLine).toBeTruthy();
      expect(cashLine!.debit).toBe(partialAmount);
    });
  });

  // =========================================================================
  // 4. Vendor Payment
  // =========================================================================

  describe("recordVendorPayment()", () => {
    beforeEach(async () => {
      // First post the vendor bill
      await postVendorBill(
        {
          orderId: IDS.purchaseOrder,
          purchaseJournalId: IDS.purchaseJournal,
          purchaseExpenseAccountId: IDS.purchaseExpense,
          creditorsAccountId: IDS.creditors,
          taxPayableAccountId: IDS.taxPayable,
          date: NOW,
        },
        testDb,
      );
    });

    it("records a full vendor payment and marks order PAID", async () => {
      const order = await testDb
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.id, IDS.purchaseOrder))
        .then((r) => r[0]);

      const result = await recordVendorPayment(
        {
          orderId: IDS.purchaseOrder,
          amount: order!.totalAmount,
          paymentMethod: "BANK",
          bankJournalId: IDS.bankJournal,
          cashJournalId: IDS.cashJournal,
          bankAccountId: IDS.bank,
          cashAccountId: IDS.cash,
          creditorsAccountId: IDS.creditors,
          paymentDate: NOW,
          paymentReference: "UTR-VEND-99887",
        },
        testDb,
      );

      expect(result.paymentId).toBeTruthy();
      expect(result.journalEntryId).toBeTruthy();
      expect(result.amount).toBe(order!.totalAmount);
      expect(result.newOrderStatus).toBe("PAID");

      // Verify journal entry: Dr Creditors, Cr Bank
      const items = await testDb
        .select()
        .from(schema.journalItems)
        .where(eq(schema.journalItems.entryId, result.journalEntryId));

      expect(items).toHaveLength(2);

      const creditorsLine = items.find((i) => i.accountId === IDS.creditors);
      const bankLine = items.find((i) => i.accountId === IDS.bank);

      expect(creditorsLine!.debit).toBe(order!.totalAmount);
      expect(creditorsLine!.credit).toBe(0);
      expect(bankLine!.debit).toBe(0);
      expect(bankLine!.credit).toBe(order!.totalAmount);
    });

    it("rejects vendor payment for a SO", async () => {
      // Post the invoice for the SO first
      await postCustomerInvoice(
        {
          orderId: IDS.salesOrder,
          salesJournalId: IDS.salesJournal,
          debtorsAccountId: IDS.debtors,
          salesIncomeAccountId: IDS.salesIncome,
          taxPayableAccountId: IDS.taxPayable,
          date: NOW,
        },
        testDb,
      );

      await expect(
        recordVendorPayment(
          {
            orderId: IDS.salesOrder,
            amount: 100000,
            paymentMethod: "BANK",
            bankJournalId: IDS.bankJournal,
            cashJournalId: IDS.cashJournal,
            bankAccountId: IDS.bank,
            cashAccountId: IDS.cash,
            creditorsAccountId: IDS.creditors,
            paymentDate: NOW,
            paymentReference: "BAD-PAY",
          },
          testDb,
        ),
      ).rejects.toThrow(InvalidOrderTypeError);
    });
  });

  // =========================================================================
  // 5. Tax Calculation
  // =========================================================================

  describe("calculateLineTotals()", () => {
    it("calculates 18% GST correctly", () => {
      // ₹10,000 × 1 unit at 18% GST
      const result = calculateLineTotals(1000000, 1, 1800);
      expect(result.subtotal).toBe(1000000);
      expect(result.taxAmount).toBe(180000); // ₹1,800
      expect(result.lineTotal).toBe(1180000); // ₹11,800
    });

    it("calculates tax for multiple quantities", () => {
      // ₹8,500 × 4 units at 18% GST
      const result = calculateLineTotals(850000, 4, 1800);
      expect(result.subtotal).toBe(3400000); // ₹34,000
      expect(result.taxAmount).toBe(612000); // ₹6,120
      expect(result.lineTotal).toBe(4012000); // ₹40,120
    });

    it("handles zero tax rate", () => {
      const result = calculateLineTotals(500000, 3, 0);
      expect(result.subtotal).toBe(1500000);
      expect(result.taxAmount).toBe(0);
      expect(result.lineTotal).toBe(1500000);
    });

    it("handles 5% GST rate", () => {
      // ₹1,000 × 1 at 5% GST
      const result = calculateLineTotals(100000, 1, 500);
      expect(result.subtotal).toBe(100000);
      expect(result.taxAmount).toBe(5000); // ₹50
      expect(result.lineTotal).toBe(105000);
    });

    it("handles 12% GST rate", () => {
      // ₹20,000 × 2 at 12% GST
      const result = calculateLineTotals(2000000, 2, 1200);
      expect(result.subtotal).toBe(4000000); // ₹40,000
      expect(result.taxAmount).toBe(480000); // ₹4,800
      expect(result.lineTotal).toBe(4480000);
    });
  });

  // =========================================================================
  // 8. Duplicate Payment Protection
  // =========================================================================

  describe("Duplicate payment protection", () => {
    beforeEach(async () => {
      await postCustomerInvoice(
        {
          orderId: IDS.salesOrder,
          salesJournalId: IDS.salesJournal,
          debtorsAccountId: IDS.debtors,
          salesIncomeAccountId: IDS.salesIncome,
          taxPayableAccountId: IDS.taxPayable,
          date: NOW,
        },
        testDb,
      );
    });

    it("rejects duplicate payment with same reference for same order", async () => {
      // First payment succeeds
      await recordCustomerPayment(
        {
          orderId: IDS.salesOrder,
          amount: 500000,
          paymentMethod: "BANK",
          bankJournalId: IDS.bankJournal,
          cashJournalId: IDS.cashJournal,
          bankAccountId: IDS.bank,
          cashAccountId: IDS.cash,
          debtorsAccountId: IDS.debtors,
          paymentDate: NOW,
          paymentReference: "UPI-DUP-TEST",
        },
        testDb,
      );

      // Second payment with same reference should fail
      await expect(
        recordCustomerPayment(
          {
            orderId: IDS.salesOrder,
            amount: 500000,
            paymentMethod: "BANK",
            bankJournalId: IDS.bankJournal,
            cashJournalId: IDS.cashJournal,
            bankAccountId: IDS.bank,
            cashAccountId: IDS.cash,
            debtorsAccountId: IDS.debtors,
            paymentDate: NOW,
            paymentReference: "UPI-DUP-TEST",
          },
          testDb,
        ),
      ).rejects.toThrow(DuplicatePaymentError);
    });
  });

  // =========================================================================
  // 9. Overpayment Protection
  // =========================================================================

  describe("Overpayment protection", () => {
    beforeEach(async () => {
      await postCustomerInvoice(
        {
          orderId: IDS.salesOrder,
          salesJournalId: IDS.salesJournal,
          debtorsAccountId: IDS.debtors,
          salesIncomeAccountId: IDS.salesIncome,
          taxPayableAccountId: IDS.taxPayable,
          date: NOW,
        },
        testDb,
      );
    });

    it("rejects payment exceeding order total", async () => {
      const order = await testDb
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.id, IDS.salesOrder))
        .then((r) => r[0]);

      await expect(
        recordCustomerPayment(
          {
            orderId: IDS.salesOrder,
            amount: order!.totalAmount + 100, // 1 rupee over
            paymentMethod: "BANK",
            bankJournalId: IDS.bankJournal,
            cashJournalId: IDS.cashJournal,
            bankAccountId: IDS.bank,
            cashAccountId: IDS.cash,
            debtorsAccountId: IDS.debtors,
            paymentDate: NOW,
            paymentReference: "OVERPAY-TEST",
          },
          testDb,
        ),
      ).rejects.toThrow(OverpaymentError);
    });

    it("rejects second payment that would exceed total", async () => {
      const order = await testDb
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.id, IDS.salesOrder))
        .then((r) => r[0]);

      // Pay half first
      const halfAmount = Math.floor(order!.totalAmount / 2);
      await recordCustomerPayment(
        {
          orderId: IDS.salesOrder,
          amount: halfAmount,
          paymentMethod: "BANK",
          bankJournalId: IDS.bankJournal,
          cashJournalId: IDS.cashJournal,
          bankAccountId: IDS.bank,
          cashAccountId: IDS.cash,
          debtorsAccountId: IDS.debtors,
          paymentDate: NOW,
          paymentReference: "HALF-PAY",
        },
        testDb,
      );

      // Try to pay more than remaining
      const remaining = order!.totalAmount - halfAmount;
      await expect(
        recordCustomerPayment(
          {
            orderId: IDS.salesOrder,
            amount: remaining + 1, // 1 paisa over
            paymentMethod: "BANK",
            bankJournalId: IDS.bankJournal,
            cashJournalId: IDS.cashJournal,
            bankAccountId: IDS.bank,
            cashAccountId: IDS.cash,
            debtorsAccountId: IDS.debtors,
            paymentDate: NOW,
            paymentReference: "OVERPAY-2",
          },
          testDb,
        ),
      ).rejects.toThrow(OverpaymentError);

      // Paying exactly remaining should succeed
      const result = await recordCustomerPayment(
        {
          orderId: IDS.salesOrder,
          amount: remaining,
          paymentMethod: "BANK",
          bankJournalId: IDS.bankJournal,
          cashJournalId: IDS.cashJournal,
          bankAccountId: IDS.bank,
          cashAccountId: IDS.cash,
          debtorsAccountId: IDS.debtors,
          paymentDate: NOW,
          paymentReference: "EXACT-REMAINING",
        },
        testDb,
      );

      expect(result.newOrderStatus).toBe("PAID");
    });
  });

  // =========================================================================
  // 10. Zero/Negative Payment Rejection
  // =========================================================================

  describe("Zero/negative payment rejection", () => {
    beforeEach(async () => {
      await postCustomerInvoice(
        {
          orderId: IDS.salesOrder,
          salesJournalId: IDS.salesJournal,
          debtorsAccountId: IDS.debtors,
          salesIncomeAccountId: IDS.salesIncome,
          taxPayableAccountId: IDS.taxPayable,
          date: NOW,
        },
        testDb,
      );
    });

    it("rejects zero payment amount", async () => {
      await expect(
        recordCustomerPayment(
          {
            orderId: IDS.salesOrder,
            amount: 0,
            paymentMethod: "BANK",
            bankJournalId: IDS.bankJournal,
            cashJournalId: IDS.cashJournal,
            bankAccountId: IDS.bank,
            cashAccountId: IDS.cash,
            debtorsAccountId: IDS.debtors,
            paymentDate: NOW,
          },
          testDb,
        ),
      ).rejects.toThrow(InvalidPaymentAmountError);
    });

    it("rejects negative payment amount", async () => {
      await expect(
        recordCustomerPayment(
          {
            orderId: IDS.salesOrder,
            amount: -50000,
            paymentMethod: "BANK",
            bankJournalId: IDS.bankJournal,
            cashJournalId: IDS.cashJournal,
            bankAccountId: IDS.bank,
            cashAccountId: IDS.cash,
            debtorsAccountId: IDS.debtors,
            paymentDate: NOW,
          },
          testDb,
        ),
      ).rejects.toThrow(InvalidPaymentAmountError);
    });

    it("rejects fractional payment amount", async () => {
      await expect(
        recordCustomerPayment(
          {
            orderId: IDS.salesOrder,
            amount: 100.5,
            paymentMethod: "BANK",
            bankJournalId: IDS.bankJournal,
            cashJournalId: IDS.cashJournal,
            bankAccountId: IDS.bank,
            cashAccountId: IDS.cash,
            debtorsAccountId: IDS.debtors,
            paymentDate: NOW,
          },
          testDb,
        ),
      ).rejects.toThrow(InvalidPaymentAmountError);
    });
  });

  // =========================================================================
  // 11. Invoice Total Calculation
  // =========================================================================

  describe("calculateOrderTotals()", () => {
    it("calculates multi-line order totals correctly", () => {
      const result = calculateOrderTotals([
        { unitPrice: 850000, quantity: 2, taxRate: 1800 },   // 2 Chairs at ₹8,500
        { unitPrice: 2400000, quantity: 1, taxRate: 1800 },  // 1 Desk at ₹24,000
      ]);

      // Subtotal: 17,000 + 24,000 = 41,000 = 4,100,000 paise
      expect(result.subtotal).toBe(4100000);
      // Tax: 3,060 + 4,320 = 7,380 = 738,000 paise
      expect(result.taxAmount).toBe(738000);
      // Total: 48,380 = 4,838,000 paise
      expect(result.totalAmount).toBe(4838000);
    });

    it("calculates single-line order totals correctly", () => {
      const result = calculateOrderTotals([
        { unitPrice: 450000, quantity: 5, taxRate: 1800 },
      ]);

      expect(result.subtotal).toBe(2250000);   // ₹22,500
      expect(result.taxAmount).toBe(405000);    // ₹4,050
      expect(result.totalAmount).toBe(2655000); // ₹26,550
    });

    it("handles mixed tax rates", () => {
      const result = calculateOrderTotals([
        { unitPrice: 1000000, quantity: 1, taxRate: 1800 }, // 18% GST
        { unitPrice: 500000, quantity: 2, taxRate: 500 },   // 5% GST
      ]);

      expect(result.subtotal).toBe(2000000);        // ₹20,000
      expect(result.taxAmount).toBe(180000 + 50000); // ₹1,800 + ₹500 = ₹2,300
      expect(result.totalAmount).toBe(2230000);      // ₹22,300
    });

    it("returns zero for empty items array", () => {
      const result = calculateOrderTotals([]);
      expect(result.subtotal).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.totalAmount).toBe(0);
    });
  });
});
