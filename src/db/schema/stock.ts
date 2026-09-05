/**
 * src/db/schema/stock.ts
 *
 * Stock Movements — tracks inventory flow for GOODS-type products.
 *
 * Every movement has a type (PURCHASE inbound, SALE outbound, ADJUSTMENT)
 * and references the source document (orderId) via a soft reference.
 * No typed FK on referenceId because it can point to either SO or PO.
 *
 * Quantity convention: whole integer units (no fractional stock).
 *
 * Note: This is a movement ledger — current on-hand quantity is derived
 * by summing all movements per product.
 */

import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { products } from "./products";

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export const stockMovements = sqliteTable(
  "stock_movements",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    /** The product whose stock is moving */
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),

    /** PURCHASE   = stock received from vendor (positive quantity)
     *  SALE       = stock dispatched to customer (negative quantity)
     *  ADJUSTMENT = manual stock correction (positive or negative) */
    type: text("type", {
      enum: ["PURCHASE", "SALE", "ADJUSTMENT"],
    }).notNull(),

    /**
     * Signed quantity of this movement.
     * PURCHASE:   positive (stock increases)
     * SALE:       negative (stock decreases)
     * ADJUSTMENT: positive or negative
     */
    quantity: integer("quantity").notNull(),

    /**
     * Soft reference to the source document ID (orderId for PO/SO, or null
     * for manual adjustments).  Not a typed FK because it can reference
     * either a purchase order or a sales order.
     */
    referenceId: text("reference_id"),

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("stock_movements_product_idx").on(table.productId),
    index("stock_movements_type_idx").on(table.type),
    index("stock_movements_reference_idx").on(table.referenceId),
    index("stock_movements_created_at_idx").on(table.createdAt),
    // Composite for on-hand stock query (product + type for PO/SO breakdown)
    index("stock_movements_product_type_idx").on(table.productId, table.type),
  ]
);

// ---------------------------------------------------------------------------
// Inferred TypeScript types
// ---------------------------------------------------------------------------

export type StockMovement = typeof stockMovements.$inferSelect;
export type NewStockMovement = typeof stockMovements.$inferInsert;
export type StockMovementType = StockMovement["type"];
