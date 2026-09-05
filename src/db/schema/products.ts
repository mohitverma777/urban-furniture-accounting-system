/**
 * src/db/schema/products.ts
 *
 * Products — the items sold or purchased by the business.
 *
 * Money convention: salesPrice and costPrice are stored as INTEGER PAISE
 * (1 INR = 100 paise).  Never store as REAL / FLOAT.
 */

import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export const products = sqliteTable(
  "products",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    name: text("name").notNull(),

    /** GOODS   = physical product that affects stock
     *  SERVICE = non-physical, no stock movement
     *  COMBO   = bundle of goods and/or services */
    type: text("type", { enum: ["GOODS", "SERVICE", "COMBO"] }).notNull(),

    /** Selling price in PAISE (integer).  Example: ₹1,500.00 → 150000 */
    salesPrice: integer("sales_price").notNull().default(0),

    /** Purchase / cost price in PAISE (integer). */
    costPrice: integer("cost_price").notNull().default(0),

    /** Freeform category label (e.g. "Sofas", "Dining Sets", "Accessories") */
    category: text("category"),

    /** Product Image URL */
    imageUrl: text("image_url"),

    /** Soft archive flag */
    isArchived: integer("is_archived", { mode: "boolean" })
      .notNull()
      .default(false),

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),

    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("products_type_idx").on(table.type),
    index("products_category_idx").on(table.category),
    index("products_name_idx").on(table.name),
  ]
);

// ---------------------------------------------------------------------------
// Inferred TypeScript types
// ---------------------------------------------------------------------------

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductType = Product["type"];
