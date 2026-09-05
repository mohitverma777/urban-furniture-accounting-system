/**
 * src/services/stock/__tests__/stock-module.test.ts
 *
 * Unit tests for Stock / Inventory module:
 *   - Per-product stock breakdown (purchased, sold, adjustments, current stock-on-hand)
 *   - Inbound purchase stock increases (+qty)
 *   - Outbound sales stock decreases (-qty)
 *   - Manual stock adjustments (+ and -)
 *   - Service product inventory skipping
 *   - Stock movement history log querying
 */

import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";
import {
  products,
  stockMovements,
  contacts,
  orders,
  orderItems,
  journalEntries,
  journalItems,
  payments,
} from "@/db/schema";
import { recordStockMovement, getProductStockSummaries, getStockMovementHistory } from "../index";
import { createSalesOrder, convertOrderToInvoice } from "@/services/sales";
import { createPurchaseOrder, convertOrderToVendorBill } from "@/services/purchases";

describe("Stock / Inventory Module & Dynamic Balance Derivation", () => {
  let customerId: string;
  let vendorId: string;
  let goodsProductId: string;
  let serviceProductId: string;

  beforeEach(async () => {
    // Cleanup previous test data in correct FK dependency order
    await db.delete(payments);
    await db.delete(journalItems);
    await db.delete(journalEntries);
    await db.delete(stockMovements);
    await db.delete(orderItems);
    await db.delete(orders);
    await db.delete(products);
    await db.delete(contacts);

    // Create fixture contacts
    const [cust] = await db
      .insert(contacts)
      .values({
        name: "Stock Test Customer",
        type: "CUSTOMER",
        email: "stock.customer@test.demo",
      })
      .returning();
    customerId = cust.id;

    const [vend] = await db
      .insert(contacts)
      .values({
        name: "Stock Test Vendor",
        type: "VENDOR",
        email: "stock.vendor@test.demo",
      })
      .returning();
    vendorId = vend.id;

    // Create fixture products
    const [goods] = await db
      .insert(products)
      .values({
        name: "Modular Conference Table",
        category: "Furniture",
        type: "GOODS",
        salesPrice: 2500000,
        costPrice: 1200000,
      })
      .returning();
    goodsProductId = goods.id;

    const [service] = await db
      .insert(products)
      .values({
        name: "On-site Assembly Service",
        category: "Services",
        type: "SERVICE",
        salesPrice: 500000,
        costPrice: 0,
      })
      .returning();
    serviceProductId = service.id;
  });

  it("derives current stock on hand dynamically from purchase, sales, and adjustment movements", async () => {
    // 1. Purchase 20 units of GOODS (inbound movement: +20)
    const poDraft = await createPurchaseOrder({
      contactId: vendorId,
      items: [
        {
          productId: goodsProductId,
          quantity: 20,
          unitPrice: 12000,
          taxRate: 18,
        },
      ],
    });
    await convertOrderToVendorBill(poDraft.id);

    // 2. Sell 6 units of GOODS (outbound movement: -6)
    const soDraft = await createSalesOrder({
      contactId: customerId,
      items: [
        {
          productId: goodsProductId,
          quantity: 6,
          unitPrice: 25000,
          taxRate: 18,
        },
      ],
    });
    await convertOrderToInvoice(soDraft.id);

    // 3. Post a manual stock adjustment (+2 audit correction)
    await recordStockMovement({
      productId: goodsProductId,
      type: "ADJUSTMENT",
      quantity: 2,
      referenceId: "ADJ: Physical Inventory Audit",
    });

    // 4. Query stock breakdown
    const summaries = await getProductStockSummaries();
    const goodsSummary = summaries.find((s) => s.id === goodsProductId);

    expect(goodsSummary).toBeDefined();
    expect(goodsSummary?.purchasedQty).toBe(20);
    expect(goodsSummary?.soldQty).toBe(6);
    expect(goodsSummary?.adjustedQty).toBe(2);
    // Current Stock = 20 (purchased) - 6 (sold) + 2 (adjustment) = 16 units
    expect(goodsSummary?.currentQty).toBe(16);
  });

  it("skips stock movements for SERVICE products automatically", async () => {
    // 1. Purchase a SERVICE product
    const poDraft = await createPurchaseOrder({
      contactId: vendorId,
      items: [
        {
          productId: serviceProductId,
          quantity: 5,
          unitPrice: 5000,
          taxRate: 18,
        },
      ],
    });
    await convertOrderToVendorBill(poDraft.id);

    // 2. Sell a SERVICE product
    const soDraft = await createSalesOrder({
      contactId: customerId,
      items: [
        {
          productId: serviceProductId,
          quantity: 2,
          unitPrice: 5000,
          taxRate: 18,
        },
      ],
    });
    await convertOrderToInvoice(soDraft.id);

    // 3. Verify 0 stock movements were created for SERVICE
    const history = await getStockMovementHistory({ productId: serviceProductId });
    expect(history.length).toBe(0);

    const summaries = await getProductStockSummaries();
    const serviceSummary = summaries.find((s) => s.id === serviceProductId);

    expect(serviceSummary?.currentQty).toBe(0);
    expect(serviceSummary?.purchasedQty).toBe(0);
    expect(serviceSummary?.soldQty).toBe(0);
  });

  it("queries stock movement history with source references and filtering", async () => {
    // Create purchase
    const poDraft = await createPurchaseOrder({
      contactId: vendorId,
      items: [
        {
          productId: goodsProductId,
          quantity: 15,
          unitPrice: 12000,
          taxRate: 18,
        },
      ],
    });
    await convertOrderToVendorBill(poDraft.id);

    // Manual decrease adjustment (-3 damaged write-off)
    await recordStockMovement({
      productId: goodsProductId,
      type: "ADJUSTMENT",
      quantity: -3,
      referenceId: "ADJ: Damaged goods write-off",
    });

    const history = await getStockMovementHistory({ productId: goodsProductId });
    expect(history.length).toBe(2);

    const purchaseMovement = history.find((h) => h.type === "PURCHASE");
    expect(purchaseMovement).toBeDefined();
    expect(purchaseMovement?.quantity).toBe(15);
    expect(purchaseMovement?.referenceId).toBe(poDraft.id);

    const adjMovement = history.find((h) => h.type === "ADJUSTMENT");
    expect(adjMovement).toBeDefined();
    expect(adjMovement?.quantity).toBe(-3);
    expect(adjMovement?.referenceId).toBe("ADJ: Damaged goods write-off");
  });
});
