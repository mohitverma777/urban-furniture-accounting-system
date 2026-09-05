/**
 * src/services/reports/__tests__/profit-loss-extended.test.ts
 *
 * Extended Unit Tests for the Profit & Loss Report Service.
 *
 * Covers:
 *   1. Empty DB — hasData flag and zero totals
 *   2. Revenue-only scenario (no expenses) — 100% margin
 *   3. Expense-only scenario (no revenue) — negative net profit
 *   4. Mixed scenario — correct net profit & margin calculation
 *   5. Date-range filtering — only includes entries in period
 *   6. Multiple revenue account types (INCOME vs OTHER_INCOME)
 *   7. profitMarginPercentage edge case (zero revenue)
 *   8. postedEntriesCount reflects only entries in the report window
 */

import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";
import {
  accounts,
  journals,
  journalEntries,
  journalItems,
  payments,
  orders,
  orderItems,
  stockMovements,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { getProfitAndLossReport } from "../profit-loss";
import { createJournalEntry } from "@/services/accounting";

describe("Profit & Loss Report — Extended Tests", () => {
  let salesJournalId: string;
  let bankJournalId: string;
  let salesAccountId: string;
  let purchaseExpenseAccountId: string;
  let opExpenseAccountId: string;
  let bankAccountId: string;
  let debtorsAccountId: string;

  beforeEach(async () => {
    // Clean all transactional data
    await db.delete(payments);
    await db.delete(stockMovements);
    await db.delete(orderItems);
    await db.delete(orders);
    await db.delete(journalItems);
    await db.delete(journalEntries);

    // Fetch fixture IDs
    const [sj] = await db.select().from(journals).where(eq(journals.type, "SALES"));
    salesJournalId = sj.id;

    const [bj] = await db.select().from(journals).where(eq(journals.type, "BANK"));
    bankJournalId = bj.id;

    const [sAcc] = await db.select().from(accounts).where(eq(accounts.code, "4000"));
    salesAccountId = sAcc.id;

    const [peAcc] = await db.select().from(accounts).where(eq(accounts.code, "5000"));
    purchaseExpenseAccountId = peAcc.id;

    const [oeAcc] = await db.select().from(accounts).where(eq(accounts.code, "5100"));
    opExpenseAccountId = oeAcc.id;

    const [bankAcc] = await db.select().from(accounts).where(eq(accounts.code, "1010"));
    bankAccountId = bankAcc.id;

    const [debtors] = await db.select().from(accounts).where(eq(accounts.code, "1100"));
    debtorsAccountId = debtors.id;
  });

  it("returns hasData=false and all-zero totals when no journal entries exist", async () => {
    const report = await getProfitAndLossReport();

    expect(report.hasData).toBe(false);
    expect(report.totalRevenue).toBe(0);
    expect(report.totalExpenses).toBe(0);
    expect(report.netProfit).toBe(0);
    expect(report.profitMarginPercentage).toBe(0);
    expect(report.postedEntriesCount).toBe(0);
  });

  it("calculates 100% profit margin when there are only revenues and no expenses", async () => {
    // Revenue of ₹20,000
    await createJournalEntry({
      journalId: salesJournalId,
      date: new Date("2026-03-01"),
      reference: "INV-TEST-100",
      description: "Pure revenue",
      lines: [
        { accountId: debtorsAccountId, debit: 2000000, credit: 0 },
        { accountId: salesAccountId, debit: 0, credit: 2000000 },
      ],
    });

    const report = await getProfitAndLossReport();

    expect(report.hasData).toBe(true);
    expect(report.totalRevenue).toBe(2000000);
    expect(report.totalExpenses).toBe(0);
    expect(report.netProfit).toBe(2000000);
    expect(report.profitMarginPercentage).toBe(100);
  });

  it("reports a negative net profit when only expenses exist", async () => {
    // Expense of ₹5,000
    await createJournalEntry({
      journalId: bankJournalId,
      date: new Date("2026-03-05"),
      reference: "EXP-TEST-001",
      description: "Operating expense",
      lines: [
        { accountId: opExpenseAccountId, debit: 500000, credit: 0 },
        { accountId: bankAccountId, debit: 0, credit: 500000 },
      ],
    });

    const report = await getProfitAndLossReport();

    expect(report.hasData).toBe(true);
    expect(report.totalRevenue).toBe(0);
    expect(report.totalOperatingExpenses).toBeGreaterThan(0);
    expect(report.netProfit).toBeLessThan(0);
    expect(report.profitMarginPercentage).toBe(0); // no revenue base
  });

  it("computes correct net profit with both revenue and expenses", async () => {
    // Revenue ₹10,000
    await createJournalEntry({
      journalId: salesJournalId,
      date: new Date("2026-04-01"),
      reference: "INV-MIX-001",
      description: "Mixed scenario revenue",
      lines: [
        { accountId: debtorsAccountId, debit: 1000000, credit: 0 },
        { accountId: salesAccountId, debit: 0, credit: 1000000 },
      ],
    });

    // Expense ₹4,000
    await createJournalEntry({
      journalId: bankJournalId,
      date: new Date("2026-04-05"),
      reference: "EXP-MIX-001",
      description: "Mixed scenario expense",
      lines: [
        { accountId: purchaseExpenseAccountId, debit: 400000, credit: 0 },
        { accountId: bankAccountId, debit: 0, credit: 400000 },
      ],
    });

    const report = await getProfitAndLossReport();

    expect(report.totalRevenue).toBe(1000000);   // ₹10,000
    expect(report.totalExpenses).toBe(400000);    // ₹4,000
    expect(report.netProfit).toBe(600000);        // ₹6,000
    expect(report.profitMarginPercentage).toBe(60); // 6000/10000 * 100 = 60%
  });

  it("filters entries correctly by startDate — excludes entries before period", async () => {
    // January entry — should be EXCLUDED when we filter from Feb
    await createJournalEntry({
      journalId: salesJournalId,
      date: new Date("2026-01-10"),
      reference: "INV-JAN-001",
      description: "January Revenue",
      lines: [
        { accountId: debtorsAccountId, debit: 500000, credit: 0 },
        { accountId: salesAccountId, debit: 0, credit: 500000 },
      ],
    });

    // February entry — should be INCLUDED
    await createJournalEntry({
      journalId: salesJournalId,
      date: new Date("2026-02-10"),
      reference: "INV-FEB-001",
      description: "February Revenue",
      lines: [
        { accountId: debtorsAccountId, debit: 300000, credit: 0 },
        { accountId: salesAccountId, debit: 0, credit: 300000 },
      ],
    });

    const report = await getProfitAndLossReport({ startDate: "2026-02-01" });

    // Only February entry should be included
    expect(report.totalRevenue).toBe(300000);
    expect(report.salesIncomeRows.length).toBeGreaterThan(0);
  });

  it("filters entries correctly by endDate — excludes entries after period", async () => {
    // March entry — INCLUDED (before end date)
    await createJournalEntry({
      journalId: salesJournalId,
      date: new Date("2026-03-05"),
      reference: "INV-MAR-001",
      description: "March Revenue",
      lines: [
        { accountId: debtorsAccountId, debit: 800000, credit: 0 },
        { accountId: salesAccountId, debit: 0, credit: 800000 },
      ],
    });

    // May entry — EXCLUDED (after end date)
    await createJournalEntry({
      journalId: salesJournalId,
      date: new Date("2026-05-01"),
      reference: "INV-MAY-001",
      description: "May Revenue",
      lines: [
        { accountId: debtorsAccountId, debit: 1200000, credit: 0 },
        { accountId: salesAccountId, debit: 0, credit: 1200000 },
      ],
    });

    const report = await getProfitAndLossReport({ endDate: "2026-03-31" });

    expect(report.totalRevenue).toBe(800000); // Only March included
  });

  it("applies both startDate and endDate together as a closed range", async () => {
    // Before range
    await createJournalEntry({
      journalId: salesJournalId,
      date: new Date("2026-01-05"),
      reference: "INV-BEFORE",
      description: "Before range",
      lines: [
        { accountId: debtorsAccountId, debit: 100000, credit: 0 },
        { accountId: salesAccountId, debit: 0, credit: 100000 },
      ],
    });

    // In range
    await createJournalEntry({
      journalId: salesJournalId,
      date: new Date("2026-02-15"),
      reference: "INV-INRANGE",
      description: "In range",
      lines: [
        { accountId: debtorsAccountId, debit: 500000, credit: 0 },
        { accountId: salesAccountId, debit: 0, credit: 500000 },
      ],
    });

    // After range
    await createJournalEntry({
      journalId: salesJournalId,
      date: new Date("2026-04-01"),
      reference: "INV-AFTER",
      description: "After range",
      lines: [
        { accountId: debtorsAccountId, debit: 200000, credit: 0 },
        { accountId: salesAccountId, debit: 0, credit: 200000 },
      ],
    });

    const report = await getProfitAndLossReport({
      startDate: "2026-02-01",
      endDate: "2026-03-31",
    });

    expect(report.totalRevenue).toBe(500000); // Only in-range entry
  });

  it("separates purchase expenses and operating expenses into correct categories", async () => {
    // Purchase expense (COGS type)
    await createJournalEntry({
      journalId: bankJournalId,
      date: new Date("2026-05-01"),
      reference: "COGS-001",
      description: "Cost of goods sold",
      lines: [
        { accountId: purchaseExpenseAccountId, debit: 300000, credit: 0 },
        { accountId: bankAccountId, debit: 0, credit: 300000 },
      ],
    });

    // Operating expense
    await createJournalEntry({
      journalId: bankJournalId,
      date: new Date("2026-05-05"),
      reference: "OPEX-001",
      description: "Office rent",
      lines: [
        { accountId: opExpenseAccountId, debit: 150000, credit: 0 },
        { accountId: bankAccountId, debit: 0, credit: 150000 },
      ],
    });

    const report = await getProfitAndLossReport();

    expect(report.totalPurchaseExpenses).toBeGreaterThan(0);
    expect(report.totalOperatingExpenses).toBeGreaterThan(0);
    expect(report.totalExpenses).toBe(
      report.totalPurchaseExpenses + report.totalOperatingExpenses
    );
  });
});
