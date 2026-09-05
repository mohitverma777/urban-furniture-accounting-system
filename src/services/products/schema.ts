/**
 * src/services/products/schema.ts
 *
 * Client-safe validation schemas, types, and pure business rule helpers for Products.
 * Does NOT import database drivers. Safe for use in Client Components.
 */

import { z } from "zod";
import type { Product, ProductType } from "@/db/schema/products";

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
