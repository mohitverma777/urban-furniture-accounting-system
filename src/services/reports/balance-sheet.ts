/**
 * src/services/reports/balance-sheet.ts
 *
 * Database-derived Balance Sheet Report Service.
 *
 * Source of Truth: Posted journal entries and double-entry ledger line items.
 * Equation: Assets = Liabilities + Capital
 */

import { db } from "@/db";
import { accounts, journalEntries, journalItems, type AccountType } from "@/db/schema";
import { eq, and, lte, sql } from "drizzle-orm";

export interface BalanceSheetFilter {
  asOfDate?: string; // YYYY-MM-DD
}

export interface AccountBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  debit: number; // in Paise
  credit: number; // in Paise
  balance: number; // in Paise (net balance based on normal balance rule)
}

export interface BalanceSheetReport {
  asOfDate: string | null;

  // ASSETS
  cashAccounts: AccountBalanceRow[];
  bankAccounts: AccountBalanceRow[];
  debtorsAccounts: AccountBalanceRow[];
  inventoryAccounts: AccountBalanceRow[];
  otherAssetAccounts: AccountBalanceRow[];
  totalCash: number; // in Paise
  totalBank: number; // in Paise
  totalDebtors: number; // in Paise
  totalInventory: number; // in Paise
  totalOtherAssets: number; // in Paise
  totalAssets: number; // in Paise

  // LIABILITIES
  creditorsAccounts: AccountBalanceRow[];
  taxPayableAccounts: AccountBalanceRow[];
  otherLiabilityAccounts: AccountBalanceRow[];
  totalCreditors: number; // in Paise
  totalTaxPayable: number; // in Paise
  totalOtherLiabilities: number; // in Paise
  totalLiabilities: number; // in Paise

  // CAPITAL / EQUITY
  capitalAccounts: AccountBalanceRow[];
  totalCapitalAccounts: number; // in Paise
  currentPeriodProfit: number; // in Paise (Total Income - Total Expenses)
  totalCapital: number; // in Paise (totalCapitalAccounts + currentPeriodProfit)

  // EQUATION VALIDATION
  totalLiabilitiesAndCapital: number; // in Paise
  difference: number; // in Paise (totalAssets - totalLiabilitiesAndCapital)
  isBalanced: boolean;

  postedEntriesCount: number;
  hasData: boolean;
}

export async function getBalanceSheetReport(
  filter: BalanceSheetFilter = {}
): Promise<BalanceSheetReport> {
  const conditions = [];

  if (filter.asOfDate) {
    const end = new Date(filter.asOfDate);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(journalEntries.date, end));
  }

  // 1. Fetch count of distinct posted journal entries up to asOfDate
  const [countRes] = await db
    .select({ total: sql<number>`count(distinct ${journalEntries.id})` })
    .from(journalEntries)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const postedEntriesCount = Number(countRes?.total ?? 0);

  // 2. Fetch all journal items joined with accounts up to asOfDate
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

  // Also include active Chart of Accounts items with 0 balances if no postings exist yet
  const allChartAccounts = await db
    .select()
    .from(accounts)
    .where(eq(accounts.isActive, true));

  for (const acc of allChartAccounts) {
    if (!accountMap.has(acc.id)) {
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

  // Categories
  const cashAccounts: AccountBalanceRow[] = [];
  const bankAccounts: AccountBalanceRow[] = [];
  const debtorsAccounts: AccountBalanceRow[] = [];
  const inventoryAccounts: AccountBalanceRow[] = [];
  const otherAssetAccounts: AccountBalanceRow[] = [];

  const creditorsAccounts: AccountBalanceRow[] = [];
  const taxPayableAccounts: AccountBalanceRow[] = [];
  const otherLiabilityAccounts: AccountBalanceRow[] = [];

  const capitalAccounts: AccountBalanceRow[] = [];

  let totalCash = 0;
  let totalBank = 0;
  let totalDebtors = 0;
  let totalInventory = 0;
  let totalOtherAssets = 0;
  let totalAssets = 0;

  let totalCreditors = 0;
  let totalTaxPayable = 0;
  let totalOtherLiabilities = 0;
  let totalLiabilities = 0;

  let totalCapitalAccounts = 0;
  let totalIncome = 0;
  let totalExpenses = 0;

  for (const acc of accountMap.values()) {
    const nameLower = acc.accountName.toLowerCase();

    if (acc.accountType === "ASSET") {
      // Asset Normal Balance = Debit - Credit
      const balance = acc.debit - acc.credit;
      const row: AccountBalanceRow = { ...acc, balance };

      if (acc.accountCode === "1000" || nameLower.includes("cash")) {
        cashAccounts.push(row);
        totalCash += balance;
      } else if (acc.accountCode === "1010" || nameLower.includes("bank")) {
        bankAccounts.push(row);
        totalBank += balance;
      } else if (
        acc.accountCode === "1100" ||
        nameLower.includes("debtor") ||
        nameLower.includes("receivable")
      ) {
        debtorsAccounts.push(row);
        totalDebtors += balance;
      } else if (
        acc.accountCode === "1200" ||
        nameLower.includes("inventory") ||
        nameLower.includes("stock")
      ) {
        inventoryAccounts.push(row);
        totalInventory += balance;
      } else {
        otherAssetAccounts.push(row);
        totalOtherAssets += balance;
      }
      totalAssets += balance;
    } else if (acc.accountType === "LIABILITY") {
      // Liability Normal Balance = Credit - Debit
      const balance = acc.credit - acc.debit;
      const row: AccountBalanceRow = { ...acc, balance };

      if (
        acc.accountCode === "2000" ||
        nameLower.includes("creditor") ||
        nameLower.includes("payable")
      ) {
        if (
          acc.accountCode === "2200" ||
          nameLower.includes("tax") ||
          nameLower.includes("gst")
        ) {
          taxPayableAccounts.push(row);
          totalTaxPayable += balance;
        } else {
          creditorsAccounts.push(row);
          totalCreditors += balance;
        }
      } else if (
        acc.accountCode === "2200" ||
        nameLower.includes("tax") ||
        nameLower.includes("gst")
      ) {
        taxPayableAccounts.push(row);
        totalTaxPayable += balance;
      } else {
        otherLiabilityAccounts.push(row);
        totalOtherLiabilities += balance;
      }
      totalLiabilities += balance;
    } else if (acc.accountType === "CAPITAL") {
      // Capital Normal Balance = Credit - Debit
      const balance = acc.credit - acc.debit;
      const row: AccountBalanceRow = { ...acc, balance };
      capitalAccounts.push(row);
      totalCapitalAccounts += balance;
    } else if (acc.accountType === "INCOME") {
      // Income = Credit - Debit
      totalIncome += acc.credit - acc.debit;
    } else if (acc.accountType === "EXPENSE") {
      // Expense = Debit - Credit
      totalExpenses += acc.debit - acc.credit;
    }
  }

  // Sort helper
  const sortByCode = (a: AccountBalanceRow, b: AccountBalanceRow) =>
    a.accountCode.localeCompare(b.accountCode);

  cashAccounts.sort(sortByCode);
  bankAccounts.sort(sortByCode);
  debtorsAccounts.sort(sortByCode);
  inventoryAccounts.sort(sortByCode);
  otherAssetAccounts.sort(sortByCode);

  creditorsAccounts.sort(sortByCode);
  taxPayableAccounts.sort(sortByCode);
  otherLiabilityAccounts.sort(sortByCode);

  capitalAccounts.sort(sortByCode);

  // Compute Current Period Net Profit (Income - Expenses)
  const currentPeriodProfit = totalIncome - totalExpenses;
  const totalCapital = totalCapitalAccounts + currentPeriodProfit;

  const totalLiabilitiesAndCapital = totalLiabilities + totalCapital;
  const difference = totalAssets - totalLiabilitiesAndCapital;
  const isBalanced = Math.abs(difference) === 0;

  const hasData =
    postedEntriesCount > 0 ||
    totalAssets !== 0 ||
    totalLiabilities !== 0 ||
    totalCapital !== 0;

  return {
    asOfDate: filter.asOfDate ?? null,
    cashAccounts,
    bankAccounts,
    debtorsAccounts,
    inventoryAccounts,
    otherAssetAccounts,
    totalCash,
    totalBank,
    totalDebtors,
    totalInventory,
    totalOtherAssets,
    totalAssets,
    creditorsAccounts,
    taxPayableAccounts,
    otherLiabilityAccounts,
    totalCreditors,
    totalTaxPayable,
    totalOtherLiabilities,
    totalLiabilities,
    capitalAccounts,
    totalCapitalAccounts,
    currentPeriodProfit,
    totalCapital,
    totalLiabilitiesAndCapital,
    difference,
    isBalanced,
    postedEntriesCount,
    hasData,
  };
}
