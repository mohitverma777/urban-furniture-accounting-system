/**
 * src/ai/tools/index.ts
 *
 * Predefined, validated, READ-ONLY financial tools for the Gemini AI assistant.
 *
 * Rules:
 *  - Gemini -> AI tool -> validated input -> existing business/reporting service -> database
 *  - No tool generates or executes arbitrary SQL.
 *  - Every tool calls an existing, tested service function.
 *  - Tools are strictly read-only and never mutate data.
 *  - Money amounts are handled in integer paise and formatted in INR (₹).
 *  - Dates are validated using YYYY-MM-DD regex schemas.
 *  - Result sets have safe maximum limits (e.g. limit <= 50 or 100).
 */

import { tool } from "ai";
import { z } from "zod";
import {
  getProfitAndLossReport,
  getBalanceSheetReport,
  getVendorSpendingReport,
  getCustomerRevenueReport,
  getLedgerAnomaliesReport,
} from "@/services/reports";
import { getBudgetReportItems } from "@/services/budgets";
import {
  getChartOfAccounts,
  getGeneralLedger,
  getJournalEntries,
} from "@/services/accounting/query";

// --------------------------------------------------------------------------
// Common Validation Schemas & Helpers
// --------------------------------------------------------------------------

/** Format paise integer to human-readable INR string (e.g. 100000 -> "₹1,000.00"). */
export function formatINR(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(rupees);
}

/** Date string schema matching YYYY-MM-DD format strictly. */
const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .optional();

/** Common date range schema with start <= end validation. */
const dateRangeInputSchema = z
  .object({
    startDate: dateStringSchema.describe("Filter start date in YYYY-MM-DD format (optional)"),
    endDate: dateStringSchema.describe("Filter end date in YYYY-MM-DD format (optional)"),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.startDate <= data.endDate;
      }
      return true;
    },
    {
      message: "startDate must be before or equal to endDate",
      path: ["startDate"],
    }
  );

// --------------------------------------------------------------------------
// 1. Tool: getVendorSpending
// --------------------------------------------------------------------------

export const getVendorSpendingTool = tool({
  description:
    "Retrieve vendor spending analysis for a validated date range. " +
    "Returns top vendors by total purchase spend, bill count, total paid, and outstanding balance.",
  inputSchema: z
    .object({
      startDate: dateStringSchema.describe("Filter start date in YYYY-MM-DD format (optional)"),
      endDate: dateStringSchema.describe("Filter end date in YYYY-MM-DD format (optional)"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe("Maximum number of vendors to return (1-50, default 10)"),
    })
    .refine(
      (data) => {
        if (data.startDate && data.endDate) {
          return data.startDate <= data.endDate;
        }
        return true;
      },
      { message: "startDate must be before or equal to endDate", path: ["startDate"] }
    ),
  execute: async (input) => {
    const report = await getVendorSpendingReport({
      startDate: input.startDate,
      endDate: input.endDate,
      limit: input.limit,
    });

    return {
      period: {
        startDate: report.startDate ?? "all time",
        endDate: report.endDate ?? "all time",
      },
      totalVendorsCount: report.totalVendorsCount,
      totalSpent: formatINR(report.totalSpentPaise),
      totalSpentPaise: report.totalSpentPaise,
      vendors: report.vendors.map((v) => ({
        vendorId: v.vendorId,
        vendorName: v.vendorName,
        vendorEmail: v.vendorEmail,
        billCount: v.billCount,
        totalSpent: formatINR(v.totalSpentPaise),
        totalSpentPaise: v.totalSpentPaise,
        totalPaid: formatINR(v.totalPaidPaise),
        totalPaidPaise: v.totalPaidPaise,
        outstandingBalance: formatINR(v.outstandingBalancePaise),
        outstandingBalancePaise: v.outstandingBalancePaise,
      })),
    };
  },
});

// --------------------------------------------------------------------------
// 2. Tool: getCustomerRevenue
// --------------------------------------------------------------------------

export const getCustomerRevenueTool = tool({
  description:
    "Retrieve customer revenue breakdown for a validated date range. " +
    "Returns top customers by total sales revenue, invoice count, total collected, and outstanding balance.",
  inputSchema: z
    .object({
      startDate: dateStringSchema.describe("Filter start date in YYYY-MM-DD format (optional)"),
      endDate: dateStringSchema.describe("Filter end date in YYYY-MM-DD format (optional)"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe("Maximum number of customers to return (1-50, default 10)"),
    })
    .refine(
      (data) => {
        if (data.startDate && data.endDate) {
          return data.startDate <= data.endDate;
        }
        return true;
      },
      { message: "startDate must be before or equal to endDate", path: ["startDate"] }
    ),
  execute: async (input) => {
    const report = await getCustomerRevenueReport({
      startDate: input.startDate,
      endDate: input.endDate,
      limit: input.limit,
    });

    return {
      period: {
        startDate: report.startDate ?? "all time",
        endDate: report.endDate ?? "all time",
      },
      totalCustomersCount: report.totalCustomersCount,
      totalRevenue: formatINR(report.totalRevenuePaise),
      totalRevenuePaise: report.totalRevenuePaise,
      customers: report.customers.map((c) => ({
        customerId: c.customerId,
        customerName: c.customerName,
        customerEmail: c.customerEmail,
        invoiceCount: c.invoiceCount,
        totalRevenue: formatINR(c.totalRevenuePaise),
        totalRevenuePaise: c.totalRevenuePaise,
        totalPaid: formatINR(c.totalPaidPaise),
        totalPaidPaise: c.totalPaidPaise,
        outstandingBalance: formatINR(c.outstandingBalancePaise),
        outstandingBalancePaise: c.outstandingBalancePaise,
      })),
    };
  },
});

// --------------------------------------------------------------------------
// 3. Tool: getBudgetStatus
// --------------------------------------------------------------------------

export const getBudgetStatusTool = tool({
  description:
    "Retrieve budget status, actual spending, remaining amount, and utilization percentage " +
    "for configured cost/revenue centers and budget targets.",
  inputSchema: z.object({
    budgetId: z.string().optional().describe("Optional specific budget ID filter"),
    analyticAccountId: z
      .string()
      .optional()
      .describe("Optional specific analytic cost/revenue center ID filter"),
  }),
  execute: async (input) => {
    let items = await getBudgetReportItems();

    if (input.budgetId) {
      items = items.filter((b) => b.id === input.budgetId);
    }
    if (input.analyticAccountId) {
      items = items.filter((b) => b.analyticAccountId === input.analyticAccountId);
    }

    return {
      totalBudgets: items.length,
      budgets: items.map((b) => {
        const remainingAmount =
          b.analyticType === "EXPENSE"
            ? b.plannedAmount - b.actualAmount
            : b.actualAmount - b.plannedAmount;

        return {
          id: b.id,
          name: b.name,
          analyticAccountId: b.analyticAccountId,
          analyticAccountName: b.analyticName,
          type: b.analyticType,
          plannedAmount: formatINR(b.plannedAmount),
          plannedAmountPaise: b.plannedAmount,
          actualAmount: formatINR(b.actualAmount),
          actualAmountPaise: b.actualAmount,
          remainingAmount: formatINR(remainingAmount),
          remainingAmountPaise: remainingAmount,
          utilizationPercentage: `${b.utilizationPercentage}%`,
          status: b.status,
          period: {
            startDate: b.startDate.toISOString().split("T")[0],
            endDate: b.endDate.toISOString().split("T")[0],
          },
        };
      }),
      overBudgetCount: items.filter((b) => b.status === "Over Budget").length,
      nearLimitCount: items.filter((b) => b.status === "Near Limit").length,
    };
  },
});

// --------------------------------------------------------------------------
// 4. Tool: getAccountBalance
// --------------------------------------------------------------------------

export const getAccountBalanceTool = tool({
  description:
    "Retrieve opening balance, period debit, period credit, and closing balance " +
    "for a selected chart of accounts item or across all accounts for a validated date range.",
  inputSchema: z
    .object({
      accountId: z.string().optional().describe("Filter by specific account ID"),
      accountCode: z
        .string()
        .optional()
        .describe("Filter by specific account code (e.g. '1000', '2000', '4000', '5000')"),
      startDate: dateStringSchema.describe("Filter start date in YYYY-MM-DD format (optional)"),
      endDate: dateStringSchema.describe("Filter end date in YYYY-MM-DD format (optional)"),
    })
    .refine(
      (data) => {
        if (data.startDate && data.endDate) {
          return data.startDate <= data.endDate;
        }
        return true;
      },
      { message: "startDate must be before or equal to endDate", path: ["startDate"] }
    ),
  execute: async (input) => {
    // If specific account target provided
    let targetAccountId = input.accountId;

    if (!targetAccountId && input.accountCode) {
      const chart = await getChartOfAccounts({ search: input.accountCode });
      const matched = chart.find((a) => a.code === input.accountCode);
      if (matched) {
        targetAccountId = matched.id;
      }
    }

    if (targetAccountId) {
      const ledger = await getGeneralLedger({
        accountId: targetAccountId,
        startDate: input.startDate,
        endDate: input.endDate,
      });

      if (!ledger) {
        return { error: `Account with ID/code '${input.accountId ?? input.accountCode}' not found.` };
      }

      return {
        account: {
          id: ledger.account.id,
          code: ledger.account.code,
          name: ledger.account.name,
          type: ledger.account.type,
        },
        period: {
          startDate: ledger.startDate ?? "all time",
          endDate: ledger.endDate ?? "all time",
        },
        openingBalance: formatINR(ledger.openingBalance),
        openingBalancePaise: ledger.openingBalance,
        periodDebit: formatINR(ledger.periodDebit),
        periodDebitPaise: ledger.periodDebit,
        periodCredit: formatINR(ledger.periodCredit),
        periodCreditPaise: ledger.periodCredit,
        closingBalance: formatINR(ledger.closingBalance),
        closingBalancePaise: ledger.closingBalance,
        transactionCount: ledger.transactions.length,
      };
    }

    // Otherwise, return balances summary across active chart of accounts
    const allAccounts = await getChartOfAccounts({ status: "ACTIVE" });
    const summaryList = [];

    for (const acc of allAccounts) {
      const ledger = await getGeneralLedger({
        accountId: acc.id,
        startDate: input.startDate,
        endDate: input.endDate,
      });

      if (ledger) {
        summaryList.push({
          id: acc.id,
          code: acc.code,
          name: acc.name,
          type: acc.type,
          closingBalance: formatINR(ledger.closingBalance),
          closingBalancePaise: ledger.closingBalance,
        });
      }
    }

    return {
      period: {
        startDate: input.startDate ?? "all time",
        endDate: input.endDate ?? "all time",
      },
      totalAccounts: summaryList.length,
      accounts: summaryList,
    };
  },
});

// --------------------------------------------------------------------------
// 5. Tool: getProfitLoss
// --------------------------------------------------------------------------

export const getProfitLossTool = tool({
  description:
    "Retrieve the existing application's Profit & Loss result for a validated date range. " +
    "Reuses existing P&L reporting service derived strictly from posted journal entries.",
  inputSchema: dateRangeInputSchema,
  execute: async (input) => {
    // REUSE existing P&L service — no duplicate calculations!
    const report = await getProfitAndLossReport({
      startDate: input.startDate,
      endDate: input.endDate,
    });

    return {
      period: {
        startDate: report.startDate ?? "all time",
        endDate: report.endDate ?? "all time",
      },
      summary: {
        totalRevenue: formatINR(report.totalRevenue),
        totalRevenuePaise: report.totalRevenue,
        totalExpenses: formatINR(report.totalExpenses),
        totalExpensesPaise: report.totalExpenses,
        netProfit: formatINR(report.netProfit),
        netProfitPaise: report.netProfit,
        profitMarginPercentage: `${report.profitMarginPercentage}%`,
        postedEntriesCount: report.postedEntriesCount,
        hasData: report.hasData,
      },
      revenue: {
        salesIncome: report.salesIncomeRows.map((r) => ({
          accountCode: r.accountCode,
          accountName: r.accountName,
          amount: formatINR(r.netAmount),
          amountPaise: r.netAmount,
        })),
        otherIncome: report.otherIncomeRows.map((r) => ({
          accountCode: r.accountCode,
          accountName: r.accountName,
          amount: formatINR(r.netAmount),
          amountPaise: r.netAmount,
        })),
      },
      expenses: {
        purchaseExpenses: report.purchaseExpenseRows.map((r) => ({
          accountCode: r.accountCode,
          accountName: r.accountName,
          amount: formatINR(r.netAmount),
          amountPaise: r.netAmount,
        })),
        operatingExpenses: report.operatingExpenseRows.map((r) => ({
          accountCode: r.accountCode,
          accountName: r.accountName,
          amount: formatINR(r.netAmount),
          amountPaise: r.netAmount,
        })),
      },
    };
  },
});

// --------------------------------------------------------------------------
// 6. Tool: getExpenseBreakdown
// --------------------------------------------------------------------------

export const getExpenseBreakdownTool = tool({
  description:
    "Retrieve expense totals grouped by expense account category for a validated date range. " +
    "Returns exact expense amounts, percentage share of total expenses, and category totals.",
  inputSchema: dateRangeInputSchema,
  execute: async (input) => {
    // REUSE existing P&L report service to extract expense breakdown
    const report = await getProfitAndLossReport({
      startDate: input.startDate,
      endDate: input.endDate,
    });

    const allExpenses = [...report.purchaseExpenseRows, ...report.operatingExpenseRows];
    const totalExpensesPaise = report.totalExpenses;

    const expenseAccounts = allExpenses.map((e) => {
      const sharePercentage =
        totalExpensesPaise > 0
          ? Number(((e.netAmount / totalExpensesPaise) * 100).toFixed(2))
          : 0;

      return {
        accountCode: e.accountCode,
        accountName: e.accountName,
        category: e.accountCode.startsWith("50") ? "Purchase Expenses (COGS)" : "Operating Expenses",
        amount: formatINR(e.netAmount),
        amountPaise: e.netAmount,
        sharePercentage: `${sharePercentage}%`,
      };
    });

    return {
      period: {
        startDate: report.startDate ?? "all time",
        endDate: report.endDate ?? "all time",
      },
      totalExpenses: formatINR(totalExpensesPaise),
      totalExpensesPaise,
      categories: {
        purchaseExpenses: formatINR(report.totalPurchaseExpenses),
        purchaseExpensesPaise: report.totalPurchaseExpenses,
        operatingExpenses: formatINR(report.totalOperatingExpenses),
        operatingExpensesPaise: report.totalOperatingExpenses,
      },
      expenseAccounts,
    };
  },
});

// --------------------------------------------------------------------------
// 7. Tool: getRecentTransactions
// --------------------------------------------------------------------------

export const getRecentTransactionsTool = tool({
  description:
    "Retrieve recent double-entry accounting transactions with a safe maximum limit. " +
    "Supports filtering by date range and journal ID.",
  inputSchema: z
    .object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("Maximum number of transactions to return (1-100, default 20)"),
      startDate: dateStringSchema.describe("Filter start date in YYYY-MM-DD format (optional)"),
      endDate: dateStringSchema.describe("Filter end date in YYYY-MM-DD format (optional)"),
      journalId: z.string().optional().describe("Optional filter by specific journal ID"),
    })
    .refine(
      (data) => {
        if (data.startDate && data.endDate) {
          return data.startDate <= data.endDate;
        }
        return true;
      },
      { message: "startDate must be before or equal to endDate", path: ["startDate"] }
    ),
  execute: async (input) => {
    const safeLimit = Math.min(Math.max(input.limit ?? 20, 1), 100);

    const entries = await getJournalEntries({
      journalId: input.journalId,
      startDate: input.startDate,
      endDate: input.endDate,
    });

    const limitedEntries = entries.slice(0, safeLimit);

    return {
      totalFound: entries.length,
      returnedCount: limitedEntries.length,
      transactions: limitedEntries.map((t) => ({
        id: t.id,
        date: t.date.toISOString().split("T")[0],
        journalName: t.journalName,
        journalType: t.journalType,
        reference: t.reference,
        description: t.description,
        totalDebit: formatINR(t.totalDebit),
        totalDebitPaise: t.totalDebit,
        totalCredit: formatINR(t.totalCredit),
        totalCreditPaise: t.totalCredit,
        isBalanced: t.isBalanced,
      })),
    };
  },
});

// --------------------------------------------------------------------------
// 8. Tool: getLedgerAnomalies
// --------------------------------------------------------------------------

export const getLedgerAnomaliesTool = tool({
  description:
    "Retrieve deterministic audit findings and ledger anomalies from existing accounting data. " +
    "Checks for unbalanced journal entries, zero amount entries, overdue documents, and budget overruns.",
  inputSchema: dateRangeInputSchema,
  execute: async (input) => {
    const report = await getLedgerAnomaliesReport({
      startDate: input.startDate,
      endDate: input.endDate,
    });

    return {
      period: {
        startDate: input.startDate ?? "all time",
        endDate: input.endDate ?? "all time",
      },
      summary: {
        totalAnomaliesCount: report.totalAnomaliesCount,
        criticalCount: report.criticalCount,
        warningCount: report.warningCount,
        infoCount: report.infoCount,
        hasAnomalies: report.totalAnomaliesCount > 0,
      },
      findings: report.findings,
    };
  },
});

// --------------------------------------------------------------------------
// Tool: getBalanceSheet (kept for full coverage)
// --------------------------------------------------------------------------

export const getBalanceSheetTool = tool({
  description:
    "Retrieve the Balance Sheet as of a given date. " +
    "Returns assets (cash, bank, debtors, inventory), liabilities (creditors, tax payable), " +
    "and capital accounts. Validates Assets = Liabilities + Capital.",
  inputSchema: z.object({
    asOfDate: dateStringSchema.describe("As-of date in YYYY-MM-DD format (optional)"),
  }),
  execute: async (input) => {
    const report = await getBalanceSheetReport({ asOfDate: input.asOfDate });
    return {
      asOfDate: report.asOfDate ?? "latest",
      assets: {
        cash: formatINR(report.totalCash),
        bank: formatINR(report.totalBank),
        debtors: formatINR(report.totalDebtors),
        inventory: formatINR(report.totalInventory),
        otherAssets: formatINR(report.totalOtherAssets),
        totalAssets: formatINR(report.totalAssets),
      },
      liabilities: {
        creditors: formatINR(report.totalCreditors),
        taxPayable: formatINR(report.totalTaxPayable),
        otherLiabilities: formatINR(report.totalOtherLiabilities),
        totalLiabilities: formatINR(report.totalLiabilities),
      },
      capital: {
        capitalAccounts: formatINR(report.totalCapitalAccounts),
        currentPeriodProfit: formatINR(report.currentPeriodProfit),
        totalCapital: formatINR(report.totalCapital),
      },
      equation: {
        totalLiabilitiesAndCapital: formatINR(report.totalLiabilitiesAndCapital),
        difference: formatINR(report.difference),
        isBalanced: report.isBalanced,
      },
    };
  },
});

// --------------------------------------------------------------------------
// Exported Tool Registry
// --------------------------------------------------------------------------

export const financialTools = {
  getVendorSpending: getVendorSpendingTool,
  getCustomerRevenue: getCustomerRevenueTool,
  getBudgetStatus: getBudgetStatusTool,
  getAccountBalance: getAccountBalanceTool,
  getProfitLoss: getProfitLossTool,
  getExpenseBreakdown: getExpenseBreakdownTool,
  getRecentTransactions: getRecentTransactionsTool,
  getLedgerAnomalies: getLedgerAnomaliesTool,
  getBalanceSheet: getBalanceSheetTool,
  // Alias for backward compatibility if needed
  getProfitAndLoss: getProfitLossTool,
  getBudgetVariance: getBudgetStatusTool,
};
