/**
 * src/services/reports/__tests__/balance-sheet-extended.test.ts
 *
 * Extended Unit Tests for the Balance Sheet Report Service.
 *
 * Source of Truth: The balance sheet always includes ALL active Chart of Account
 * rows (even with 0 balance), but AMOUNTS should be 0 when no transactions exist.
 *
 * Covers:
 *   1. Empty state — zero total amounts (rows still present from CoA)
 *   2. Assets increase with debit entries to bank account
 *   3. Accounting equation: Assets = Liabilities + Capital (always holds)
 *   4. asOfDate filtering — only counts transactions up to that date
 *   5. Creditors liability reflects vendor bills
 *   6. Current period profit is included in Capital section
 *   7. totalBank is positive after a bank receipt
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
import { getBalanceSheetReport } from "../balance-sheet";
import { createJournalEntry } from "@/services/accounting";

describe("Balance Sheet Report — Extended Tests", () => {
  let salesJournalId: string;
  let bankJournalId: string;
  let bankAccountId: string;
  let debtorsAccountId: string;
  let salesAccountId: string;
  let creditorsAccountId: string;
  let purchaseExpenseAccountId: string;

  beforeEach(async () => {
    await db.delete(payments);
    await db.delete(stockMovements);
    await db.delete(orderItems);
    await db.delete(orders);
    await db.delete(journalItems);
    await db.delete(journalEntries);

    const [sj] = await db.select().from(journals).where(eq(journals.type, "SALES"));
    salesJournalId = sj.id;

    const [bj] = await db.select().from(journals).where(eq(journals.type, "BANK"));
    bankJournalId = bj.id;

    const [bankAcc] = await db.select().from(accounts).where(eq(accounts.code, "1010"));
    bankAccountId = bankAcc.id;

    const [debtors] = await db.select().from(accounts).where(eq(accounts.code, "1100"));
    debtorsAccountId = debtors.id;

    const [sales] = await db.select().from(accounts).where(eq(accounts.code, "4000"));
    salesAccountId = sales.id;

    const [creditors] = await db.select().from(accounts).where(eq(accounts.code, "2000"));
    creditorsAccountId = creditors.id;

    const [peAcc] = await db.select().from(accounts).where(eq(accounts.code, "5000"));
    purchaseExpenseAccountId = peAcc.id;
  });

  it("returns zero total amounts with no transactions (CoA rows still present)", async () => {
    const report = await getBalanceSheetReport();

    // Even with no transactions, amounts must be zero
    expect(report.totalAssets).toBe(0);
    expect(report.totalLiabilities).toBe(0);
    expect(report.currentPeriodProfit).toBe(0);
    expect(report.totalCapital).toBe(0);

    // hasData depends on journal entries
    expect(report.hasData).toBe(false);
    expect(report.postedEntriesCount).toBe(0);
  });

  it("increases totalBank when a bank receipt is recorded (debit to bank account)", async () => {
    // Customer pays ₹8,000 cash to bank — Bank DR, Debtors CR
    await createJournalEntry({
      journalId: bankJournalId,
      date: new Date("2026-03-10"),
      reference: "RCPT-BS-001",
      description: "Customer receipt",
      lines: [
        { accountId: bankAccountId, debit: 800000, credit: 0 },
        { accountId: debtorsAccountId, debit: 0, credit: 800000 },
      ],
    });

    const report = await getBalanceSheetReport();

    // Bank account should have positive balance (debit-normal asset)
    expect(report.totalBank).toBeGreaterThan(0);
    expect(report.hasData).toBe(true);
  });

  it("satisfies the accounting equation: Assets = Liabilities + Capital", async () => {
    // Revenue sale: Debtors DR, Sales CR
    await createJournalEntry({
      journalId: salesJournalId,
      date: new Date("2026-04-01"),
      reference: "INV-BS-EQ-001",
      description: "Sales invoice",
      lines: [
        { accountId: debtorsAccountId, debit: 1000000, credit: 0 },
        { accountId: salesAccountId, debit: 0, credit: 1000000 },
      ],
    });

    // Expense: PurchaseExpense DR, Bank CR
    await createJournalEntry({
      journalId: bankJournalId,
      date: new Date("2026-04-05"),
      reference: "EXP-BS-EQ-001",
      description: "Purchase expense",
      lines: [
        { accountId: purchaseExpenseAccountId, debit: 300000, credit: 0 },
        { accountId: bankAccountId, debit: 0, credit: 300000 },
      ],
    });

    const report = await getBalanceSheetReport();

    // Core accounting equation: Assets ≈ Liabilities + Capital
    // The difference should be 0 (or nearly 0) and isBalanced = true
    expect(report.isBalanced).toBe(true);
    expect(Math.abs(report.difference)).toBeLessThanOrEqual(1); // rounding tolerance
  });

  it("asOfDate filter: debtors total excludes transactions AFTER the cutoff date", async () => {
    // Transaction on Jan 1 — ₹5,000
    await createJournalEntry({
      journalId: salesJournalId,
      date: new Date("2026-01-01"),
      reference: "INV-BS-DATE-001",
      description: "Jan revenue",
      lines: [
        { accountId: debtorsAccountId, debit: 500000, credit: 0 },
        { accountId: salesAccountId, debit: 0, credit: 500000 },
      ],
    });

    // Transaction on June 1 — ₹20,000 (excluded when asOfDate=2026-03-31)
    await createJournalEntry({
      journalId: salesJournalId,
      date: new Date("2026-06-01"),
      reference: "INV-BS-DATE-002",
      description: "June revenue",
      lines: [
        { accountId: debtorsAccountId, debit: 2000000, credit: 0 },
        { accountId: salesAccountId, debit: 0, credit: 2000000 },
      ],
    });

    const reportQ1 = await getBalanceSheetReport({ asOfDate: "2026-03-31" });
    const reportFull = await getBalanceSheetReport();

    // Full report should have larger debtors balance
    expect(reportFull.totalDebtors).toBeGreaterThan(reportQ1.totalDebtors);

    // Q1 should only reflect the Jan entry
    expect(reportQ1.totalDebtors).toBe(500000);
  });

  it("reflects creditors liability when vendor bills are posted", async () => {
    // Vendor bill: PurchaseExpense DR, Creditors CR (liability increases)
    await createJournalEntry({
      journalId: bankJournalId,
      date: new Date("2026-05-10"),
      reference: "BILL-BS-001",
      description: "Vendor bill liability",
      lines: [
        { accountId: purchaseExpenseAccountId, debit: 600000, credit: 0 },
        { accountId: creditorsAccountId, debit: 0, credit: 600000 },
      ],
    });

    const report = await getBalanceSheetReport();

    expect(report.totalCreditors).toBeGreaterThan(0);
    expect(report.totalLiabilities).toBeGreaterThan(0);
  });

  it("currentPeriodProfit is positive when revenues exceed expenses", async () => {
    // Pure revenue — no expenses
    await createJournalEntry({
      journalId: salesJournalId,
      date: new Date("2026-06-01"),
      reference: "INV-PROFIT-001",
      description: "Revenue for profit test",
      lines: [
        { accountId: debtorsAccountId, debit: 1500000, credit: 0 },
        { accountId: salesAccountId, debit: 0, credit: 1500000 },
      ],
    });

    const report = await getBalanceSheetReport();

    // Net profit = revenue (₹15,000) - expenses (₹0) = ₹15,000
    expect(report.currentPeriodProfit).toBeGreaterThan(0);
    expect(report.totalCapital).toBeGreaterThanOrEqual(report.currentPeriodProfit);
  });

  it("currentPeriodProfit is zero when revenues equal expenses", async () => {
    // Revenue = ₹10,000
    await createJournalEntry({
      journalId: salesJournalId,
      date: new Date("2026-07-01"),
      reference: "INV-BREAK-001",
      description: "Revenue",
      lines: [
        { accountId: debtorsAccountId, debit: 1000000, credit: 0 },
        { accountId: salesAccountId, debit: 0, credit: 1000000 },
      ],
    });

    // Expense = ₹10,000
    await createJournalEntry({
      journalId: bankJournalId,
      date: new Date("2026-07-02"),
      reference: "EXP-BREAK-001",
      description: "Expense",
      lines: [
        { accountId: purchaseExpenseAccountId, debit: 1000000, credit: 0 },
        { accountId: bankAccountId, debit: 0, credit: 1000000 },
      ],
    });

    const report = await getBalanceSheetReport();

    // Break-even: profit should be 0
    expect(report.currentPeriodProfit).toBe(0);
  });

  it("postedEntriesCount correctly reflects the number of distinct journal entries", async () => {
    expect((await getBalanceSheetReport()).postedEntriesCount).toBe(0);

    // Post one entry
    await createJournalEntry({
      journalId: salesJournalId,
      date: new Date("2026-08-01"),
      reference: "CNT-001",
      description: "Entry 1",
      lines: [
        { accountId: debtorsAccountId, debit: 100000, credit: 0 },
        { accountId: salesAccountId, debit: 0, credit: 100000 },
      ],
    });

    expect((await getBalanceSheetReport()).postedEntriesCount).toBe(1);

    // Post a second entry
    await createJournalEntry({
      journalId: bankJournalId,
      date: new Date("2026-08-05"),
      reference: "CNT-002",
      description: "Entry 2",
      lines: [
        { accountId: bankAccountId, debit: 50000, credit: 0 },
        { accountId: debtorsAccountId, debit: 0, credit: 50000 },
      ],
    });

    expect((await getBalanceSheetReport()).postedEntriesCount).toBe(2);
  });
});
