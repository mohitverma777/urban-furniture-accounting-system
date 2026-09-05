/**
 * src/services/products/index.ts
 *
 * Products Service — business logic for managing furniture goods, services, and combos.
 */

import { db } from "@/db";
import { products, type Product } from "@/db/schema/products";
import { orderItems, orders } from "@/db/schema/orders";
import { getProductStockOnHand } from "@/services/stock";
import { eq, and, like, or, desc } from "drizzle-orm";
import {
  productFormSchema,
  type ProductFormValues,
  type GetProductsFilter,
} from "./schema";

export * from "./schema";

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
      imageUrl: validated.imageUrl || null,
      isArchived: false,
    })
    .returning();

  if (
    (validated.type === "GOODS" || validated.type === "COMBO") &&
    validated.openingStock &&
    validated.openingStock > 0
  ) {
    const { stockMovements } = await import("@/db/schema/stock");
    await db.insert(stockMovements).values({
      productId: newProduct.id,
      type: "ADJUSTMENT",
      quantity: validated.openingStock,
      referenceId: "OPENING-STOCK",
      createdAt: new Date(),
    });
  }

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
  if (validated.imageUrl !== undefined) updates.imageUrl = validated.imageUrl || null;

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

export interface ProductTransactionHistoryItem {
  id: string;
  orderNumber: string;
  orderType: "PO" | "SO";
  invoiceDate: Date | null;
  quantity: number;
  unitPricePaise: number;
  lineTotalPaise: number;
}

export interface ProductDetails {
  product: Product;
  stockOnHand: number;
  transactions: ProductTransactionHistoryItem[];
  summary: {
    totalUnitsSold: number;
    totalUnitsPurchased: number;
    totalSalesRevenuePaise: number;
    marginPercentage: number;
  };
}

/**
 * Fetch detailed product master data, stock on hand, and transaction history.
 */
export async function getProductDetails(id: string): Promise<ProductDetails | null> {
  const product = await getProductById(id);
  if (!product) return null;

  const stockOnHand = await getProductStockOnHand(id);

  // Fetch line items for this product joined with order headers
  const items = await db
    .select({
      id: orderItems.id,
      quantity: orderItems.quantity,
      unitPricePaise: orderItems.unitPrice,
      lineTotalPaise: orderItems.lineTotal,
      orderNumber: orders.orderNumber,
      orderType: orders.type,
      invoiceDate: orders.invoiceDate,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(eq(orderItems.productId, id))
    .orderBy(desc(orders.createdAt));

  let totalUnitsSold = 0;
  let totalUnitsPurchased = 0;
  let totalSalesRevenuePaise = 0;

  items.forEach((item) => {
    if (item.orderType === "SO") {
      totalUnitsSold += item.quantity;
      totalSalesRevenuePaise += item.lineTotalPaise;
    } else if (item.orderType === "PO") {
      totalUnitsPurchased += item.quantity;
    }
  });

  const marginPercentage =
    product.salesPrice > 0
      ? Math.round(((product.salesPrice - product.costPrice) / product.salesPrice) * 100)
      : 0;

  return {
    product,
    stockOnHand,
    transactions: items,
    summary: {
      totalUnitsSold,
      totalUnitsPurchased,
      totalSalesRevenuePaise,
      marginPercentage,
    },
  };
}
