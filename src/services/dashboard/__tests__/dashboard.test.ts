/**
 * src/services/dashboard/__tests__/dashboard.test.ts
 *
 * Unit tests for Dashboard Data Service layer.
 */

import { describe, it, expect } from "vitest";
import { getDashboardMetrics } from "../index";

describe("Dashboard Data Service", () => {
  it("calculates real double-entry accounting ledger metrics dynamically", async () => {
    const metrics = await getDashboardMetrics();

    expect(metrics).toBeDefined();
    expect(metrics.financials).toBeDefined();
    expect(typeof metrics.financials.totalRevenue).toBe("number");
    expect(typeof metrics.financials.totalExpenses).toBe("number");
    expect(typeof metrics.financials.netProfit).toBe("number");
    expect(typeof metrics.financials.outstandingReceivables).toBe("number");
    expect(typeof metrics.financials.outstandingPayables).toBe("number");
    expect(typeof metrics.financials.bankBalance).toBe("number");

    // Net profit invariant rule
    expect(metrics.financials.netProfit).toBe(
      metrics.financials.totalRevenue - metrics.financials.totalExpenses
    );

    // Panels check
    expect(Array.isArray(metrics.monthlyChart)).toBe(true);
    expect(Array.isArray(metrics.recentTransactions)).toBe(true);
    expect(Array.isArray(metrics.outstandingInvoices)).toBe(true);
    expect(Array.isArray(metrics.budgetUtilization)).toBe(true);
    expect(Array.isArray(metrics.stockSnapshot)).toBe(true);
  });
});
