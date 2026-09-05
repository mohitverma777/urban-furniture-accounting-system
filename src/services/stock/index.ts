/**
 * src/services/stock/index.ts
 *
 * Stock / Inventory Service — tracks stock movements for GOODS & COMBO products.
 */

import { db } from "@/db";
import { stockMovements, type StockMovement, type StockMovementType } from "@/db/schema/stock";
import { products } from "@/db/schema/products";
import { canCreateStockMovement } from "@/services/products";
import { eq, sum } from "drizzle-orm";

export interface RecordStockMovementInput {
  productId: string;
  type: StockMovementType;
  quantity: number; // positive for PURCHASE, negative for SALE
  referenceId?: string;
}

/**
 * Record a stock movement for a product.
 * Returns null if the product is a SERVICE or is archived (non-stockable).
 */
export async function recordStockMovement(
  input: RecordStockMovementInput
): Promise<StockMovement | null> {
  const [product] = await db.select().from(products).where(eq(products.id, input.productId));
  if (!product || !canCreateStockMovement(product)) {
    // Non-stockable or archived product — skip stock movement
    return null;
  }

  const [movement] = await db
    .insert(stockMovements)
    .values({
      productId: input.productId,
      type: input.type,
      quantity: input.quantity,
      referenceId: input.referenceId || null,
    })
    .returning();

  return movement;
}

/**
 * Calculate current on-hand quantity for a product by summing all movements.
 */
export async function getProductStockOnHand(productId: string): Promise<number> {
  const [res] = await db
    .select({ totalQuantity: sum(stockMovements.quantity) })
    .from(stockMovements)
    .where(eq(stockMovements.productId, productId));

  return (res?.totalQuantity ?? 0) as number;
}
