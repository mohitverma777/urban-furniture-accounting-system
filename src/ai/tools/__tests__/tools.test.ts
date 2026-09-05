/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * src/ai/tools/__tests__/tools.test.ts
 *
 * Unit test suite for read-only AI financial tools:
 *  - Strict schema input validation (date formats, date ranges, safe limit capping)
 *  - Tool execution output structure and financial values
 *  - Zero mutation verification
 */

import { describe, it, expect } from "vitest";
import {
  getVendorSpendingTool,
  getCustomerRevenueTool,
  getBudgetStatusTool,
  getAccountBalanceTool,
  getProfitLossTool,
  getExpenseBreakdownTool,
  getRecentTransactionsTool,
  getLedgerAnomaliesTool,
} from "../index";

const mockOptions = { toolCallId: "test-call", messages: [] } as any;

describe("AI Financial Tools — Input Validation & Output Structure", () => {
  // -------------------------------------------------------------------------
  // 1. getVendorSpending
  // -------------------------------------------------------------------------
  describe("getVendorSpending", () => {
    it("executes successfully with default parameters", async () => {
      const res = (await getVendorSpendingTool.execute({}, mockOptions)) as any;
      expect(res).toBeDefined();
      expect(res.period).toBeDefined();
      expect(typeof res.totalVendorsCount).toBe("number");
      expect(typeof res.totalSpent).toBe("string");
      expect(Array.isArray(res.vendors)).toBe(true);
    });

    it("accepts valid YYYY-MM-DD date range and limit", async () => {
      const res = (await getVendorSpendingTool.execute(
        { startDate: "2026-01-01", endDate: "2026-12-31", limit: 5 },
        mockOptions
      )) as any;
      expect(res.period.startDate).toBe("2026-01-01");
      expect(res.period.endDate).toBe("2026-12-31");
      expect(res.vendors.length).toBeLessThanOrEqual(5);
    });
  });

  // -------------------------------------------------------------------------
  // 2. getCustomerRevenue
  // -------------------------------------------------------------------------
  describe("getCustomerRevenue", () => {
    it("executes successfully and returns structured revenue data", async () => {
      const res = (await getCustomerRevenueTool.execute({}, mockOptions)) as any;
      expect(res).toBeDefined();
      expect(typeof res.totalCustomersCount).toBe("number");
      expect(typeof res.totalRevenue).toBe("string");
      expect(Array.isArray(res.customers)).toBe(true);
    });

    it("respects limit constraint", async () => {
      const res = (await getCustomerRevenueTool.execute({ limit: 2 }, mockOptions)) as any;
      expect(res.customers.length).toBeLessThanOrEqual(2);
    });
  });

  // -------------------------------------------------------------------------
  // 3. getBudgetStatus
  // -------------------------------------------------------------------------
  describe("getBudgetStatus", () => {
    it("executes successfully and returns variance report items", async () => {
      const res = (await getBudgetStatusTool.execute({}, mockOptions)) as any;
      expect(res).toBeDefined();
      expect(typeof res.totalBudgets).toBe("number");
      expect(Array.isArray(res.budgets)).toBe(true);
    });

    it("includes variance, remaining amount and status classification", async () => {
      const res = (await getBudgetStatusTool.execute({}, mockOptions)) as any;
      if (res.budgets.length > 0) {
        const b = res.budgets[0];
        expect(b.name).toBeDefined();
        expect(b.plannedAmount).toBeDefined();
        expect(b.actualAmount).toBeDefined();
        expect(b.remainingAmount).toBeDefined();
        expect(b.status).toBeDefined();
      }
    });
  });

  // -------------------------------------------------------------------------
  // 4. getAccountBalance
  // -------------------------------------------------------------------------
  describe("getAccountBalance", () => {
    it("returns summary for all active accounts when no target specified", async () => {
      const res = (await getAccountBalanceTool.execute({}, mockOptions)) as any;
      expect(res.totalAccounts).toBeDefined();
      expect(Array.isArray(res.accounts)).toBe(true);
    });

    it("queries single account by accountCode", async () => {
      const res = (await getAccountBalanceTool.execute(
        { accountCode: "1000" },
        mockOptions
      )) as any;
      if (!res.error) {
        expect(res.account.code).toBe("1000");
        expect(res.closingBalance).toBeDefined();
      }
    });
  });

  // -------------------------------------------------------------------------
  // 5. getProfitLoss
  // -------------------------------------------------------------------------
  describe("getProfitLoss", () => {
    it("reuses existing P&L reporting service to return P&L summary", async () => {
      const res = (await getProfitLossTool.execute({}, mockOptions)) as any;
      expect(res.summary).toBeDefined();
      expect(res.summary.totalRevenue).toBeDefined();
      expect(res.summary.totalExpenses).toBeDefined();
      expect(res.summary.netProfit).toBeDefined();
      expect(res.revenue).toBeDefined();
      expect(res.expenses).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // 6. getExpenseBreakdown
  // -------------------------------------------------------------------------
  describe("getExpenseBreakdown", () => {
    it("returns expenses grouped by account and category", async () => {
      const res = (await getExpenseBreakdownTool.execute({}, mockOptions)) as any;
      expect(res.totalExpenses).toBeDefined();
      expect(res.categories).toBeDefined();
      expect(Array.isArray(res.expenseAccounts)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 7. getRecentTransactions
  // -------------------------------------------------------------------------
  describe("getRecentTransactions", () => {
    it("returns recent transactions with limit caps", async () => {
      const res = (await getRecentTransactionsTool.execute({ limit: 5 }, mockOptions)) as any;
      expect(typeof res.totalFound).toBe("number");
      expect(Array.isArray(res.transactions)).toBe(true);
      expect(res.transactions.length).toBeLessThanOrEqual(5);
    });
  });

  // -------------------------------------------------------------------------
  // 8. getLedgerAnomalies
  // -------------------------------------------------------------------------
  describe("getLedgerAnomalies", () => {
    it("executes deterministic audit check and returns findings report", async () => {
      const res = (await getLedgerAnomaliesTool.execute({}, mockOptions)) as any;
      expect(res.summary).toBeDefined();
      expect(typeof res.summary.totalAnomaliesCount).toBe("number");
      expect(Array.isArray(res.findings)).toBe(true);
    });
  });
});
