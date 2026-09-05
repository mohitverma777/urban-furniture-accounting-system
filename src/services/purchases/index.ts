/**
 * src/services/purchases/index.ts
 *
 * Purchase Service — manages Purchase Orders (PO), Vendor Bills (AP invoices),
 * server-side price & tax calculations, inventory stock increases, and
 * double-entry accounting integration.
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
  analyticAccounts,
  type Order,
} from "@/db/schema";
import { eq, and, desc, like } from "drizzle-orm";
import { postVendorBill } from "@/services/accounting";
import { recordStockMovement } from "@/services/stock";
import {
  createPurchaseOrderSchema,
  type CreatePurchaseOrderInput,
} from "./schema";

export * from "./schema";

/**
 * Generate sequential Purchase Order number: "PO-0001", "PO-0002", etc.
 */
export async function generatePurchaseOrderNumber(): Promise<string> {
  const [latest] = await db
    .select({ orderNumber: orders.orderNumber })
    .from(orders)
    .where(eq(orders.type, "PO"))
    .orderBy(desc(orders.createdAt))
    .limit(1);

  if (!latest) {
    return "PO-0001";
  }

  const match = latest.orderNumber.match(/PO-(\d+)/);
  if (match) {
    const nextSeq = parseInt(match[1], 10) + 1;
    return `PO-${String(nextSeq).padStart(4, "0")}`;
  }

  return `PO-${Date.now().toString().slice(-4)}`;
}

/**
 * Create a new Purchase Order in DRAFT status.
 * Calculates line subtotal, tax amount, and total amount strictly server-side in integer paise.
 */
export async function createPurchaseOrder(
  input: CreatePurchaseOrderInput
): Promise<Order> {
  const validated = createPurchaseOrderSchema.parse(input);

  // 1. Validate Vendor existence and type
  const [vendor] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, validated.contactId));

  if (!vendor) {
    throw new Error(`Vendor contact with ID '${validated.contactId}' not found.`);
  }

  if (vendor.type !== "VENDOR" && vendor.type !== "BOTH") {
    throw new Error(`Contact '${vendor.name}' is not configured as a Vendor.`);
  }

  // 2. Validate product line items & calculate server-side totals
  let calculatedSubtotal = 0;
  let calculatedTaxAmount = 0;
  const processedItems: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    taxAmount: number;
    lineTotal: number;
  }> = [];

  for (const item of validated.items) {
    const [prod] = await db
      .select()
      .from(products)
      .where(eq(products.id, item.productId));

    if (!prod) {
      throw new Error(`Product with ID '${item.productId}' not found.`);
    }

    if (prod.isArchived) {
      throw new Error(
        `Product '${prod.name}' is archived and cannot be used in new purchase transactions.`
      );
    }

    // Convert input unitPrice (in INR rupees) to integer paise
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
  const orderNumber = await generatePurchaseOrderNumber();

  // 3. Database transaction for atomic insertion
  return db.transaction((tx) => {
    const invDate = validated.invoiceDate
      ? new Date(validated.invoiceDate)
      : new Date();
    const dueDate = validated.dueDate
      ? new Date(validated.dueDate)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const newOrder = tx
      .insert(orders)
      .values({
        orderNumber,
        type: "PO",
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
      tx.insert(orderItems)
        .values({
          orderId: newOrder.id,
          productId: pItem.productId,
          quantity: pItem.quantity,
          unitPrice: pItem.unitPrice,
          taxRate: pItem.taxRate,
          taxAmount: pItem.taxAmount,
          lineTotal: pItem.lineTotal,
        })
        .run();
    }

    return newOrder;
  });
}

/**
 * Convert a DRAFT Purchase Order into a Vendor Bill (BILLED).
 * Posts double-entry accounting entry (Dr Purchase Expense, Cr Creditors)
 * and records inbound stock movements for GOODS & COMBO products (+quantity).
 */
export async function convertOrderToVendorBill(orderId: string): Promise<Order> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) {
    throw new Error(`Purchase order with ID '${orderId}' not found.`);
  }

  if (order.type !== "PO") {
    throw new Error(`Order '${order.orderNumber}' is not a Purchase Order.`);
  }

  if (order.status !== "DRAFT") {
    throw new Error(
      `Purchase Order '${order.orderNumber}' is already in status '${order.status}'.`
    );
  }

  // 1. Post double-entry accounting entry (Dr Purchase Expense, Cr Creditors)
  await postVendorBill({ orderId });

  // 2. Fetch order line items and create inbound stock movements (+quantity) for GOODS & COMBO
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  for (const item of items) {
    await recordStockMovement({
      productId: item.productId,
      type: "PURCHASE",
      quantity: item.quantity, // Inbound movement increases stock
      referenceId: orderId,
    });
  }

  // Fetch updated order status
  const [updatedOrder] = await db.select().from(orders).where(eq(orders.id, orderId));
  return updatedOrder;
}

/**
 * Fetch all Purchase Orders.
 */
export async function getPurchaseOrders() {
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
    .where(eq(orders.type, "PO"))
    .orderBy(desc(orders.createdAt));
}

/**
 * Fetch full Purchase Order / Vendor Bill Details by ID including line items,
 * vendor info, payments made, outstanding balance, and linked double-entry journal items.
 */
export async function getPurchaseOrderById(id: string) {
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
    .where(and(eq(orders.id, id), eq(orders.type, "PO")));

  if (!order) return null;

  // Fetch order items with product details
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

  // Fetch payments made for this order
  const orderPayments = await db
    .select()
    .from(payments)
    .where(eq(payments.orderId, id))
    .orderBy(desc(payments.paymentDate));

  const totalPaid = orderPayments.reduce((sum, p) => sum + p.amount, 0);
  const outstandingAmount = Math.max(0, order.totalAmount - totalPaid);

  // Fetch linked double-entry journal entry for accounting impact viewer
  const [journalEntry] = await db
    .select()
    .from(journalEntries)
    .where(like(journalEntries.reference, `%${order.orderNumber}%`));

  let journalLines: Array<{
    id: string;
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
    analyticAccountName: string | null;
  }> = [];

  if (journalEntry) {
    journalLines = await db
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
      .where(eq(journalItems.entryId, journalEntry.id));
  }

  return {
    order,
    items,
    payments: orderPayments,
    totalPaid,
    outstandingAmount,
    journalEntry: journalEntry
      ? {
          ...journalEntry,
          lines: journalLines,
        }
      : null,
  };
}
