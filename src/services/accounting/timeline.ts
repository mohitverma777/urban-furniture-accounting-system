/**
 * src/services/accounting/timeline.ts
 *
 * Transaction Timeline & Accounting Impact Service:
 *  - Derives the full life cycle and double-entry accounting impact for a Sales Order / Purchase Order.
 *  - Sequence: Order Creation -> Invoice / Bill Journal Entry (Dr/Cr) -> Stock Movement (+/- Qty) -> Payment Settlement (Dr/Cr).
 *  - Reuses existing posted journal entries, stock movements, and payment records.
 *  - Strictly read-only and does not modify accounting calculations.
 */

import { db } from "@/db";
import {
  orders,
  orderItems,
  journalEntries,
  journalItems,
  stockMovements,
  payments,
  contacts,
  accounts,
  products,
} from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export interface TimelineLineItem {
  accountCode: string;
  accountName: string;
  amountPaise: number;
  amountFormatted: string;
}

export interface TimelineStockItem {
  productName: string;
  quantity: number;
  type: "PURCHASE" | "SALE" | "ADJUSTMENT";
}

export interface TimelineStep {
  id: string;
  stepNumber: number;
  title: string;
  category: "ORDER" | "INVOICE" | "STOCK" | "PAYMENT";
  date: string;
  description: string;
  statusBadge?: string;
  impact: {
    debits: TimelineLineItem[];
    credits: TimelineLineItem[];
    stockMovements: TimelineStockItem[];
  };
}

export interface TransactionTimelineData {
  orderId: string;
  orderNumber: string;
  type: "SO" | "PO";
  partyName: string;
  totalAmountPaise: number;
  totalAmountFormatted: string;
  steps: TimelineStep[];
}

/** Format paise integer to human-readable INR string (₹). */
function formatINR(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Retrieve complete Transaction Timeline & Accounting Impact for an order.
 */
export async function getTransactionTimeline(
  orderId: string
): Promise<TransactionTimelineData | null> {
  const [order] = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      type: orders.type,
      status: orders.status,
      invoiceDate: orders.invoiceDate,
      totalAmount: orders.totalAmount,
      contactName: contacts.name,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .leftJoin(contacts, eq(orders.contactId, contacts.id))
    .where(eq(orders.id, orderId));

  if (!order) return null;

  const partyName = order.contactName || "Counterparty";
  const orderTypeStr = order.type === "SO" ? "Sales Order" : "Purchase Order";
  const invoiceTypeStr = order.type === "SO" ? "Customer Invoice" : "Vendor Bill";

  const steps: TimelineStep[] = [];
  let stepCounter = 1;

  // -------------------------------------------------------------------------
  // Step 1: Order Creation (Commercial Order Draft)
  // -------------------------------------------------------------------------
  const orderDateStr = order.createdAt instanceof Date
    ? order.createdAt.toISOString().split("T")[0]
    : String(order.createdAt).split("T")[0];

  const items = await db
    .select({
      productName: products.name,
      quantity: orderItems.quantity,
    })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, orderId));

  steps.push({
    id: `step-order-${order.id}`,
    stepNumber: stepCounter++,
    title: `1. ${orderTypeStr} Created (${order.orderNumber})`,
    category: "ORDER",
    date: orderDateStr,
    description: `Commercial agreement created with ${partyName} for ${items.length} line items total value ${formatINR(
      order.totalAmount
    )}. No financial ledger entries posted at draft stage.`,
    statusBadge: order.status,
    impact: {
      debits: [],
      credits: [],
      stockMovements: [],
    },
  });

  // -------------------------------------------------------------------------
  // Step 2: Invoice / Bill Posting & Double-Entry Journal Impact
  // -------------------------------------------------------------------------
  const matchedEntries = await db
    .select({
      id: journalEntries.id,
      date: journalEntries.date,
      reference: journalEntries.reference,
      description: journalEntries.description,
    })
    .from(journalEntries)
    .where(eq(journalEntries.reference, order.orderNumber));

  if (matchedEntries.length > 0) {
    for (const entry of matchedEntries) {
      const entryDateStr = new Date(entry.date).toISOString().split("T")[0];

      const lines = await db
        .select({
          accountCode: accounts.code,
          accountName: accounts.name,
          debit: journalItems.debit,
          credit: journalItems.credit,
        })
        .from(journalItems)
        .innerJoin(accounts, eq(journalItems.accountId, accounts.id))
        .where(eq(journalItems.entryId, entry.id));

      const debits: TimelineLineItem[] = lines
        .filter((l) => l.debit > 0)
        .map((l) => ({
          accountCode: l.accountCode,
          accountName: l.accountName,
          amountPaise: l.debit,
          amountFormatted: formatINR(l.debit),
        }));

      const credits: TimelineLineItem[] = lines
        .filter((l) => l.credit > 0)
        .map((l) => ({
          accountCode: l.accountCode,
          accountName: l.accountName,
          amountPaise: l.credit,
          amountFormatted: formatINR(l.credit),
        }));

      steps.push({
        id: `step-journal-${entry.id}`,
        stepNumber: stepCounter++,
        title: `${stepCounter - 1}. ${invoiceTypeStr} Posted (Voucher ${entry.reference})`,
        category: "INVOICE",
        date: entryDateStr,
        description: `Posted double-entry accounting voucher for ${formatINR(
          order.totalAmount
        )}. Recognized ${
          order.type === "SO"
            ? "Accounts Receivable asset (Dr) and Sales Revenue (Cr)"
            : "Purchases / Inventory asset (Dr) and Accounts Payable liability (Cr)"
        }.`,
        statusBadge: "POSTED",
        impact: {
          debits,
          credits,
          stockMovements: [],
        },
      });
    }
  }

  // -------------------------------------------------------------------------
  // Step 3: Warehouse Stock Movement (Perpetual Inventory Ledger)
  // -------------------------------------------------------------------------
  const movements = await db
    .select({
      id: stockMovements.id,
      type: stockMovements.type,
      quantity: stockMovements.quantity,
      createdAt: stockMovements.createdAt,
      productName: products.name,
    })
    .from(stockMovements)
    .innerJoin(products, eq(stockMovements.productId, products.id))
    .where(eq(stockMovements.referenceId, order.orderNumber));

  if (movements.length > 0) {
    const stockDateStr = new Date(movements[0].createdAt).toISOString().split("T")[0];
    const isOutbound = order.type === "SO";

    steps.push({
      id: `step-stock-${order.id}`,
      stepNumber: stepCounter++,
      title: `${stepCounter - 1}. Warehouse Stock ${isOutbound ? "Dispatch (-Qty)" : "Receipt (+Qty)"}`,
      category: "STOCK",
      date: stockDateStr,
      description: `Updated perpetual stock ledger. ${
        isOutbound
          ? "Outbound goods dispatched to customer."
          : "Inbound inventory received into warehouse."
      }`,
      impact: {
        debits: [],
        credits: [],
        stockMovements: movements.map((m) => ({
          productName: m.productName,
          quantity: m.quantity,
          type: m.type,
        })),
      },
    });
  }

  // -------------------------------------------------------------------------
  // Step 4: Payment Receipts & Bank Settlement
  // -------------------------------------------------------------------------
  const orderPayments = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      paymentMethod: payments.paymentMethod,
      paymentDate: payments.paymentDate,
      reference: payments.reference,
    })
    .from(payments)
    .where(eq(payments.orderId, orderId))
    .orderBy(asc(payments.paymentDate));

  for (const pay of orderPayments) {
    const payDateStr = new Date(pay.paymentDate).toISOString().split("T")[0];
    const refText = pay.reference ? `Ref: ${pay.reference}` : `Method: ${pay.paymentMethod}`;

    const isCustomerPayment = order.type === "SO";

    const debits: TimelineLineItem[] = [
      {
        accountCode: isCustomerPayment ? "1010" : "2000",
        accountName: isCustomerPayment ? "Bank / Cash Account" : "Accounts Payable (Vendor Creditors)",
        amountPaise: pay.amount,
        amountFormatted: formatINR(pay.amount),
      },
    ];

    const credits: TimelineLineItem[] = [
      {
        accountCode: isCustomerPayment ? "1100" : "1010",
        accountName: isCustomerPayment ? "Accounts Receivable (Customer Debtors)" : "Bank / Cash Account",
        amountPaise: pay.amount,
        amountFormatted: formatINR(pay.amount),
      },
    ];

    steps.push({
      id: `step-payment-${pay.id}`,
      stepNumber: stepCounter++,
      title: `${stepCounter - 1}. Payment ${isCustomerPayment ? "Received" : "Disbursed"} (${formatINR(
        pay.amount
      )})`,
      category: "PAYMENT",
      date: payDateStr,
      description: `${
        isCustomerPayment
          ? `Settled customer receivable via ${pay.paymentMethod}. (${refText})`
          : `Settled vendor payable via ${pay.paymentMethod}. (${refText})`
      }`,
      statusBadge: "SETTLED",
      impact: {
        debits,
        credits,
        stockMovements: [],
      },
    });
  }

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    type: order.type as "SO" | "PO",
    partyName,
    totalAmountPaise: order.totalAmount,
    totalAmountFormatted: formatINR(order.totalAmount),
    steps,
  };
}
