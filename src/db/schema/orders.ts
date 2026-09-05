/**
 * src/db/schema/orders.ts
 *
 * Orders (Sales Orders + Purchase Orders) and Order Line Items.
 *
 * A single "orders" table covers both SO and PO — they share the same
 * structural shape and lifecycle, differentiated by the `type` column.
 *
 * Money convention: subtotal, taxAmount, totalAmount, unitPrice, taxAmount
 * (per line), and lineTotal are all INTEGER PAISE. Never REAL/FLOAT.
 *
 * taxRate per line is stored as INTEGER in hundredths of a percent:
 *   18% GST → 1800
 *   12% GST → 1200
 *    5% GST →  500
 *    0%     →    0
 */

import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { contacts } from "./contacts";
import { products } from "./products";

// ---------------------------------------------------------------------------
// orders
// ---------------------------------------------------------------------------

export const orders = sqliteTable(
  "orders",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    /** Auto-generated document number: "SO-0001", "PO-0001", etc. */
    orderNumber: text("order_number").notNull(),

    /** PO = Purchase Order (we buy from vendor)
     *  SO = Sales Order (we sell to customer) */
    type: text("type", { enum: ["PO", "SO"] }).notNull(),

    /** Customer (for SO) or Vendor (for PO) */
    contactId: text("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "restrict" }),

    /** DRAFT   = editable, not yet committed
     *  BILLED  = invoice/bill has been created (fully)
     *  PARTIAL = invoice/bill created for part of the order
     *  PAID    = all invoices/bills fully paid */
    status: text("status", {
      enum: ["DRAFT", "BILLED", "PARTIAL", "PAID"],
    })
      .notNull()
      .default("DRAFT"),

    /** Invoice or bill date */
    invoiceDate: integer("invoice_date", { mode: "timestamp" }),

    /** Payment due date */
    dueDate: integer("due_date", { mode: "timestamp" }),

    /** Sum of (unitPrice × quantity) for all lines — INTEGER PAISE */
    subtotal: integer("subtotal").notNull().default(0),

    /** Sum of tax amounts for all lines — INTEGER PAISE */
    taxAmount: integer("tax_amount").notNull().default(0),

    /** subtotal + taxAmount — INTEGER PAISE */
    totalAmount: integer("total_amount").notNull().default(0),

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),

    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("orders_order_number_uidx").on(table.orderNumber),
    index("orders_type_idx").on(table.type),
    index("orders_contact_idx").on(table.contactId),
    index("orders_status_idx").on(table.status),
    index("orders_invoice_date_idx").on(table.invoiceDate),
    index("orders_due_date_idx").on(table.dueDate),
    // Composite for common list queries (type + status + date)
    index("orders_type_status_idx").on(table.type, table.status),
  ]
);

// ---------------------------------------------------------------------------
// order_items
// ---------------------------------------------------------------------------

export const orderItems = sqliteTable(
  "order_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    /** Parent order */
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),

    /** Product on this line */
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),

    /** Quantity (whole units — furniture is not sold in fractions) */
    quantity: integer("quantity").notNull().default(1),

    /** Per-unit selling or cost price — INTEGER PAISE */
    unitPrice: integer("unit_price").notNull().default(0),

    /** Tax rate in hundredths of a percent.
     *  18% GST → 1800 | 12% → 1200 | 5% → 500 | 0% → 0 */
    taxRate: integer("tax_rate").notNull().default(0),

    /** Computed tax amount for this line — INTEGER PAISE
     *  = round((unitPrice × quantity × taxRate) / 10000) */
    taxAmount: integer("tax_amount").notNull().default(0),

    /** Computed line total including tax — INTEGER PAISE
     *  = (unitPrice × quantity) + taxAmount */
    lineTotal: integer("line_total").notNull().default(0),
  },
  (table) => [
    index("order_items_order_idx").on(table.orderId),
    index("order_items_product_idx").on(table.productId),
  ]
);

// ---------------------------------------------------------------------------
// Inferred TypeScript types
// ---------------------------------------------------------------------------

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderType = Order["type"];
export type OrderStatus = Order["status"];

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
