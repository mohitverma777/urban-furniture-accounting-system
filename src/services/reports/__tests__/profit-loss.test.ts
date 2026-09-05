/**
 * src/services/reports/__tests__/profit-loss.test.ts
 *
 * Unit tests for Profit & Loss report computation, date filtering,
 * account breakdowns, and Net Profit formula verification.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";
import {
  journalEntries,
  journalItems,
  contacts,
  products,
  orders,
  orderItems,
  payments,
  stockMovements,
} from "@/db/schema";
import { getProfitAndLossReport } from "../profit-loss";
import { createSalesOrder, convertOrderToInvoice } from "@/services/sales";
import { createPurchaseOrder, convertOrderToVendorBill } from "@/services/purchases";


describe("Profit & Loss Report Service", () => {
  let customerId: string;
  let vendorId: string;
  let productId: string;

  beforeEach(async () => {
    // Clean tables in reverse dependency order
    await db.delete(payments);
    await db.delete(journalItems);
    await db.delete(journalEntries);
    await db.delete(stockMovements);
    await db.delete(orderItems);
    await db.delete(orders);

    // Setup fixture customer & vendor
    const [cust] = await db
      .insert(contacts)
      .values({ name: "P&L Customer", type: "CUSTOMER", email: "pnl.cust@test.demo" })
      .returning();
    customerId = cust.id;

    const [vend] = await db
      .insert(contacts)
      .values({ name: "P&L Vendor", type: "VENDOR", email: "pnl.vend@test.demo" })
      .returning();
    vendorId = vend.id;

    const [prod] = await db
      .insert(products)
      .values({
        name: "P&L Office Chair",
        type: "GOODS",
        salesPrice: 10000, // ₹100.00 in Paise
        costPrice: 6000, // ₹60.00 in Paise
        category: "Furniture",
      })
      .returning();
    productId = prod.id;
  });

  it("should calculate Net Profit = Total Revenue - Total Expenses from posted entries", async () => {
    // 1. Create and post Sales Order (2 units @ ₹100 = ₹200 = 20000 Paise)
    const so = await createSalesOrder({
      contactId: customerId,
      items: [{ productId, quantity: 2, unitPrice: 100, taxRate: 18 }],
    });
    await convertOrderToInvoice(so.id);

    // 2. Create and post Purchase Order (1 unit @ ₹60 = ₹60 = 6000 Paise)
    const po = await createPurchaseOrder({
      contactId: vendorId,
      items: [{ productId, quantity: 1, unitPrice: 60, taxRate: 18 }],
    });
    await convertOrderToVendorBill(po.id);


    // 3. Query P&L Report
    const report = await getProfitAndLossReport();

    expect(report.hasData).toBe(true);
    expect(report.postedEntriesCount).toBeGreaterThanOrEqual(2);
    expect(report.totalRevenue).toBe(20000); // ₹200.00 = 20000 Paise
    expect(report.totalPurchaseExpenses).toBe(6000); // ₹60.00 = 6000 Paise
    expect(report.totalExpenses).toBe(6000);
    expect(report.netProfit).toBe(14000); // ₹140.00 (20000 - 6000)
    expect(report.profitMarginPercentage).toBe(70); // (14000 / 20000) * 100
  });

  it("should categorize income and expense rows with correct account codes and names", async () => {
    const so = await createSalesOrder({
      contactId: customerId,
      items: [{ productId, quantity: 5, unitPrice: 100, taxRate: 18 }],
    });
    await convertOrderToInvoice(so.id);

    const report = await getProfitAndLossReport();

    const salesRow = report.salesIncomeRows.find((r) => r.accountCode === "4000");
    expect(salesRow).toBeDefined();
    expect(salesRow?.netAmount).toBe(50000); // 5 * ₹100 = ₹500 = 50000 Paise
    expect(salesRow?.credit).toBe(50000);
  });

  it("should filter report correctly when startDate and endDate are specified", async () => {
    const today = new Date().toISOString().split("T")[0];

    const reportToday = await getProfitAndLossReport({
      startDate: today,
      endDate: today,
    });

    expect(reportToday).toBeDefined();

    // Query for a far past date range (e.g. year 2020)
    const pastReport = await getProfitAndLossReport({
      startDate: "2020-01-01",
      endDate: "2020-01-31",
    });

    expect(pastReport.totalRevenue).toBe(0);
    expect(pastReport.totalExpenses).toBe(0);
    expect(pastReport.netProfit).toBe(0);
  });
});
