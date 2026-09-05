/**
 * src/services/payments/__tests__/payments.test.ts
 *
 * Unit tests for Central Payments query service, unpaid document resolution,
 * direction & method filtering, overpayment guardrails, and journal entry linkage.
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
import { getPaymentsList, getPaymentById, getUnpaidDocuments } from "../query";
import { createSalesOrder, convertOrderToInvoice } from "@/services/sales";
import { createPurchaseOrder, convertOrderToVendorBill } from "@/services/purchases";
import { recordCustomerPayment, recordVendorPayment } from "@/services/accounting";

describe("Central Payments Service & Guardrails", () => {
  let customerId: string;
  let vendorId: string;
  let productId: string;
  let salesOrderId: string;
  let purchaseOrderId: string;

  beforeEach(async () => {
    // Cleanup previous test data in correct FK dependency order
    await db.delete(payments);
    await db.delete(journalItems);
    await db.delete(journalEntries);
    await db.delete(stockMovements);
    await db.delete(orderItems);
    await db.delete(orders);

    // Create fixture contacts
    const [cust] = await db
      .insert(contacts)
      .values({
        name: "Payments Test Customer",
        type: "CUSTOMER",
        email: "payments.customer@test.demo",
      })
      .returning();
    customerId = cust.id;

    const [vend] = await db
      .insert(contacts)
      .values({
        name: "Payments Test Vendor",
        type: "VENDOR",
        email: "payments.vendor@test.demo",
      })
      .returning();
    vendorId = vend.id;

    // Create fixture product
    const [prod] = await db
      .insert(products)
      .values({
        name: "Standard Ergonomic Chair",
        type: "GOODS",
        salesPrice: 1000000, // ₹10,000 in paise
        costPrice: 500000, // ₹5,000 in paise
      })
      .returning();
    productId = prod.id;

    // Create fixture Sales Order & Billed Invoice
    const soDraft = await createSalesOrder({
      contactId: customerId,
      items: [
        {
          productId,
          quantity: 1,
          unitPrice: 10000, // ₹10,000 + 18% tax = ₹11,800 (1180000 paise)
          taxRate: 18,
        },
      ],
    });
    const soBilled = await convertOrderToInvoice(soDraft.id);
    salesOrderId = soBilled.id;

    // Create fixture Purchase Order & Billed Vendor Bill
    const poDraft = await createPurchaseOrder({
      contactId: vendorId,
      items: [
        {
          productId,
          quantity: 2,
          unitPrice: 5000, // ₹10,000 + 18% tax = ₹11,800 (1180000 paise)
          taxRate: 18,
        },
      ],
    });
    const poBilled = await convertOrderToVendorBill(poDraft.id);
    purchaseOrderId = poBilled.id;
  });

  it("queries unpaid documents with accurate outstanding amounts", async () => {
    const unpaidDocs = await getUnpaidDocuments();
    expect(unpaidDocs.length).toBe(2);

    const soDoc = unpaidDocs.find((d) => d.id === salesOrderId);
    expect(soDoc).toBeDefined();
    expect(soDoc?.type).toBe("SO");
    expect(soDoc?.totalAmount).toBe(1180000);
    expect(soDoc?.totalPaid).toBe(0);
    expect(soDoc?.outstandingAmount).toBe(1180000);

    const poDoc = unpaidDocs.find((d) => d.id === purchaseOrderId);
    expect(poDoc).toBeDefined();
    expect(poDoc?.type).toBe("PO");
    expect(poDoc?.totalAmount).toBe(1180000);
    expect(poDoc?.outstandingAmount).toBe(1180000);
  });

  it("records customer receipt & vendor payment and verifies list filtering", async () => {
    // 1. Record Customer Receipt (Inbound)
    const customerPay = await recordCustomerPayment({
      orderId: salesOrderId,
      amount: 500000, // ₹5,000 partial payment
      paymentMethod: "BANK",
      paymentReference: "UTR-CUST-101",
    });

    // 2. Record Vendor Disbursement (Outbound)
    await recordVendorPayment({
      orderId: purchaseOrderId,
      amount: 1180000, // Full payment
      paymentMethod: "CASH",
      paymentReference: "CASH-VEND-202",
    });

    // Test All Payments
    const allPayments = await getPaymentsList();
    expect(allPayments.length).toBe(2);

    // Test Direction Filter: CUSTOMER (SO)
    const customerPayments = await getPaymentsList({ direction: "CUSTOMER" });
    expect(customerPayments.length).toBe(1);
    expect(customerPayments[0].reference).toBe("UTR-CUST-101");
    expect(customerPayments[0].orderType).toBe("SO");

    // Test Direction Filter: VENDOR (PO)
    const vendorPayments = await getPaymentsList({ direction: "VENDOR" });
    expect(vendorPayments.length).toBe(1);
    expect(vendorPayments[0].reference).toBe("CASH-VEND-202");
    expect(vendorPayments[0].orderType).toBe("PO");

    // Test Method Filter: CASH vs BANK
    const cashPayments = await getPaymentsList({ method: "CASH" });
    expect(cashPayments.length).toBe(1);
    expect(cashPayments[0].paymentMethod).toBe("CASH");

    const bankPayments = await getPaymentsList({ method: "BANK" });
    expect(bankPayments.length).toBe(1);
    expect(bankPayments[0].paymentMethod).toBe("BANK");

    // Test Search Filter
    const searchRes = await getPaymentsList({ search: "UTR-CUST" });
    expect(searchRes.length).toBe(1);
    expect(searchRes[0].id).toBe(customerPay.paymentId);
  });

  it("fetches payment breakdown with linked double-entry journal items", async () => {
    const pay = await recordCustomerPayment({
      orderId: salesOrderId,
      amount: 1180000,
      paymentMethod: "BANK",
      paymentReference: "UTR-FULL-TEST",
    });

    const detail = await getPaymentById(pay.paymentId);
    expect(detail).toBeDefined();
    expect(detail?.amount).toBe(1180000);
    expect(detail?.order.orderNumber).toBeDefined();
    expect(detail?.contact.name).toBe("Payments Test Customer");
    expect(detail?.journalEntry).toBeDefined();
    expect(detail?.journalEntry?.lines.length).toBeGreaterThanOrEqual(2);

    // Verify double-entry balance for payment journal entry
    const totalDebit = detail!.journalEntry!.lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = detail!.journalEntry!.lines.reduce((s, l) => s + l.credit, 0);
    expect(totalDebit).toBe(1180000);
    expect(totalCredit).toBe(1180000);
  });

  it("rejects overpayment and payments for draft documents", async () => {
    // Attempt overpayment > outstanding amount
    await expect(
      recordCustomerPayment({
        orderId: salesOrderId,
        amount: 2000000, // Exceeds 1,180,000 paise
        paymentMethod: "BANK",
      })
    ).rejects.toThrow("Overpayment");

    // Attempt zero payment
    await expect(
      recordCustomerPayment({
        orderId: salesOrderId,
        amount: 0,
        paymentMethod: "BANK",
      })
    ).rejects.toThrow("Invalid payment amount");
  });
});
