/**
 * src/services/products/__tests__/products.test.ts
 *
 * Unit tests for Products business service layer & stock movement rules.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";
import { products } from "@/db/schema/products";
import {
  createProduct,
  updateProduct,
  getProducts,
  getProductById,
  archiveProduct,
  unarchiveProduct,
  canCreateStockMovement,
  isProductAvailableForTransaction,
  productFormSchema,
} from "../index";
import { eq } from "drizzle-orm";

describe("Products Service Layer & Rules", () => {
  beforeEach(async () => {
    // Cleanup test products
    await db.delete(products).where(eq(products.name, "Test Goods Chair"));
    await db.delete(products).where(eq(products.name, "Test Service Install"));
    await db.delete(products).where(eq(products.name, "Test Combo Office"));
  });

  it("validates form schema correctly", () => {
    // Valid product
    const valid = productFormSchema.safeParse({
      name: "Ergonomic Chair",
      type: "GOODS",
      salesPrice: 4999.5,
      costPrice: 2500,
      category: "Seating",
    });
    expect(valid.success).toBe(true);

    // Invalid: missing name
    const invalidName = productFormSchema.safeParse({
      name: "",
      type: "GOODS",
      salesPrice: 100,
      costPrice: 50,
    });
    expect(invalidName.success).toBe(false);

    // Invalid: negative sales price
    const invalidSalesPrice = productFormSchema.safeParse({
      name: "Chair",
      type: "GOODS",
      salesPrice: -10,
      costPrice: 50,
    });
    expect(invalidSalesPrice.success).toBe(false);

    // Invalid: negative cost price
    const invalidCostPrice = productFormSchema.safeParse({
      name: "Chair",
      type: "GOODS",
      salesPrice: 100,
      costPrice: -5,
    });
    expect(invalidCostPrice.success).toBe(false);
  });

  it("creates products and stores prices in paise", async () => {
    const goods = await createProduct({
      name: "Test Goods Chair",
      type: "GOODS",
      salesPrice: 1500.5, // 1500.50 INR -> 150050 paise
      costPrice: 1000, // 1000 INR -> 100000 paise
      category: "Office Furniture",
    });

    expect(goods.id).toBeDefined();
    expect(goods.name).toBe("Test Goods Chair");
    expect(goods.type).toBe("GOODS");
    expect(goods.salesPrice).toBe(150050);
    expect(goods.costPrice).toBe(100000);
    expect(goods.isArchived).toBe(false);

    const fetched = await getProductById(goods.id);
    expect(fetched?.name).toBe("Test Goods Chair");
  });

  it("creates service products correctly", async () => {
    const service = await createProduct({
      name: "Test Service Install",
      type: "SERVICE",
      salesPrice: 500,
      costPrice: 0,
      category: "Installation",
    });

    expect(service.type).toBe("SERVICE");
    expect(service.salesPrice).toBe(50000);
  });

  it("edits product details", async () => {
    const goods = await createProduct({
      name: "Test Goods Chair",
      type: "GOODS",
      salesPrice: 1000,
      costPrice: 500,
    });

    const updated = await updateProduct(goods.id, {
      salesPrice: 1200,
      category: "Premium Executive",
    });

    expect(updated.salesPrice).toBe(120000);
    expect(updated.category).toBe("Premium Executive");
  });

  it("filters products by search term, type, and category", async () => {
    await createProduct({
      name: "Test Goods Chair",
      type: "GOODS",
      salesPrice: 1000,
      costPrice: 500,
      category: "Chairs",
    });

    await createProduct({
      name: "Test Service Install",
      type: "SERVICE",
      salesPrice: 300,
      costPrice: 0,
      category: "Services",
    });

    const searchResult = await getProducts({ search: "Test Goods" });
    expect(searchResult.some((p) => p.name === "Test Goods Chair")).toBe(true);

    const serviceResult = await getProducts({ type: "SERVICE" });
    expect(serviceResult.every((p) => p.type === "SERVICE")).toBe(true);

    const categoryResult = await getProducts({ category: "Chairs" });
    expect(categoryResult.every((p) => p.category === "Chairs")).toBe(true);
  });

  it("archives and restores products", async () => {
    const prod = await createProduct({
      name: "Test Goods Chair",
      type: "GOODS",
      salesPrice: 1000,
      costPrice: 500,
    });

    const archived = await archiveProduct(prod.id);
    expect(archived.isArchived).toBe(true);

    const activeList = await getProducts({ isArchived: false });
    expect(activeList.some((p) => p.id === prod.id)).toBe(false);

    const restored = await unarchiveProduct(prod.id);
    expect(restored.isArchived).toBe(false);
  });

  it("enforces stock movement rules for goods vs services", async () => {
    const goods = await createProduct({
      name: "Test Goods Chair",
      type: "GOODS",
      salesPrice: 1000,
      costPrice: 500,
    });

    const service = await createProduct({
      name: "Test Service Install",
      type: "SERVICE",
      salesPrice: 500,
      costPrice: 0,
    });

    const combo = await createProduct({
      name: "Test Combo Office",
      type: "COMBO",
      salesPrice: 5000,
      costPrice: 3000,
    });

    // Rule checks
    expect(canCreateStockMovement(goods)).toBe(true);
    expect(canCreateStockMovement(combo)).toBe(true);
    expect(canCreateStockMovement(service)).toBe(false);

    expect(isProductAvailableForTransaction(goods)).toBe(true);

    // Archive rule check
    const archivedGoods = await archiveProduct(goods.id);
    expect(canCreateStockMovement(archivedGoods)).toBe(false);
    expect(isProductAvailableForTransaction(archivedGoods)).toBe(false);
  });
});
