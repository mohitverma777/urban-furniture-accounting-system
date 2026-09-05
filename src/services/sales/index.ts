/**
 * src/services/sales/index.ts
 *
 * Sales Service — manages Sales Orders (SO), Customer Invoices,
 * server-side calculation of totals, invoice conversion, and stock updates.
 */

import { db } from "@/db";
import {
  orders,
  orderItems,
  contacts,
  products,
  payments,
  journalEntries,
  journalItems,
  accounts,
  type Order,
} from "@/db/schema";
import { isProductAvailableForTransaction } from "@/services/products";
import { postCustomerInvoice } from "@/services/accounting";
import { recordStockMovement } from "@/services/stock";
import { recordAuditLog } from "@/services/audit";
import { eq, and, desc, count, like } from "drizzle-orm";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Validation Schemas
// ---------------------------------------------------------------------------

export const salesOrderItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().int("Quantity must be a whole number").gt(0, "Quantity must be greater than 0"),
  unitPrice: z.number().min(0, "Unit price cannot be negative"), // input in INR
  taxRate: z.number().min(0, "Tax rate cannot be negative").default(18),
});

export const createSalesOrderSchema = z.object({
  contactId: z.string().min(1, "Customer is required"),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional(),
  items: z.array(salesOrderItemSchema).min(1, "At least one product line item is required"),
});

export type CreateSalesOrderInput = z.infer<typeof createSalesOrderSchema>;

// ---------------------------------------------------------------------------
// Service Functions
// ---------------------------------------------------------------------------

/**
 * Generate sequential Sales Order Number (SO-1001, SO-1002, etc.)
 */
async function generateSalesOrderNumber(): Promise<string> {
  const [res] = await db
    .select({ total: count() })
    .from(orders)
    .where(eq(orders.type, "SO"));

  const nextSeq = (res?.total ?? 0) + 1001;
  return `SO-${nextSeq}`;
}

/**
 * Create a new Sales Order in DRAFT status.
 * ALL totals (subtotal, tax, line_total, totalAmount) are calculated STRICTLY SERVER-SIDE.
 */
export async function createSalesOrder(input: CreateSalesOrderInput): Promise<Order> {
  const validated = createSalesOrderSchema.parse(input);

  // Validate customer
  const [customer] = await db.select().from(contacts).where(eq(contacts.id, validated.contactId));
  if (!customer) {
    throw new Error(`Customer with ID '${validated.contactId}' not found`);
  }

  // Validate each item & compute totals server-side
  let calculatedSubtotal = 0;
  let calculatedTaxAmount = 0;

  const processedItems: {
    productId: string;
    quantity: number;
    unitPrice: number; // in PAISE
    taxRate: number;
    taxAmount: number; // in PAISE
    lineTotal: number; // in PAISE
  }[] = [];

  for (const item of validated.items) {
    if (item.quantity <= 0) {
      throw new Error(`Invalid item quantity '${item.quantity}'. Must be greater than 0.`);
    }

    const [prod] = await db.select().from(products).where(eq(products.id, item.productId));
    if (!prod) {
      throw new Error(`Product with ID '${item.productId}' not found`);
    }

    if (!isProductAvailableForTransaction(prod)) {
      throw new Error(`Product '${prod.name}' is archived and cannot be used in new sales transactions.`);
    }

    const unitPricePaise = Math.round(item.unitPrice * 100);
    const lineSubtotal = item.quantity * unitPricePaise;
    const lineTaxAmount = Math.round((lineSubtotal * item.taxRate) / 100);
    const lineTotal = lineSubtotal + lineTaxAmount;

    calculatedSubtotal += lineSubtotal;
    calculatedTaxAmount += lineTaxAmount;

    processedItems.push({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: unitPricePaise,
      taxRate: item.taxRate,
      taxAmount: lineTaxAmount,
      lineTotal,
    });
  }

  const calculatedTotalAmount = calculatedSubtotal + calculatedTaxAmount;
  const orderNumber = await generateSalesOrderNumber();

  // Database transaction for atomic insert
  const res = await db.transaction((tx) => {
    const invDate = validated.invoiceDate ? new Date(validated.invoiceDate) : new Date();
    const dueDate = validated.dueDate
      ? new Date(validated.dueDate)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const newOrder = tx
      .insert(orders)
      .values({
        orderNumber,
        type: "SO",
        contactId: validated.contactId,
        status: "DRAFT",
        invoiceDate: invDate,
        dueDate,
        subtotal: calculatedSubtotal,
        taxAmount: calculatedTaxAmount,
        totalAmount: calculatedTotalAmount,
      })
      .returning()
      .get();

    for (const pItem of processedItems) {
      tx.insert(orderItems).values({
        orderId: newOrder.id,
        productId: pItem.productId,
        quantity: pItem.quantity,
        unitPrice: pItem.unitPrice,
        taxRate: pItem.taxRate,
        taxAmount: pItem.taxAmount,
        lineTotal: pItem.lineTotal,
      }).run();
    }

    return newOrder;
  });

  // Record Audit Trail event
  await recordAuditLog({
    entityType: "ORDER",
    entityId: res.id,
    action: "CREATE",
    changedBy: "Sales Manager",
    newValue: {
      orderNumber: res.orderNumber,
      type: res.type,
      totalAmount: res.totalAmount,
      contactId: res.contactId,
      status: res.status,
    },
  });

  return res;
}

/**
 * Convert a DRAFT Sales Order into a Customer Invoice (BILLED).
 * Posts the double-entry accounting entry and records outbound stock movements.
 */
export async function convertOrderToInvoice(orderId: string): Promise<Order> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) {
    throw new Error(`Sales order with ID '${orderId}' not found`);
  }

  if (order.type !== "SO") {
    throw new Error(`Order '${order.orderNumber}' is not a Sales Order`);
  }

  if (order.status !== "DRAFT") {
    throw new Error(`Sales Order '${order.orderNumber}' is already in status '${order.status}'`);
  }

  const previousStatus = order.status;

  // 1. Post double-entry accounting entry (Debit Debtors, Credit Sales Income, Credit Tax)
  await postCustomerInvoice({ orderId });

  // 2. Fetch order line items and create outbound stock movements for GOODS & COMBO
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  for (const item of items) {
    await recordStockMovement({
      productId: item.productId,
      type: "SALE",
      quantity: -item.quantity, // Outbound movement decreases stock
      referenceId: orderId,
    });
  }

  // Fetch updated order status
  const [updatedOrder] = await db.select().from(orders).where(eq(orders.id, orderId));

  // Record Audit Trail status change event
  await recordAuditLog({
    entityType: "ORDER",
    entityId: orderId,
    action: "STATUS_CHANGE",
    changedBy: "Accountant",
    oldValue: { status: previousStatus },
    newValue: { status: updatedOrder.status, ledgerPosted: true },
  });

  return updatedOrder;
}

/**
 * Fetch all Sales Orders.
 */
export async function getSalesOrders() {
  return await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      invoiceDate: orders.invoiceDate,
      dueDate: orders.dueDate,
      subtotal: orders.subtotal,
      taxAmount: orders.taxAmount,
      totalAmount: orders.totalAmount,
      contactId: orders.contactId,
      contactName: contacts.name,
      contactEmail: contacts.email,
    })
    .from(orders)
    .leftJoin(contacts, eq(orders.contactId, contacts.id))
    .where(eq(orders.type, "SO"))
    .orderBy(desc(orders.createdAt));
}

/**
 * Fetch full Sales Order Details by ID including line items, customer info,
 * payments made, and linked double-entry journal items for accounting impact inspection.
 */
export async function getSalesOrderById(id: string) {
  const [order] = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      type: orders.type,
      status: orders.status,
      invoiceDate: orders.invoiceDate,
      dueDate: orders.dueDate,
      subtotal: orders.subtotal,
      taxAmount: orders.taxAmount,
      totalAmount: orders.totalAmount,
      contactId: orders.contactId,
      contactName: contacts.name,
      contactEmail: contacts.email,
      contactMobile: contacts.mobile,
      contactAddress: contacts.address,
      contactCity: contacts.city,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .leftJoin(contacts, eq(orders.contactId, contacts.id))
    .where(and(eq(orders.id, id), eq(orders.type, "SO")));

  if (!order) return null;

  // Line items
  const items = await db
    .select({
      id: orderItems.id,
      productId: orderItems.productId,
      productName: products.name,
      productType: products.type,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      taxRate: orderItems.taxRate,
      taxAmount: orderItems.taxAmount,
      lineTotal: orderItems.lineTotal,
    })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, id));

  // Payments received for this order
  const orderPayments = await db
    .select()
    .from(payments)
    .where(eq(payments.orderId, id));

  const totalPaid = orderPayments.reduce((acc, p) => acc + p.amount, 0);
  const outstandingAmount = Math.max(0, order.totalAmount - totalPaid);

  // Accounting Impact: Linked Journal Entry & Posted Items
  let journalEntryData = null;
  const postedEntries = await db
    .select()
    .from(journalEntries)
    .where(like(journalEntries.reference, `%${order.orderNumber}%`));

  if (postedEntries.length > 0) {
    const entry = postedEntries[0];
    const items = await db
      .select({
        id: journalItems.id,
        accountId: journalItems.accountId,
        accountCode: accounts.code,
        accountName: accounts.name,
        debit: journalItems.debit,
        credit: journalItems.credit,
      })
      .from(journalItems)
      .innerJoin(accounts, eq(journalItems.accountId, accounts.id))
      .where(eq(journalItems.entryId, entry.id));

    const totalDebit = items.reduce((sum, i) => sum + i.debit, 0);
    const totalCredit = items.reduce((sum, i) => sum + i.credit, 0);
    const difference = Math.abs(totalDebit - totalCredit);
    const isBalanced = totalDebit === totalCredit && totalDebit > 0;

    journalEntryData = {
      id: entry.id,
      reference: entry.reference,
      description: entry.description,
      date: entry.date,
      items,
      totalDebit,
      totalCredit,
      difference,
      isBalanced,
    };
  }

  return {
    order,
    items,
    payments: orderPayments,
    totalPaid,
    outstandingAmount,
    journalEntryData,
  };
}
