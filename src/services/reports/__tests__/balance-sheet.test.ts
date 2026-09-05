/**
 * src/services/reports/__tests__/balance-sheet.test.ts
 *
 * Unit tests for Balance Sheet report computation, accounting equation
 * validation (Assets = Liabilities + Capital), group balances, and date snapshots.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";
import {
  journalEntries,
  journalItems,
  journals,
  accounts,
  contacts,
  products,
  orders,
  orderItems,
  payments,
  stockMovements,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { getBalanceSheetReport } from "../balance-sheet";
import { createSalesOrder, convertOrderToInvoice } from "@/services/sales";
import { createPurchaseOrder, convertOrderToVendorBill } from "@/services/purchases";
import { recordCustomerPayment } from "@/services/accounting";

describe("Balance Sheet Report Service", () => {
  let customerId: string;
  let vendorId: string;
  let productId: string;

  beforeEach(async () => {
    // Teardown test data in clean order
    await db.delete(payments);
    await db.delete(journalItems);
    await db.delete(journalEntries);
    await db.delete(stockMovements);
    await db.delete(orderItems);
    await db.delete(orders);

    const [cust] = await db
      .insert(contacts)
      .values({ name: "BS Customer", type: "CUSTOMER", email: "bs.cust@test.demo" })
      .returning();
    customerId = cust.id;

    const [vend] = await db
      .insert(contacts)
      .values({ name: "BS Vendor", type: "VENDOR", email: "bs.vend@test.demo" })
      .returning();
    vendorId = vend.id;

    const [prod] = await db
      .insert(products)
      .values({
        name: "BS Test Desk",
        type: "GOODS",
        salesPrice: 20000, // ₹200.00 in Paise
        costPrice: 10000, // ₹100.00 in Paise
      })
      .returning();
    productId = prod.id;
  });

  it("should enforce Assets = Liabilities + Capital on posted operational transactions", async () => {
    // 1. Post a Customer Invoice (Dr Debtors 23600, Cr Sales 20000, Cr Tax 3600)
    const so = await createSalesOrder({
      contactId: customerId,
      items: [{ productId, quantity: 1, unitPrice: 200, taxRate: 18 }],
    });
    await convertOrderToInvoice(so.id);

    // 2. Post a Vendor Bill (Dr Expense 10000, Dr Tax 1800, Cr Creditors 11800)
    const po = await createPurchaseOrder({
      contactId: vendorId,
      items: [{ productId, quantity: 1, unitPrice: 100, taxRate: 18 }],
    });
    await convertOrderToVendorBill(po.id);

    // 3. Query Balance Sheet
    const report = await getBalanceSheetReport();

    expect(report.hasData).toBe(true);
    expect(report.isBalanced).toBe(true);
    expect(report.difference).toBe(0);

    // Verify equation Assets === Liabilities + Capital
    expect(report.totalAssets).toBe(report.totalLiabilitiesAndCapital);

    // Debtors asset = ₹236.00 (23600 Paise)
    expect(report.totalDebtors).toBe(23600);

    // Creditors liability = ₹118.00 (11800 Paise)
    expect(report.totalCreditors).toBe(11800);

    // Current Period Profit = Revenue (20000) - Expense (10000) = 10000 Paise
    expect(report.currentPeriodProfit).toBe(10000);
  });

  it("should record customer payment into Bank asset and reduce Debtors asset while maintaining balance", async () => {
    const so = await createSalesOrder({
      contactId: customerId,
      items: [{ productId, quantity: 1, unitPrice: 200, taxRate: 18 }],
    });
    const inv = await convertOrderToInvoice(so.id);

    // Initial check before payment
    const reportPre = await getBalanceSheetReport();
    expect(reportPre.totalDebtors).toBe(23600);
    expect(reportPre.totalBank).toBe(0);
    expect(reportPre.isBalanced).toBe(true);

    // Receive Payment of 23600 Paise
    await recordCustomerPayment({
      orderId: inv.id,
      amount: 23600,
      paymentMethod: "BANK",
      paymentDate: new Date(),
    });

    const reportPost = await getBalanceSheetReport();
    expect(reportPost.totalDebtors).toBe(0);
    expect(reportPost.totalBank).toBe(23600);
    expect(reportPost.isBalanced).toBe(true);
    expect(reportPost.totalAssets).toBe(reportPost.totalLiabilitiesAndCapital);
  });

  it("should flag isBalanced = false if an unbalanced journal item exists", async () => {
    const [salesJournal] = await db
      .select()
      .from(journals)
      .where(eq(journals.type, "SALES"));
    const [bankAccount] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.code, "1010"));

    // Insert an intentionally unbalanced entry directly into database
    const [entry] = await db
      .insert(journalEntries)
      .values({
        journalId: salesJournal.id,
        date: new Date(),
        reference: "UNBALANCED-TEST",
        description: "Intentionally unbalanced test entry",
      })
      .returning();

    await db.insert(journalItems).values({
      entryId: entry.id,
      accountId: bankAccount.id,
      debit: 5000,
      credit: 0,
    });

    const report = await getBalanceSheetReport();
    expect(report.isBalanced).toBe(false);
    expect(report.difference).not.toBe(0);
  });
});
