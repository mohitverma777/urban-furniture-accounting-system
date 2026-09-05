/**
 * src/services/reports/profit-loss.ts
 *
 * Database-derived Profit & Loss (P&L) Report Service.
 *
 * Source of Truth: Posted journal entries and double-entry ledger line items.
 * Formula: Net Profit = Total Revenue (Income) - Total Expenses
 */

import { db } from "@/db";
import { accounts, journalEntries, journalItems, type AccountType } from "@/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export interface ProfitAndLossFilter {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

export interface AccountSummaryRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  debit: number; // in Paise
  credit: number; // in Paise
  netAmount: number; // in Paise
}

export interface ProfitAndLossReport {
  startDate: string | null;
  endDate: string | null;

  // Income / Revenue
  salesIncomeRows: AccountSummaryRow[];
  otherIncomeRows: AccountSummaryRow[];
  totalRevenue: number; // in Paise

  // Expenses
  purchaseExpenseRows: AccountSummaryRow[];
  operatingExpenseRows: AccountSummaryRow[];
  totalPurchaseExpenses: number; // in Paise
  totalOperatingExpenses: number; // in Paise
  totalExpenses: number; // in Paise

  // Net Metrics
  netProfit: number; // in Paise (totalRevenue - totalExpenses)
  profitMarginPercentage: number; // e.g. 15.5

  // Metadata
  postedEntriesCount: number;
  hasData: boolean;
}

export async function getProfitAndLossReport(
  filter: ProfitAndLossFilter = {}
): Promise<ProfitAndLossReport> {
  const conditions = [];

  if (filter.startDate) {
    conditions.push(gte(journalEntries.date, new Date(filter.startDate)));
  }

  if (filter.endDate) {
    const end = new Date(filter.endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(journalEntries.date, end));
  }

  // 1. Fetch count of distinct journal entries in range
  const [countRes] = await db
    .select({ total: sql<number>`count(distinct ${journalEntries.id})` })
    .from(journalEntries)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const postedEntriesCount = Number(countRes?.total ?? 0);

  // 2. Fetch all journal items joined with accounts for entries matching date range
  const rawItems = await db
    .select({
      accountId: accounts.id,
      accountCode: accounts.code,
      accountName: accounts.name,
      accountType: accounts.type,
      debit: journalItems.debit,
      credit: journalItems.credit,
    })
    .from(journalItems)
    .innerJoin(journalEntries, eq(journalItems.entryId, journalEntries.id))
    .innerJoin(accounts, eq(journalItems.accountId, accounts.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  // 3. Aggregate totals per account ID
  const accountMap = new Map<
    string,
    {
      accountId: string;
      accountCode: string;
      accountName: string;
      accountType: AccountType;
      debit: number;
      credit: number;
    }
  >();

  for (const item of rawItems) {
    const existing = accountMap.get(item.accountId) ?? {
      accountId: item.accountId,
      accountCode: item.accountCode,
      accountName: item.accountName,
      accountType: item.accountType,
      debit: 0,
      credit: 0,
    };

    existing.debit += item.debit;
    existing.credit += item.credit;
    accountMap.set(item.accountId, existing);
  }

  // Also include active INCOME and EXPENSE accounts from chart of accounts with 0 amounts if no items exist
  const allChartAccounts = await db
    .select()
    .from(accounts)
    .where(eq(accounts.isActive, true));

  for (const acc of allChartAccounts) {
    if ((acc.type === "INCOME" || acc.type === "EXPENSE") && !accountMap.has(acc.id)) {
      accountMap.set(acc.id, {
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        accountType: acc.type,
        debit: 0,
        credit: 0,
      });
    }
  }

  const salesIncomeRows: AccountSummaryRow[] = [];
  const otherIncomeRows: AccountSummaryRow[] = [];
  const purchaseExpenseRows: AccountSummaryRow[] = [];
  const operatingExpenseRows: AccountSummaryRow[] = [];

  let totalRevenue = 0;
  let totalPurchaseExpenses = 0;
  let totalOperatingExpenses = 0;

  for (const acc of accountMap.values()) {
    if (acc.accountType === "INCOME") {
      // Income = Credits - Debits
      const netAmount = acc.credit - acc.debit;
      const row: AccountSummaryRow = { ...acc, netAmount };

      if (acc.accountCode === "4000" || acc.accountName.toLowerCase().includes("sales")) {
        salesIncomeRows.push(row);
      } else {
        otherIncomeRows.push(row);
      }
      totalRevenue += netAmount;
    } else if (acc.accountType === "EXPENSE") {
      // Expenses = Debits - Credits
      const netAmount = acc.debit - acc.credit;
      const row: AccountSummaryRow = { ...acc, netAmount };

      if (
        acc.accountCode === "5000" ||
        acc.accountName.toLowerCase().includes("purchase") ||
        acc.accountName.toLowerCase().includes("cogs")
      ) {
        purchaseExpenseRows.push(row);
        totalPurchaseExpenses += netAmount;
      } else {
        operatingExpenseRows.push(row);
        totalOperatingExpenses += netAmount;
      }
    }
  }

  // Sort rows by account code
  const sortByCode = (a: AccountSummaryRow, b: AccountSummaryRow) =>
    a.accountCode.localeCompare(b.accountCode);

  salesIncomeRows.sort(sortByCode);
  otherIncomeRows.sort(sortByCode);
  purchaseExpenseRows.sort(sortByCode);
  operatingExpenseRows.sort(sortByCode);

  const totalExpenses = totalPurchaseExpenses + totalOperatingExpenses;
  const netProfit = totalRevenue - totalExpenses;
  const profitMarginPercentage =
    totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(2)) : 0;

  const hasData =
    postedEntriesCount > 0 ||
    salesIncomeRows.some((r) => r.netAmount !== 0) ||
    otherIncomeRows.some((r) => r.netAmount !== 0) ||
    purchaseExpenseRows.some((r) => r.netAmount !== 0) ||
    operatingExpenseRows.some((r) => r.netAmount !== 0);

  return {
    startDate: filter.startDate ?? null,
    endDate: filter.endDate ?? null,
    salesIncomeRows,
    otherIncomeRows,
    totalRevenue,
    purchaseExpenseRows,
    operatingExpenseRows,
    totalPurchaseExpenses,
    totalOperatingExpenses,
    totalExpenses,
    netProfit,
    profitMarginPercentage,
    postedEntriesCount,
    hasData,
  };
}
