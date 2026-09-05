/**
 * src/services/dashboard/index.ts
 *
 * Dashboard Data Service — derives all financial KPIs, ledger metrics,
 * monthly charts, budget utilization, and stock snapshots directly
 * from double-entry accounting journal items and database records.
 */

import { db } from "@/db";
import {
  accounts,
  journalItems,
  journalEntries,
  orders,
  contacts,
  budgets,
  analyticAccounts,
  products,
} from "@/db/schema";
import { eq, inArray, sum, desc } from "drizzle-orm";
import type {
  DashboardFinancials,
  MonthlyChartPoint,
  RecentTransactionItem,
  OutstandingInvoiceItem,
  BudgetUtilizationItem,
  StockSnapshotItem,
  DashboardMetrics,
} from "./types";

export * from "./types";

/**
 * Compute helper for account balance from journal items.
 * Balance = Sum(Debit) - Sum(Credit) for ASSET & EXPENSE accounts.
 * Balance = Sum(Credit) - Sum(Debit) for LIABILITY, INCOME, CAPITAL accounts.
 */
async function getAccountBalanceByCode(code: string): Promise<{ debit: number; credit: number }> {
  const [acc] = await db.select().from(accounts).where(eq(accounts.code, code));
  if (!acc) return { debit: 0, credit: 0 };

  const [res] = await db
    .select({
      totalDebit: sum(journalItems.debit),
      totalCredit: sum(journalItems.credit),
    })
    .from(journalItems)
    .where(eq(journalItems.accountId, acc.id));

  return {
    debit: (res?.totalDebit ?? 0) as number,
    credit: (res?.totalCredit ?? 0) as number,
  };
}

/**
 * Get all dashboard metrics dynamically calculated from the ledger.
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  // 1. Calculate Account Balances directly from double-entry journal items
  const salesAcc = await getAccountBalanceByCode("4000"); // Sales Income
  const purchaseAcc = await getAccountBalanceByCode("5000"); // Purchase Expense
  const opexAcc = await getAccountBalanceByCode("5100"); // Operating Expense
  const debtorsAcc = await getAccountBalanceByCode("1100"); // Debtors (AR)
  const creditorsAcc = await getAccountBalanceByCode("2000"); // Creditors (AP)
  const bankAcc = await getAccountBalanceByCode("1010"); // Bank
  const cashAcc = await getAccountBalanceByCode("1000"); // Cash

  // Revenue = Income Credits - Income Debits
  const totalRevenue = Math.max(0, salesAcc.credit - salesAcc.debit);

  // Expenses = Expense Debits - Expense Credits
  const totalExpenses =
    Math.max(0, purchaseAcc.debit - purchaseAcc.credit) +
    Math.max(0, opexAcc.debit - opexAcc.credit);

  const netProfit = totalRevenue - totalExpenses;

  // Receivables = Debtors Debits - Debtors Credits
  const outstandingReceivables = Math.max(0, debtorsAcc.debit - debtorsAcc.credit);

  // Payables = Creditors Credits - Creditors Debits
  const outstandingPayables = Math.max(0, creditorsAcc.credit - creditorsAcc.debit);

  // Bank Balance = Bank Debits - Bank Credits
  const bankBalance = bankAcc.debit - bankAcc.credit;
  const cashBalance = cashAcc.debit - cashAcc.credit;

  const financials: DashboardFinancials = {
    totalRevenue,
    totalExpenses,
    netProfit,
    outstandingReceivables,
    outstandingPayables,
    bankBalance,
    cashBalance,
  };

  // 2. Compute Monthly Revenue vs Expenses Chart Data
  const allEntries = await db
    .select({
      id: journalEntries.id,
      date: journalEntries.date,
    })
    .from(journalEntries);

  const monthlyMap: Record<string, { revenue: number; expenses: number }> = {};
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  for (const entry of allEntries) {
    const d = new Date(entry.date);
    const monthKey = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;

    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = { revenue: 0, expenses: 0 };
    }

    // Fetch items for this entry
    const items = await db
      .select({
        accountId: journalItems.accountId,
        debit: journalItems.debit,
        credit: journalItems.credit,
        code: accounts.code,
      })
      .from(journalItems)
      .leftJoin(accounts, eq(journalItems.accountId, accounts.id))
      .where(eq(journalItems.entryId, entry.id));

    for (const item of items) {
      if (item.code === "4000") {
        monthlyMap[monthKey].revenue += item.credit - item.debit;
      } else if (item.code === "5000" || item.code === "5100") {
        monthlyMap[monthKey].expenses += item.debit - item.credit;
      }
    }
  }

  const monthlyChart: MonthlyChartPoint[] = Object.entries(monthlyMap).map(([month, val]) => ({
    month,
    revenue: Math.round(val.revenue / 100),
    expenses: Math.round(val.expenses / 100),
    netProfit: Math.round((val.revenue - val.expenses) / 100),
  }));

  // If no monthly chart data exists yet, provide baseline current month structure
  if (monthlyChart.length === 0) {
    const currentMonth = `${monthNames[new Date().getMonth()]} ${new Date().getFullYear()}`;
    monthlyChart.push({
      month: currentMonth,
      revenue: Math.round(totalRevenue / 100),
      expenses: Math.round(totalExpenses / 100),
      netProfit: Math.round(netProfit / 100),
    });
  }

  // 3. Fetch Recent Transactions (last 6 items)
  const recentItems = await db
    .select({
      id: journalItems.id,
      entryId: journalEntries.id,
      date: journalEntries.date,
      description: journalEntries.description,
      accountName: accounts.name,
      debit: journalItems.debit,
      credit: journalItems.credit,
    })
    .from(journalItems)
    .innerJoin(journalEntries, eq(journalItems.entryId, journalEntries.id))
    .innerJoin(accounts, eq(journalItems.accountId, accounts.id))
    .orderBy(desc(journalEntries.createdAt))
    .limit(6);

  const recentTransactions: RecentTransactionItem[] = recentItems.map((item) => ({
    id: item.id,
    entryNumber: item.entryId.substring(0, 8),
    date: item.date instanceof Date ? item.date.toISOString().split("T")[0] : String(item.date),
    description: item.description || "Journal Transaction",
    accountName: item.accountName,
    journalName: "General",
    debit: item.debit,
    credit: item.credit,
  }));

  // 4. Fetch Outstanding / Unsettled Invoices (SO & PO with status BILLED or PARTIAL)
  const outstandingOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      type: orders.type,
      status: orders.status,
      totalAmount: orders.totalAmount,
      invoiceDate: orders.invoiceDate,
      contactName: contacts.name,
    })
    .from(orders)
    .leftJoin(contacts, eq(orders.contactId, contacts.id))
    .where(inArray(orders.status, ["BILLED", "PARTIAL", "DRAFT"]))
    .orderBy(desc(orders.createdAt))
    .limit(5);

  const outstandingInvoices: OutstandingInvoiceItem[] = outstandingOrders.map((ord) => ({
    id: ord.id,
    orderNumber: ord.orderNumber,
    type: ord.type as "SO" | "PO",
    contactName: ord.contactName || "Counterparty",
    status: ord.status as "DRAFT" | "BILLED" | "PARTIAL" | "PAID",
    totalAmount: ord.totalAmount,
    invoiceDate:
      ord.invoiceDate instanceof Date
        ? ord.invoiceDate.toISOString().split("T")[0]
        : String(ord.invoiceDate ?? ""),
  }));

  // 5. Fetch Budget Utilization per Analytic Account
  const rawBudgets = await db
    .select({
      id: budgets.id,
      name: budgets.name,
      plannedAmount: budgets.plannedAmount,
      analyticName: analyticAccounts.name,
      analyticId: analyticAccounts.id,
    })
    .from(budgets)
    .leftJoin(analyticAccounts, eq(budgets.analyticAccountId, analyticAccounts.id));

  const budgetUtilization: BudgetUtilizationItem[] = await Promise.all(
    rawBudgets.map(async (b) => {
      // Sum practical expenses linked to this analytic account
      const [sumRes] = await db
        .select({ total: sum(journalItems.debit) })
        .from(journalItems)
        .where(eq(journalItems.analyticAccountId, b.analyticId ?? ""));

      const practicalAmount = (sumRes?.total ?? 0) as number;
      const utilizationPercentage =
        b.plannedAmount > 0
          ? Math.min(100, Math.round((practicalAmount / b.plannedAmount) * 100))
          : 0;

      return {
        id: b.id,
        name: b.name,
        analyticName: b.analyticName || "Cost Center",
        plannedAmount: b.plannedAmount,
        practicalAmount,
        utilizationPercentage,
      };
    })
  );

  // 6. Fetch Stock Snapshot (Active Catalog Products)
  const productList = await db
    .select()
    .from(products)
    .where(eq(products.isArchived, false))
    .limit(6);

  const stockSnapshot: StockSnapshotItem[] = productList.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category || "Uncategorized",
    type: p.type,
    salesPrice: p.salesPrice,
    costPrice: p.costPrice,
    isArchived: p.isArchived,
  }));

  const hasData =
    totalRevenue > 0 ||
    totalExpenses > 0 ||
    recentTransactions.length > 0 ||
    outstandingInvoices.length > 0;

  return {
    financials,
    monthlyChart,
    recentTransactions,
    outstandingInvoices,
    budgetUtilization,
    stockSnapshot,
    hasData,
  };
}
