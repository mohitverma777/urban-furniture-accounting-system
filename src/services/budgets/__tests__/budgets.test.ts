/**
 * src/services/budgets/__tests__/budgets.test.ts
 *
 * Unit tests for Analytic Accounts, Budget Targets, Ledger-Derived Actuals,
 * Variance Calculations, and Status Thresholds (On Track, Near Limit, Over Budget).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";
import {
  analyticAccounts,
  budgets,
  journalEntries,
  journalItems,
  journals,
  accounts,
  orderItems,
  orders,
  payments,
  stockMovements,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  createAnalyticAccount,
  createBudget,
  getAnalyticAccounts,
  getBudgetReportItems,
} from "../index";
import { createJournalEntry } from "@/services/accounting";

describe("Budgets & Analytic Accounts Service", () => {
  let analyticExpenseId: string;
  let bankAccountId: string;
  let expenseAccountId: string;
  let bankJournalId: string;

  beforeEach(async () => {
    // Teardown test data in clean order
    await db.delete(payments);
    await db.delete(journalItems);
    await db.delete(journalEntries);
    await db.delete(stockMovements);
    await db.delete(orderItems);
    await db.delete(orders);
    await db.delete(budgets);
    await db.delete(analyticAccounts);

    // Setup analytic account cost center
    const aaExp = await createAnalyticAccount({
      name: "Marketing Test",
      type: "EXPENSE",
    });
    analyticExpenseId = aaExp.id;

    await createAnalyticAccount({
      name: "Online Sales Test",
      type: "INCOME",
    });


    // Get fixture accounts and journal
    const [bankAcc] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.code, "1010"));
    bankAccountId = bankAcc.id;

    const [expAcc] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.code, "5100"));
    expenseAccountId = expAcc.id;

    const [jBank] = await db
      .select()
      .from(journals)
      .where(eq(journals.type, "BANK"));
    bankJournalId = jBank.id;
  });

  it("should create analytic accounts and budget targets", async () => {
    const listAA = await getAnalyticAccounts();
    expect(listAA.length).toBe(2);

    const bg = await createBudget({
      name: "Q1 Marketing Budget",
      analyticAccountId: analyticExpenseId,
      plannedAmount: 1000000, // ₹10,000.00
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-03-31"),
    });

    expect(bg.name).toBe("Q1 Marketing Budget");
    expect(bg.plannedAmount).toBe(1000000);
  });

  it("should calculate actual spend from posted journal items tagged with analytic account", async () => {
    // 1. Create Budget of ₹10,000.00 (1000000 Paise)
    await createBudget({
      name: "Q1 Marketing Budget",
      analyticAccountId: analyticExpenseId,
      plannedAmount: 1000000,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-03-31"),
    });

    // 2. Post a journal entry tagging Marketing Cost Center with ₹5,000.00 (500000 Paise)
    await createJournalEntry({
      journalId: bankJournalId,
      date: new Date("2026-01-15"),
      reference: "EXP-MKT-01",
      description: "Ad Campaign Spend",
      lines: [
        {
          accountId: expenseAccountId,
          debit: 500000,
          credit: 0,
          analyticAccountId: analyticExpenseId,
        },
        {
          accountId: bankAccountId,
          debit: 0,
          credit: 500000,
        },
      ],
    });

    // 3. Query Budget Report Items
    const reports = await getBudgetReportItems();
    const item = reports.find((r) => r.analyticAccountId === analyticExpenseId);

    expect(item).toBeDefined();
    expect(item?.actualAmount).toBe(500000); // ₹5,000.00
    expect(item?.varianceAmount).toBe(500000); // ₹5,000.00 remaining
    expect(item?.utilizationPercentage).toBe(50); // 50%
    expect(item?.status).toBe("On Track");
  });

  it("should classify status as Near Limit when utilization > 80% and <= 100%", async () => {
    await createBudget({
      name: "Showroom Budget",
      analyticAccountId: analyticExpenseId,
      plannedAmount: 1000000, // ₹10,000.00
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-03-31"),
    });

    // Post spend of ₹9,000.00 (900000 Paise) -> 90%
    await createJournalEntry({
      journalId: bankJournalId,
      date: new Date("2026-01-20"),
      reference: "EXP-SHOWROOM-01",
      description: "Showroom Repairs",
      lines: [
        {
          accountId: expenseAccountId,
          debit: 900000,
          credit: 0,
          analyticAccountId: analyticExpenseId,
        },
        {
          accountId: bankAccountId,
          debit: 0,
          credit: 900000,
        },
      ],
    });

    const reports = await getBudgetReportItems();
    const item = reports.find((r) => r.analyticAccountId === analyticExpenseId);
    expect(item?.utilizationPercentage).toBe(90);
    expect(item?.status).toBe("Near Limit");
  });

  it("should classify status as Over Budget when utilization > 100%", async () => {
    await createBudget({
      name: "Delivery Budget",
      analyticAccountId: analyticExpenseId,
      plannedAmount: 1000000, // ₹10,000.00
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-03-31"),
    });

    // Post spend of ₹12,000.00 (1200000 Paise) -> 120%
    await createJournalEntry({
      journalId: bankJournalId,
      date: new Date("2026-01-25"),
      reference: "EXP-DELIVERY-01",
      description: "Fuel Expense",
      lines: [
        {
          accountId: expenseAccountId,
          debit: 1200000,
          credit: 0,
          analyticAccountId: analyticExpenseId,
        },
        {
          accountId: bankAccountId,
          debit: 0,
          credit: 1200000,
        },
      ],
    });

    const reports = await getBudgetReportItems();
    const item = reports.find((r) => r.analyticAccountId === analyticExpenseId);
    expect(item?.utilizationPercentage).toBe(120);
    expect(item?.status).toBe("Over Budget");
    expect(item?.varianceAmount).toBe(-200000); // Over by ₹2,000.00
  });
});
