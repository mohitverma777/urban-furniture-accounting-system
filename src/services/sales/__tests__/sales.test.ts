/**
 * src/services/sales/__tests__/sales.test.ts
 *
 * Unit tests for Sales workflow, server-side calculations, invoice conversion,
 * stock movements, and accounting entry generation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";
import { orders, orderItems, contacts, products, stockMovements, journalEntries, journalItems, payments } from "@/db/schema";
import { createSalesOrder, convertOrderToInvoice, getSalesOrderById } from "../index";
import { recordCustomerPayment } from "@/services/accounting";
import { eq, like } from "drizzle-orm";

describe("Sales Workflow & Server-side Totals Calculation", () => {
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
    await db.delete(orders).where(eq(orders.type, "SO"));

    // Create fixture customer
    const [cust] = await db
      .insert(contacts)
      .values({
        name: "Sales Test Customer",
        type: "CUSTOMER",
        email: "sales.customer@test.demo",
      })
      .returning();
    customerId = cust.id;

    // Create fixture products
    const [goods] = await db
      .insert(products)
      .values({
        name: "Test Executive Desk",
        type: "GOODS",
        salesPrice: 1000000, // ₹10,000 in paise
        costPrice: 600000,
      })
      .returning();
    goodsProductId = goods.id;

    const [service] = await db
      .insert(products)
      .values({
        name: "Test Delivery Service",
        type: "SERVICE",
        salesPrice: 200000, // ₹2,000 in paise
        costPrice: 0,
      })
      .returning();
    serviceProductId = service.id;

    const [archived] = await db
      .insert(products)
      .values({
        name: "Test Archived Sofa",
        type: "GOODS",
        salesPrice: 1500000,
        costPrice: 800000,
        isArchived: true,
      })
      .returning();
    archivedProductId = archived.id;
  });

  it("calculates subtotal, tax, and total strictly server-side", async () => {
    const order = await createSalesOrder({
      contactId: customerId,
      items: [
        {
          productId: goodsProductId,
          quantity: 2,
          unitPrice: 10000, // ₹10,000 input
          taxRate: 18,
        },
        {
          productId: serviceProductId,
          quantity: 1,
          unitPrice: 2000, // ₹2,000 input
          taxRate: 18,
        },
      ],
    });

    expect(order.status).toBe("DRAFT");
    expect(order.type).toBe("SO");

    // Subtotal: 2 * 1000000 + 1 * 200000 = 2200000 paise (₹22,000)
    expect(order.subtotal).toBe(2200000);

    // Tax (18%): 18% of 2200000 = 396000 paise (₹3,960)
    expect(order.taxAmount).toBe(396000);

    // Total: 2200000 + 396000 = 2596000 paise (₹25,960)
    expect(order.totalAmount).toBe(2596000);
  });

  it("rejects zero or negative quantities", async () => {
    await expect(
      createSalesOrder({
        contactId: customerId,
        items: [
          {
            productId: goodsProductId,
            quantity: 0,
            unitPrice: 10000,
            taxRate: 18,
          },
        ],
      })
    ).rejects.toThrow();
  });

  it("rejects archived products in new sales orders", async () => {
    await expect(
      createSalesOrder({
        contactId: customerId,
        items: [
          {
            productId: archivedProductId,
            quantity: 1,
            unitPrice: 15000,
            taxRate: 18,
          },
        ],
      })
    ).rejects.toThrow("archived");
  });

  it("converts DRAFT to Customer Invoice, posts accounting entry, and creates stock movements for GOODS", async () => {
    const draft = await createSalesOrder({
      contactId: customerId,
      items: [
        {
          productId: goodsProductId, // GOODS: creates stock movement
          quantity: 3,
          unitPrice: 10000,
          taxRate: 18,
        },
        {
          productId: serviceProductId, // SERVICE: no stock movement
          quantity: 1,
          unitPrice: 2000,
          taxRate: 18,
        },
      ],
    });

    const invoiced = await convertOrderToInvoice(draft.id);
    expect(invoiced.status).toBe("BILLED");

    // Verify double-entry accounting entry created
    const entries = await db
      .select()
      .from(journalEntries)
      .where(like(journalEntries.reference, `%${invoiced.orderNumber}%`));
    expect(entries.length).toBe(1);

    // Verify stock movement created for GOODS (quantity -3), but NOT for SERVICE
    const movements = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.referenceId, draft.id));
    expect(movements.length).toBe(1);
    expect(movements[0].productId).toBe(goodsProductId);
    expect(movements[0].quantity).toBe(-3);
  });

  it("registers customer payment and updates invoice status to PARTIAL and PAID", async () => {
    const draft = await createSalesOrder({
      contactId: customerId,
      items: [
        {
          productId: goodsProductId,
          quantity: 1,
          unitPrice: 10000, // ₹10,000 + 18% tax = ₹11,800 (1180000 paise)
          taxRate: 18,
        },
      ],
    });

    await convertOrderToInvoice(draft.id);

    // Partial Payment: ₹5,000 (500000 paise)
    await recordCustomerPayment({
      orderId: draft.id,
      amount: 500000,
      paymentMethod: "BANK",
      reference: "UTR-PARTIAL-1",
    });

    let updated = await getSalesOrderById(draft.id);
    expect(updated?.order.status).toBe("PARTIAL");
    expect(updated?.outstandingAmount).toBe(680000); // ₹6,800 remaining

    // Final Payment: ₹6,800 (680000 paise)
    await recordCustomerPayment({
      orderId: draft.id,
      amount: 680000,
      paymentMethod: "BANK",
      reference: "UTR-FINAL-1",
    });

    updated = await getSalesOrderById(draft.id);
    expect(updated?.order.status).toBe("PAID");
    expect(updated?.outstandingAmount).toBe(0);
  });
});
