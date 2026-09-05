/**
 * src/services/stock/query.ts
 *
 * Query service for the Stock / Inventory Module:
 *   - Per-product stock breakdown (opening, purchased, sold, adjustments, current stock-on-hand)
 *   - Chronological stock movement history log
 */

import { db } from "@/db";
import { stockMovements, products, type StockMovementType } from "@/db/schema";
import { eq, and, desc, like, or, sql } from "drizzle-orm";

export interface ProductStockSummaryItem {
  id: string;
  name: string;
  category: string | null;
  type: "GOODS" | "SERVICE" | "COMBO";
  isArchived: boolean;
  openingQty: number;
  purchasedQty: number;
  soldQty: number;
  adjustedQty: number;
  currentQty: number;
}

/**
 * Query stock breakdown for all products (or filtered by search).
 * Calculates purchased, sold, adjustments, and current balance strictly from stock_movements.
 */
export async function getProductStockSummaries(
  search?: string
): Promise<ProductStockSummaryItem[]> {
  const conditions = [eq(products.isArchived, false)];

  if (search && search.trim() !== "") {
    const searchPattern = `%${search.trim()}%`;
    conditions.push(
      or(
        like(products.name, searchPattern),
        like(products.category, searchPattern)
      )!
    );
  }

  const allProducts = await db
    .select({
      id: products.id,
      name: products.name,
      category: products.category,
      type: products.type,
      isArchived: products.isArchived,
    })
    .from(products)
    .where(and(...conditions))
    .orderBy(products.name);

  const result: ProductStockSummaryItem[] = [];

  for (const prod of allProducts) {
    if (prod.type === "SERVICE") {
      // Services do not track inventory
      result.push({
        id: prod.id,
        name: prod.name,
        category: prod.category,
        type: prod.type,
        isArchived: prod.isArchived,
        openingQty: 0,
        purchasedQty: 0,
        soldQty: 0,
        adjustedQty: 0,
        currentQty: 0,
      });
      continue;
    }

    // Query movement sums per movement type
    const movements = await db
      .select({
        type: stockMovements.type,
        totalQty: sql<number>`COALESCE(SUM(${stockMovements.quantity}), 0)`,
      })
      .from(stockMovements)
      .where(eq(stockMovements.productId, prod.id))
      .groupBy(stockMovements.type);

    let purchasedQty = 0;
    let soldQty = 0;
    let adjustedQty = 0;

    for (const mov of movements) {
      const val = Number(mov.totalQty);
      if (mov.type === "PURCHASE") {
        purchasedQty += val;
      } else if (mov.type === "SALE") {
        // Sales are recorded as negative quantities; convert to positive display count
        soldQty += Math.abs(val);
      } else if (mov.type === "ADJUSTMENT") {
        adjustedQty += val;
      }
    }

    // Current stock on hand = PURCHASE (+qty) - SALE (-qty) + ADJUSTMENT (+/- qty)
    const currentQty = purchasedQty - soldQty + adjustedQty;

    result.push({
      id: prod.id,
      name: prod.name,
      category: prod.category,
      type: prod.type,
      isArchived: prod.isArchived,
      openingQty: 0, // baseline opening quantity
      purchasedQty,
      soldQty,
      adjustedQty,
      currentQty,
    });
  }

  return result;
}

export interface StockMovementHistoryItem {
  id: string;
  productId: string;
  productName: string;
  productType: string;
  type: StockMovementType;
  quantity: number;
  referenceId: string | null;
  createdAt: Date;
}

export interface StockHistoryFilter {
  productId?: string;
  type?: "ALL" | StockMovementType;
  search?: string;
}

/**
 * Fetch chronological stock movement history log with product metadata.
 */
export async function getStockMovementHistory(
  filter: StockHistoryFilter = {}
): Promise<StockMovementHistoryItem[]> {
  const conditions = [];

  if (filter.productId) {
    conditions.push(eq(stockMovements.productId, filter.productId));
  }

  if (filter.type && filter.type !== "ALL") {
    conditions.push(eq(stockMovements.type, filter.type));
  }

  if (filter.search && filter.search.trim() !== "") {
    const searchPattern = `%${filter.search.trim()}%`;
    conditions.push(
      or(
        like(products.name, searchPattern),
        like(stockMovements.referenceId, searchPattern)
      )
    );
  }

  const rows = await db
    .select({
      id: stockMovements.id,
      productId: stockMovements.productId,
      productName: products.name,
      productType: products.type,
      type: stockMovements.type,
      quantity: stockMovements.quantity,
      referenceId: stockMovements.referenceId,
      createdAt: stockMovements.createdAt,
    })
    .from(stockMovements)
    .innerJoin(products, eq(stockMovements.productId, products.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(stockMovements.createdAt));

  return rows as StockMovementHistoryItem[];
}
