/**
 * src/services/payments/query.ts
 *
 * Query service for Central Payments module:
 *   - List all payments (customer receipts & vendor disbursements) with search & filters
 *   - Fetch detailed payment breakdown with linked double-entry journal items
 *   - Fetch unpaid/partially paid source documents (Invoices & Bills) for the Payment Form
 */

import { db } from "@/db";
import {
  payments,
  orders,
  contacts,
  journalEntries,
  journalItems,
  accounts,
  analyticAccounts,
} from "@/db/schema";
import { eq, and, desc, like, or, sql } from "drizzle-orm";

export interface PaymentsFilter {
  direction?: "ALL" | "CUSTOMER" | "VENDOR";
  method?: "ALL" | "CASH" | "BANK";
  search?: string;
}

export interface PaymentListItem {
  id: string;
  amount: number; // in paise
  paymentMethod: "CASH" | "BANK";
  paymentDate: Date;
  reference: string | null;
  orderId: string;
  orderNumber: string;
  orderType: "SO" | "PO";
  contactId: string;
  contactName: string;
  contactType: string;
  journalEntryId: string | null;
}

/**
 * Fetch all recorded payments with direction filter, method filter, and search.
 */
export async function getPaymentsList(filter: PaymentsFilter = {}): Promise<PaymentListItem[]> {
  const conditions = [];

  if (filter.direction === "CUSTOMER") {
    conditions.push(eq(orders.type, "SO"));
  } else if (filter.direction === "VENDOR") {
    conditions.push(eq(orders.type, "PO"));
  }

  if (filter.method && filter.method !== "ALL") {
    conditions.push(eq(payments.paymentMethod, filter.method));
  }

  if (filter.search && filter.search.trim() !== "") {
    const searchPattern = `%${filter.search.trim()}%`;
    conditions.push(
      or(
        like(payments.reference, searchPattern),
        like(orders.orderNumber, searchPattern),
        like(contacts.name, searchPattern)
      )
    );
  }

  const rows = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      paymentMethod: payments.paymentMethod,
      paymentDate: payments.paymentDate,
      reference: payments.reference,
      orderId: payments.orderId,
      orderNumber: orders.orderNumber,
      orderType: orders.type,
      contactId: orders.contactId,
      contactName: contacts.name,
      contactType: contacts.type,
      journalEntryId: payments.journalEntryId,
    })
    .from(payments)
    .innerJoin(orders, eq(payments.orderId, orders.id))
    .innerJoin(contacts, eq(orders.contactId, contacts.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(payments.paymentDate));

  return rows as PaymentListItem[];
}

export interface PaymentDetail {
  id: string;
  amount: number; // in paise
  paymentMethod: "CASH" | "BANK";
  paymentDate: Date;
  reference: string | null;
  order: {
    id: string;
    orderNumber: string;
    type: "SO" | "PO";
    totalAmount: number;
    status: string;
  };
  contact: {
    id: string;
    name: string;
    email: string | null;
    type: string;
  };
  journalEntry: {
    id: string;
    reference: string | null;
    date: Date;
    lines: Array<{
      id: string;
      accountCode: string;
      accountName: string;
      debit: number;
      credit: number;
      analyticAccountName: string | null;
    }>;
  } | null;
}

/**
 * Fetch detailed breakdown for a single payment including source document and journal lines.
 */
export async function getPaymentById(paymentId: string): Promise<PaymentDetail | null> {
  const [row] = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      paymentMethod: payments.paymentMethod,
      paymentDate: payments.paymentDate,
      reference: payments.reference,
      orderId: orders.id,
      orderNumber: orders.orderNumber,
      orderType: orders.type,
      orderTotalAmount: orders.totalAmount,
      orderStatus: orders.status,
      contactId: contacts.id,
      contactName: contacts.name,
      contactEmail: contacts.email,
      contactType: contacts.type,
      journalEntryId: payments.journalEntryId,
    })
    .from(payments)
    .innerJoin(orders, eq(payments.orderId, orders.id))
    .innerJoin(contacts, eq(orders.contactId, contacts.id))
    .where(eq(payments.id, paymentId));

  if (!row) return null;

  let journalEntryData = null;

  if (row.journalEntryId) {
    const [jEntry] = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.id, row.journalEntryId));

    if (jEntry) {
      const lines = await db
        .select({
          id: journalItems.id,
          accountCode: accounts.code,
          accountName: accounts.name,
          debit: journalItems.debit,
          credit: journalItems.credit,
          analyticAccountName: analyticAccounts.name,
        })
        .from(journalItems)
        .innerJoin(accounts, eq(journalItems.accountId, accounts.id))
        .leftJoin(
          analyticAccounts,
          eq(journalItems.analyticAccountId, analyticAccounts.id)
        )
        .where(eq(journalItems.entryId, jEntry.id));

      journalEntryData = {
        id: jEntry.id,
        reference: jEntry.reference,
        date: jEntry.date,
        lines,
      };
    }
  }

  return {
    id: row.id,
    amount: row.amount,
    paymentMethod: row.paymentMethod,
    paymentDate: row.paymentDate,
    reference: row.reference,
    order: {
      id: row.orderId,
      orderNumber: row.orderNumber,
      type: row.orderType as "SO" | "PO",
      totalAmount: row.orderTotalAmount,
      status: row.orderStatus,
    },
    contact: {
      id: row.contactId,
      name: row.contactName,
      email: row.contactEmail,
      type: row.contactType,
    },
    journalEntry: journalEntryData,
  };
}

export interface UnpaidDocumentItem {
  id: string;
  orderNumber: string;
  type: "SO" | "PO";
  contactId: string;
  contactName: string;
  totalAmount: number; // in paise
  totalPaid: number; // in paise
  outstandingAmount: number; // in paise
  invoiceDate: Date | null;
  status: string;
}

/**
 * Query all unpaid or partially paid documents (status: BILLED or PARTIAL)
 * for Customer Invoices (SO) and Vendor Bills (PO).
 */
export async function getUnpaidDocuments(): Promise<UnpaidDocumentItem[]> {
  const unpaidOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      type: orders.type,
      contactId: orders.contactId,
      contactName: contacts.name,
      totalAmount: orders.totalAmount,
      invoiceDate: orders.invoiceDate,
      status: orders.status,
    })
    .from(orders)
    .innerJoin(contacts, eq(orders.contactId, contacts.id))
    .where(or(eq(orders.status, "BILLED"), eq(orders.status, "PARTIAL")))
    .orderBy(desc(orders.createdAt));

  const result: UnpaidDocumentItem[] = [];

  for (const ord of unpaidOrders) {
    const paidRes = await db
      .select({
        total: sql<number>`COALESCE(SUM(${payments.amount}), 0)`,
      })
      .from(payments)
      .where(eq(payments.orderId, ord.id));

    const totalPaid = Number(paidRes[0]?.total ?? 0);
    const outstandingAmount = Math.max(0, ord.totalAmount - totalPaid);

    if (outstandingAmount > 0) {
      result.push({
        id: ord.id,
        orderNumber: ord.orderNumber,
        type: ord.type as "SO" | "PO",
        contactId: ord.contactId,
        contactName: ord.contactName,
        totalAmount: ord.totalAmount,
        totalPaid,
        outstandingAmount,
        invoiceDate: ord.invoiceDate,
        status: ord.status,
      });
    }
  }

  return result;
}
