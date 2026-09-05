/**
 * src/services/budgets/__tests__/budgets-workflow.test.ts
 *
 * Extended Unit Tests for Budget Workflow State Machine, Budget Revision,
 * and Analytic Account Validation edge cases.
 *
 * Covers:
 *   1. Budget name is required — empty/whitespace rejected
 *   2. Budget planned amount must be > 0
 *   3. Budget start date must be before end date
 *   4. Analytic account must exist for budget creation
 *   5. Duplicate analytic account names are rejected
 *   6. Workflow: DRAFT → CONFIRMED → REVISED → CANCELLED transitions
 *   7. reviseBudget() — marks original as REVISED, creates new CONFIRMED
 *   8. reviseBudget() — inherits dates and analytic account from original
 *   9. Budget status classification boundary conditions (80%, 100%)
 *  10. Multiple budgets on different analytic accounts — independent variance
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
  orders,
  orderItems,
  stockMovements,
  payments,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  createAnalyticAccount,
  createBudget,
  getAnalyticAccounts,
  getBudgetReportItems,
  getBudgetsList,
  reviseBudget,
  updateBudgetWorkflowStatus,
} from "../index";
import { createJournalEntry } from "@/services/accounting";

describe("Budget Workflow & Validation — Extended Tests", () => {
  let analyticExpenseId: string;
  let analyticIncomeId: string;
  let bankAccountId: string;
  let expenseAccountId: string;
  let bankJournalId: string;

  beforeEach(async () => {
    await db.delete(payments);
    await db.delete(journalItems);
    await db.delete(journalEntries);
    await db.delete(stockMovements);
    await db.delete(orderItems);
    await db.delete(orders);
    await db.delete(budgets);
    await db.delete(analyticAccounts);

    // Expense analytic account
    const aaExp = await createAnalyticAccount({
      name: "Operations Test AA",
      type: "EXPENSE",
    });
    analyticExpenseId = aaExp.id;

    // Income analytic account
    const aaInc = await createAnalyticAccount({
      name: "Revenue Test AA",
      type: "INCOME",
    });
    analyticIncomeId = aaInc.id;

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

  // ─────────────────────────────────────────────────────────────────────────
  // Input Validation
  // ─────────────────────────────────────────────────────────────────────────

  describe("createAnalyticAccount() — validation", () => {
    it("rejects empty analytic account name", async () => {
      await expect(
        createAnalyticAccount({ name: "   ", type: "EXPENSE" })
      ).rejects.toThrow("Analytic account name is required");
    });

    it("rejects duplicate analytic account name (case-sensitive)", async () => {
      await expect(
        createAnalyticAccount({ name: "Operations Test AA", type: "EXPENSE" })
      ).rejects.toThrow("already exists");
    });

    it("creates both EXPENSE and INCOME type analytic accounts", async () => {
      const allAA = await getAnalyticAccounts();
      const types = allAA.map((a) => a.type);
      expect(types).toContain("EXPENSE");
      expect(types).toContain("INCOME");
    });
  });

  describe("createBudget() — validation", () => {
    it("rejects empty budget name", async () => {
      await expect(
        createBudget({
          name: "  ",
          analyticAccountId: analyticExpenseId,
          plannedAmount: 100000,
          startDate: new Date("2026-01-01"),
          endDate: new Date("2026-03-31"),
        })
      ).rejects.toThrow("Budget name is required");
    });

    it("rejects zero planned amount", async () => {
      await expect(
        createBudget({
          name: "Zero Amount Budget",
          analyticAccountId: analyticExpenseId,
          plannedAmount: 0,
          startDate: new Date("2026-01-01"),
          endDate: new Date("2026-03-31"),
        })
      ).rejects.toThrow("must be greater than zero");
    });

    it("rejects negative planned amount", async () => {
      await expect(
        createBudget({
          name: "Negative Budget",
          analyticAccountId: analyticExpenseId,
          plannedAmount: -50000,
          startDate: new Date("2026-01-01"),
          endDate: new Date("2026-03-31"),
        })
      ).rejects.toThrow("must be greater than zero");
    });

    it("rejects when startDate >= endDate", async () => {
      await expect(
        createBudget({
          name: "Invalid Date Budget",
          analyticAccountId: analyticExpenseId,
          plannedAmount: 100000,
          startDate: new Date("2026-06-01"),
          endDate: new Date("2026-01-01"),
        })
      ).rejects.toThrow("start date must be earlier");
    });

    it("rejects when startDate === endDate", async () => {
      await expect(
        createBudget({
          name: "Same Date Budget",
          analyticAccountId: analyticExpenseId,
          plannedAmount: 100000,
          startDate: new Date("2026-03-01"),
          endDate: new Date("2026-03-01"),
        })
      ).rejects.toThrow("start date must be earlier");
    });

    it("rejects non-existent analytic account ID", async () => {
      await expect(
        createBudget({
          name: "Orphan Budget",
          analyticAccountId: "non-existent-id-xyz",
          plannedAmount: 100000,
          startDate: new Date("2026-01-01"),
          endDate: new Date("2026-12-31"),
        })
      ).rejects.toThrow("not found");
    });

    it("creates budget with DRAFT status by default", async () => {
      const budget = await createBudget({
        name: "Default Draft Budget",
        analyticAccountId: analyticExpenseId,
        plannedAmount: 500000,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-06-30"),
      });

      expect(budget.status).toBe("DRAFT");
    });

    it("stores responsiblePerson when provided", async () => {
      const budget = await createBudget({
        name: "Assigned Budget",
        analyticAccountId: analyticExpenseId,
        plannedAmount: 200000,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-03-31"),
        responsiblePerson: "Mohit Sharma",
      });

      expect(budget.responsiblePerson).toBe("Mohit Sharma");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Workflow Status Transitions
  // ─────────────────────────────────────────────────────────────────────────

  describe("updateBudgetWorkflowStatus() — state machine", () => {
    it("transitions DRAFT → CONFIRMED", async () => {
      const b = await createBudget({
        name: "Transition Budget",
        analyticAccountId: analyticExpenseId,
        plannedAmount: 500000,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      });

      await updateBudgetWorkflowStatus(b.id, "CONFIRMED");

      const [updated] = await db.select().from(budgets).where(eq(budgets.id, b.id));
      expect(updated.status).toBe("CONFIRMED");
    });

    it("transitions CONFIRMED → CANCELLED", async () => {
      const b = await createBudget({
        name: "Cancel Budget",
        analyticAccountId: analyticExpenseId,
        plannedAmount: 500000,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      });

      await updateBudgetWorkflowStatus(b.id, "CONFIRMED");
      await updateBudgetWorkflowStatus(b.id, "CANCELLED");

      const [updated] = await db.select().from(budgets).where(eq(budgets.id, b.id));
      expect(updated.status).toBe("CANCELLED");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Budget Revision
  // ─────────────────────────────────────────────────────────────────────────

  describe("reviseBudget()", () => {
    it("marks original as REVISED and creates a new CONFIRMED budget", async () => {
      const original = await createBudget({
        name: "Q2 Operations Budget",
        analyticAccountId: analyticExpenseId,
        plannedAmount: 1000000,
        startDate: new Date("2026-04-01"),
        endDate: new Date("2026-06-30"),
      });

      const revised = await reviseBudget(original.id, {
        plannedAmount: 1500000,
        newName: "Q2 Operations Budget v2",
      });

      // Original should be REVISED
      const [orig] = await db.select().from(budgets).where(eq(budgets.id, original.id));
      expect(orig.status).toBe("REVISED");

      // Revised should be CONFIRMED
      expect(revised.status).toBe("CONFIRMED");
      expect(revised.name).toBe("Q2 Operations Budget v2");
      expect(revised.plannedAmount).toBe(1500000);
      expect(revised.revisionOfId).toBe(original.id);
    });

    it("inherits dates and analytic account from original budget", async () => {
      const original = await createBudget({
        name: "Inherited Budget",
        analyticAccountId: analyticExpenseId,
        plannedAmount: 800000,
        startDate: new Date("2026-07-01"),
        endDate: new Date("2026-09-30"),
      });

      const revised = await reviseBudget(original.id, { plannedAmount: 1000000 });

      expect(revised.analyticAccountId).toBe(analyticExpenseId);
      expect(new Date(revised.startDate).toDateString()).toBe(
        new Date("2026-07-01").toDateString()
      );
      expect(new Date(revised.endDate).toDateString()).toBe(
        new Date("2026-09-30").toDateString()
      );
    });

    it("auto-generates a '(Revised)' suffix when no new name provided", async () => {
      const original = await createBudget({
        name: "Auto Renamed Budget",
        analyticAccountId: analyticExpenseId,
        plannedAmount: 600000,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-03-31"),
      });

      const revised = await reviseBudget(original.id, { plannedAmount: 700000 });
      expect(revised.name).toBe("Auto Renamed Budget (Revised)");
    });

    it("throws when original budget ID does not exist", async () => {
      await expect(
        reviseBudget("non-existent-budget-id", { plannedAmount: 500000 })
      ).rejects.toThrow("not found");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Budget Status Boundary Conditions
  // ─────────────────────────────────────────────────────────────────────────

  describe("Budget status boundary conditions (0%, 80%, 100%, 120%)", () => {
    it("shows 0% utilization and 'On Track' with no spend", async () => {
      await createBudget({
        name: "Zero Spend Budget",
        analyticAccountId: analyticExpenseId,
        plannedAmount: 1000000,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      });

      const reports = await getBudgetReportItems();
      const item = reports.find((r) => r.analyticAccountId === analyticExpenseId);

      expect(item?.utilizationPercentage).toBe(0);
      expect(item?.actualAmount).toBe(0);
      expect(item?.status).toBe("On Track");
    });

    it("classifies as 'On Track' at exactly 80% utilization", async () => {
      await createBudget({
        name: "80pct Boundary Budget",
        analyticAccountId: analyticExpenseId,
        plannedAmount: 1000000,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      });

      // Spend exactly ₹8,000 out of ₹10,000 = 80%
      await createJournalEntry({
        journalId: bankJournalId,
        date: new Date("2026-03-01"),
        reference: "EXP-80PCT",
        description: "80% utilization test",
        lines: [
          { accountId: expenseAccountId, debit: 800000, credit: 0, analyticAccountId: analyticExpenseId },
          { accountId: bankAccountId, debit: 0, credit: 800000 },
        ],
      });

      const reports = await getBudgetReportItems();
      const item = reports.find((r) => r.analyticAccountId === analyticExpenseId);

      expect(item?.utilizationPercentage).toBe(80);
      expect(item?.status).toBe("On Track"); // 80% is NOT > 80, so still On Track
    });

    it("classifies as 'Near Limit' at exactly 81% utilization", async () => {
      await createBudget({
        name: "81pct Boundary Budget",
        analyticAccountId: analyticExpenseId,
        plannedAmount: 1000000,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      });

      // 810,000 paise = 81%
      await createJournalEntry({
        journalId: bankJournalId,
        date: new Date("2026-03-01"),
        reference: "EXP-81PCT",
        description: "81% utilization test",
        lines: [
          { accountId: expenseAccountId, debit: 810000, credit: 0, analyticAccountId: analyticExpenseId },
          { accountId: bankAccountId, debit: 0, credit: 810000 },
        ],
      });

      const reports = await getBudgetReportItems();
      const item = reports.find((r) => r.analyticAccountId === analyticExpenseId);

      expect(item?.utilizationPercentage).toBe(81);
      expect(item?.status).toBe("Near Limit");
    });

    it("classifies as 'Near Limit' at exactly 100% utilization", async () => {
      await createBudget({
        name: "100pct Boundary Budget",
        analyticAccountId: analyticExpenseId,
        plannedAmount: 1000000,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      });

      await createJournalEntry({
        journalId: bankJournalId,
        date: new Date("2026-03-01"),
        reference: "EXP-100PCT",
        description: "100% utilization test",
        lines: [
          { accountId: expenseAccountId, debit: 1000000, credit: 0, analyticAccountId: analyticExpenseId },
          { accountId: bankAccountId, debit: 0, credit: 1000000 },
        ],
      });

      const reports = await getBudgetReportItems();
      const item = reports.find((r) => r.analyticAccountId === analyticExpenseId);

      expect(item?.utilizationPercentage).toBe(100);
      expect(item?.status).toBe("Near Limit"); // 100% is NOT > 100
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Multi-budget isolation
  // ─────────────────────────────────────────────────────────────────────────

  describe("Multiple budgets across different analytic accounts", () => {
    it("correctly calculates variance independently per analytic account", async () => {
      // Budget 1 — Expense AA
      await createBudget({
        name: "Expense Budget",
        analyticAccountId: analyticExpenseId,
        plannedAmount: 1000000,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      });

      // Budget 2 — Income AA
      await createBudget({
        name: "Revenue Budget",
        analyticAccountId: analyticIncomeId,
        plannedAmount: 2000000,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      });

      // Only tag expense AA in this entry
      await createJournalEntry({
        journalId: bankJournalId,
        date: new Date("2026-05-01"),
        reference: "EXP-ISOLATED-001",
        description: "Tagged expense",
        lines: [
          { accountId: expenseAccountId, debit: 400000, credit: 0, analyticAccountId: analyticExpenseId },
          { accountId: bankAccountId, debit: 0, credit: 400000 },
        ],
      });

      const reports = await getBudgetReportItems();
      const expItem = reports.find((r) => r.analyticAccountId === analyticExpenseId);
      const incItem = reports.find((r) => r.analyticAccountId === analyticIncomeId);

      // Expense budget has actual spend
      expect(expItem?.actualAmount).toBeGreaterThan(0);

      // Income budget has zero actual (no journal items tagged to it)
      expect(incItem?.actualAmount).toBe(0);
    });
  });
});
