/**
 * src/services/purchases/__tests__/purchases.test.ts
 *
 * Unit tests for Purchase workflow, server-side calculations, Vendor Bill conversion,
 * inbound stock movements (+qty), and double-entry accounting generation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";
import {
  orders,
  orderItems,
  contacts,
  products,
  stockMovements,
  journalEntries,
  journalItems,
  payments,
} from "@/db/schema";
import { createPurchaseOrder, convertOrderToVendorBill, getPurchaseOrderById } from "../index";
import { recordVendorPayment } from "@/services/accounting";
import { getProductStockOnHand } from "@/services/stock";
import { eq, like } from "drizzle-orm";

describe("Purchase Workflow & Server-side Totals Calculation", () => {
  let vendorId: string;
  let customerId: string;
  let goodsProductId: string;
  let serviceProductId: string;
  let archivedProductId: string;

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

    // Create fixture vendor
    const [vend] = await db
      .insert(contacts)
      .values({
        name: "Purchase Test Vendor",
        type: "VENDOR",
        email: "purchase.vendor@test.demo",
      })
      .returning();
    vendorId = vend.id;

    // Create fixture customer (to test vendor type validation error)
    const [cust] = await db
      .insert(contacts)
      .values({
        name: "Customer Only Contact",
        type: "CUSTOMER",
        email: "customer.only@test.demo",
      })
      .returning();
    customerId = cust.id;

    // Create fixture products
    const [goods] = await db
      .insert(products)
      .values({
        name: "Oak Raw Timber",
        type: "GOODS",
        salesPrice: 1500000,
        costPrice: 800000, // ₹8,000 in paise
      })
      .returning();
    goodsProductId = goods.id;

    const [service] = await db
      .insert(products)
      .values({
        name: "Freight & Hauling Service",
        type: "SERVICE",
        salesPrice: 300000,
        costPrice: 150000, // ₹1,500 in paise
      })
      .returning();
    serviceProductId = service.id;

    const [archived] = await db
      .insert(products)
      .values({
        name: "Discontinued Hardware",
        type: "GOODS",
        salesPrice: 500000,
        costPrice: 200000,
        isArchived: true,
      })
      .returning();
    archivedProductId = archived.id;
  });

  it("calculates subtotal, tax, and total strictly server-side for PO", async () => {
    const order = await createPurchaseOrder({
      contactId: vendorId,
      items: [
        {
          productId: goodsProductId,
          quantity: 5,
          unitPrice: 8000, // ₹8,000 input
          taxRate: 18,
        },
        {
          productId: serviceProductId,
          quantity: 2,
          unitPrice: 1500, // ₹1,500 input
          taxRate: 18,
        },
      ],
    });

    expect(order.status).toBe("DRAFT");
    expect(order.type).toBe("PO");

    // Subtotal: (5 * 800000) + (2 * 150000) = 4000000 + 300000 = 4300000 paise (₹43,000)
    expect(order.subtotal).toBe(4300000);

    // Tax: 18% of 4300000 = 774000 paise (₹7,740)
    expect(order.taxAmount).toBe(774000);

    // Total: 4300000 + 774000 = 5074000 paise (₹50,740)
    expect(order.totalAmount).toBe(5074000);
  });

  it("rejects non-vendor contacts for Purchase Orders", async () => {
    await expect(
      createPurchaseOrder({
        contactId: customerId,
        items: [
          {
            productId: goodsProductId,
            quantity: 1,
            unitPrice: 8000,
            taxRate: 18,
          },
        ],
      })
    ).rejects.toThrow("configured as a Vendor");
  });

  it("rejects zero or negative quantities", async () => {
    await expect(
      createPurchaseOrder({
        contactId: vendorId,
        items: [
          {
            productId: goodsProductId,
            quantity: 0,
            unitPrice: 8000,
            taxRate: 18,
          },
        ],
      })
    ).rejects.toThrow();
  });

  it("rejects archived products in new purchase orders", async () => {
    await expect(
      createPurchaseOrder({
        contactId: vendorId,
        items: [
          {
            productId: archivedProductId,
            quantity: 1,
            unitPrice: 2000,
            taxRate: 18,
          },
        ],
      })
    ).rejects.toThrow("archived");
  });

  it("converts DRAFT PO to Vendor Bill, posts double-entry accounting entry, and creates inbound stock (+qty) for GOODS", async () => {
    const draft = await createPurchaseOrder({
      contactId: vendorId,
      items: [
        {
          productId: goodsProductId, // GOODS: creates inbound stock movement (+qty)
          quantity: 10,
          unitPrice: 8000,
          taxRate: 18,
        },
        {
          productId: serviceProductId, // SERVICE: no stock movement
          quantity: 1,
          unitPrice: 1500,
          taxRate: 18,
        },
      ],
    });

    const invoiced = await convertOrderToVendorBill(draft.id);
    expect(invoiced.status).toBe("BILLED");

    // Verify double-entry accounting entry created (Dr Purchase Expense, Cr Creditors)
    const entries = await db
      .select()
      .from(journalEntries)
      .where(like(journalEntries.reference, `%${invoiced.orderNumber}%`));
    expect(entries.length).toBe(1);

    // Verify stock movement created for GOODS (+10), but NOT for SERVICE
    const movements = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.referenceId, draft.id));
    expect(movements.length).toBe(1);
    expect(movements[0].quantity).toBe(10); // Positive quantity increases stock

    const stockOnHand = await getProductStockOnHand(goodsProductId);
    expect(stockOnHand).toBe(10);
  });

  it("registers vendor payment and updates PO status to PARTIAL and PAID", async () => {
    const draft = await createPurchaseOrder({
      contactId: vendorId,
      items: [
        {
          productId: goodsProductId,
          quantity: 1,
          unitPrice: 10000, // ₹10,000 + 18% GST = ₹11,800 (1180000 paise)
          taxRate: 18,
        },
      ],
    });

    await convertOrderToVendorBill(draft.id);

    // Partial Vendor Payment: ₹5,000 (500000 paise)
    await recordVendorPayment({
      orderId: draft.id,
      amount: 500000,
      paymentMethod: "BANK",
      reference: "UTR-VENDOR-1",
    });

    let updated = await getPurchaseOrderById(draft.id);
    expect(updated?.order.status).toBe("PARTIAL");
    expect(updated?.outstandingAmount).toBe(680000); // ₹6,800 remaining

    // Final Vendor Payment: ₹6,800 (680000 paise)
    await recordVendorPayment({
      orderId: draft.id,
      amount: 680000,
      paymentMethod: "BANK",
      reference: "UTR-VENDOR-2",
    });

    updated = await getPurchaseOrderById(draft.id);
    expect(updated?.order.status).toBe("PAID");
    expect(updated?.outstandingAmount).toBe(0);
  });
});
