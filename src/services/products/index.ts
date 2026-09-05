/**
 * src/services/products/index.ts
 *
 * Products Service — business logic for managing furniture goods, services, and combos.
 */

import { db } from "@/db";
import { products, type Product, type ProductType } from "@/db/schema/products";
import { eq, and, like, or } from "drizzle-orm";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Zod Validation Schema
// ---------------------------------------------------------------------------

export const productFormSchema = z.object({
  name: z.string().trim().min(1, "Product name is required"),
  type: z.enum(["GOODS", "SERVICE", "COMBO"]),
  salesPrice: z.number().min(0, "Sales price cannot be negative"),
  costPrice: z.number().min(0, "Cost price cannot be negative"),
  category: z.string().trim().optional(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

export interface GetProductsFilter {
  search?: string;
  type?: ProductType | "ALL";
  category?: string;
  isArchived?: boolean;
}

// ---------------------------------------------------------------------------
// Business Rules
// ---------------------------------------------------------------------------

/**
 * Business Rule:
 *   - GOODS & COMBO products can generate stock movements (if not archived).
 *   - SERVICE items DO NOT generate stock movements.
 *   - Archived products cannot participate in new transactions or stock movements.
 */
export function canCreateStockMovement(product: Product): boolean {
  if (product.isArchived) return false;
  return product.type === "GOODS" || product.type === "COMBO";
}

/**
 * Business Rule:
 *   - Archived products cannot be used in new orders/invoices.
 */
export function isProductAvailableForTransaction(product: Product): boolean {
  return !product.isArchived;
}

// ---------------------------------------------------------------------------
// Service Functions
// ---------------------------------------------------------------------------

/**
 * Query products with optional search, type filter, category filter, and archived status.
 */
export async function getProducts(filter: GetProductsFilter = {}): Promise<Product[]> {
  const conditions = [];

  if (filter.isArchived !== undefined) {
    conditions.push(eq(products.isArchived, filter.isArchived));
  } else {
    // Default to active non-archived products
    conditions.push(eq(products.isArchived, false));
  }

  if (filter.type && filter.type !== "ALL") {
    conditions.push(eq(products.type, filter.type));
  }

  if (filter.category && filter.category.trim() !== "" && filter.category !== "ALL") {
    conditions.push(eq(products.category, filter.category.trim()));
  }

  if (filter.search && filter.search.trim() !== "") {
    const q = `%${filter.search.trim()}%`;
    conditions.push(
      or(
        like(products.name, q),
        like(products.category, q)
      )!
    );
  }

  return await db
    .select()
    .from(products)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(products.name);
}

/**
 * Fetch a product by primary key ID.
 */
export async function getProductById(id: string): Promise<Product | null> {
  const [result] = await db.select().from(products).where(eq(products.id, id));
  return result ?? null;
}

/**
 * Create a new product record.
 * Prices are input in rupees (INR) and stored in PAISE (1 INR = 100 paise).
 */
export async function createProduct(input: ProductFormValues): Promise<Product> {
  const validated = productFormSchema.parse(input);

  const [newProduct] = await db
    .insert(products)
    .values({
      name: validated.name,
      type: validated.type,
      salesPrice: Math.round(validated.salesPrice * 100),
      costPrice: Math.round(validated.costPrice * 100),
      category: validated.category || null,
      isArchived: false,
    })
    .returning();

  return newProduct;
}

/**
 * Update an existing product record.
 */
export async function updateProduct(
  id: string,
  input: Partial<ProductFormValues>
): Promise<Product> {
  const existing = await getProductById(id);
  if (!existing) {
    throw new Error(`Product with ID '${id}' not found`);
  }

  const validated = productFormSchema.partial().parse(input);

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (validated.name !== undefined) updates.name = validated.name;
  if (validated.type !== undefined) updates.type = validated.type;
  if (validated.salesPrice !== undefined)
    updates.salesPrice = Math.round(validated.salesPrice * 100);
  if (validated.costPrice !== undefined)
    updates.costPrice = Math.round(validated.costPrice * 100);
  if (validated.category !== undefined) updates.category = validated.category || null;

  const [updated] = await db
    .update(products)
    .set(updates)
    .where(eq(products.id, id))
    .returning();

  return updated;
}

/**
 * Soft-archive a product.
 */
export async function archiveProduct(id: string): Promise<Product> {
  const existing = await getProductById(id);
  if (!existing) {
    throw new Error(`Product with ID '${id}' not found`);
  }

  const [archived] = await db
    .update(products)
    .set({
      isArchived: true,
      updatedAt: new Date(),
    })
    .where(eq(products.id, id))
    .returning();

  return archived;
}

/**
 * Unarchive a soft-archived product.
 */
export async function unarchiveProduct(id: string): Promise<Product> {
  const existing = await getProductById(id);
  if (!existing) {
    throw new Error(`Product with ID '${id}' not found`);
  }

  const [restored] = await db
    .update(products)
    .set({
      isArchived: false,
      updatedAt: new Date(),
    })
    .where(eq(products.id, id))
    .returning();

  return restored;
}
