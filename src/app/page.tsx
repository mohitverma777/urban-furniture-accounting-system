import { PageHeader } from "@/components/common/page-header";
import { getDashboardMetrics } from "@/services/dashboard";
import { EmptyState } from "@/components/common/empty-state";
import { RevenueExpenseChart } from "@/components/dashboard/revenue-expense-chart";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { OutstandingInvoices } from "@/components/dashboard/outstanding-invoices";
import { BudgetUtilization } from "@/components/dashboard/budget-utilization";
import { StockSnapshot } from "@/components/dashboard/stock-snapshot";
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Landmark,
  ArrowUpRight,
  ArrowDownLeft,
  LayoutDashboard,
  FileCheck,
  PieChart,
  Package,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics();
  const { financials } = metrics;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Financial Dashboard"
        description="Real double-entry ledger analytics derived directly from database transactions."
        badge={
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
            Real Accounting Data
          </span>
        }
      />

      {/* 6 Core Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* 1. Total Revenue */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Revenue
            </span>
            <div className="p-2 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-900">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            ₹{(financials.totalRevenue / 100).toLocaleString("en-IN")}
          </div>
          <p className="text-xs text-slate-400">Sales Income Account (4000)</p>
        </div>

        {/* 2. Total Expenses */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Expenses
            </span>
            <div className="p-2 rounded-xl bg-rose-950 text-rose-400 border border-rose-900">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            ₹{(financials.totalExpenses / 100).toLocaleString("en-IN")}
          </div>
          <p className="text-xs text-slate-400">Purchase & Opex Accounts (5000, 5100)</p>
        </div>

        {/* 3. Net Profit */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Net Profit
            </span>
            <div
              className={`p-2 rounded-xl border ${
                financials.netProfit >= 0
                  ? "bg-emerald-950 text-emerald-400 border-emerald-900"
                  : "bg-rose-950 text-rose-400 border-rose-900"
              }`}
            >
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div
            className={`text-2xl font-extrabold font-mono ${
              financials.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            ₹{(financials.netProfit / 100).toLocaleString("en-IN")}
          </div>
          <p className="text-xs text-slate-400">Income Minus Total Expenses</p>
        </div>

        {/* 4. Outstanding Receivables */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Outstanding Receivables
            </span>
            <div className="p-2 rounded-xl bg-blue-950 text-blue-400 border border-blue-900">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            ₹{(financials.outstandingReceivables / 100).toLocaleString("en-IN")}
          </div>
          <p className="text-xs text-slate-400">Customer Debtors Balance (1100)</p>
        </div>

        {/* 5. Outstanding Payables */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Outstanding Payables
            </span>
            <div className="p-2 rounded-xl bg-purple-950 text-purple-400 border border-purple-900">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            ₹{(financials.outstandingPayables / 100).toLocaleString("en-IN")}
          </div>
          <p className="text-xs text-slate-400">Vendor Creditors Balance (2000)</p>
        </div>

        {/* 6. Bank Balance */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Bank Balance
            </span>
            <div className="p-2 rounded-xl bg-amber-950 text-amber-400 border border-amber-900">
              <Landmark className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-400 font-mono">
            ₹{(financials.bankBalance / 100).toLocaleString("en-IN")}
          </div>
          <p className="text-xs text-slate-400">Posted Bank Ledger Balance (1010)</p>
        </div>
      </div>

      {/* Main Charts & Breakdown Section */}
      {!metrics.hasData ? (
        <EmptyState
          icon={LayoutDashboard}
          title="No Accounting Transactions Posted"
          description="Post customer invoices, vendor bills, or payments to generate real-time financial charts and ledger reports."
        />
      ) : (
        <div className="space-y-8">
          {/* Revenue vs Expenses Chart & Budget Utilization Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Panel */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <span>Revenue vs. Expenses Trend</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">Monthly Comparison</span>
              </div>
              <RevenueExpenseChart data={metrics.monthlyChart} />
            </div>

            {/* Budget Utilization Panel */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-purple-400" />
                  <span>Budget Utilization</span>
                </h3>
              </div>
              <BudgetUtilization items={metrics.budgetUtilization} />
            </div>
          </div>

          {/* Recent Transactions & Outstanding Invoices & Stock Snapshot Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Transactions */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-blue-400" />
                  <span>Recent Postings</span>
                </h3>
              </div>
              <RecentTransactions items={metrics.recentTransactions} />
            </div>

            {/* Outstanding Invoices */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-amber-400" />
                  <span>Outstanding Invoices</span>
                </h3>
              </div>
              <OutstandingInvoices items={metrics.outstandingInvoices} />
            </div>

            {/* Stock Snapshot */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-400" />
                  <span>Catalog Stock Snapshot</span>
                </h3>
              </div>
              <StockSnapshot items={metrics.stockSnapshot} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
