"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import type { ProfitAndLossReport } from "@/services/reports";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Printer,
  RotateCcw,
  FileSpreadsheet,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";


interface ProfitLossClientShellProps {
  report: ProfitAndLossReport;
}

export function formatCurrency(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

export function ProfitLossClientShell({ report }: ProfitLossClientShellProps) {
  const router = useRouter();

  const [startDate, setStartDate] = useState(report.startDate || "");
  const [endDate, setEndDate] = useState(report.endDate || "");

  const handleApplyFilter = (start?: string, end?: string) => {
    const s = start !== undefined ? start : startDate;
    const e = end !== undefined ? end : endDate;

    const params = new URLSearchParams();
    if (s) params.set("startDate", s);
    if (e) params.set("endDate", e);

    const query = params.toString();
    router.push(`/reports/profit-loss${query ? `?${query}` : ""}`);
  };

  const handleQuickPreset = (preset: "thisMonth" | "thisQuarter" | "ytd" | "allTime") => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (preset === "allTime") {
      setStartDate("");
      setEndDate("");
      handleApplyFilter("", "");
      return;
    }

    if (preset === "thisMonth") {
      const firstDay = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const lastDayDate = new Date(year, month + 1, 0);
      const lastDay = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        lastDayDate.getDate()
      ).padStart(2, "0")}`;
      setStartDate(firstDay);
      setEndDate(lastDay);
      handleApplyFilter(firstDay, lastDay);
      return;
    }

    if (preset === "thisQuarter") {
      const qStartMonth = Math.floor(month / 3) * 3;
      const firstDay = `${year}-${String(qStartMonth + 1).padStart(2, "0")}-01`;
      const lastDayDate = new Date(year, qStartMonth + 3, 0);
      const lastDay = `${year}-${String(qStartMonth + 3).padStart(2, "0")}-${String(
        lastDayDate.getDate()
      ).padStart(2, "0")}`;
      setStartDate(firstDay);
      setEndDate(lastDay);
      handleApplyFilter(firstDay, lastDay);
      return;
    }

    if (preset === "ytd") {
      const firstDay = `${year}-01-01`;
      const todayStr = now.toISOString().split("T")[0];
      setStartDate(firstDay);
      setEndDate(todayStr);
      handleApplyFilter(firstDay, todayStr);
      return;
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const isProfitable = report.netProfit >= 0;

  return (
    <div className="space-y-8">
      {/* Printable Header (Visible only during print) */}
      <div className="hidden print:block space-y-2 mb-6 border-b border-slate-300 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Urban Furniture Accounting</h1>
            <h2 className="text-lg font-semibold text-slate-700">Profit & Loss Statement</h2>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Generated: {new Date().toLocaleDateString("en-IN")}</p>
            <p>Source of Truth: Posted Journal Entries</p>
          </div>
        </div>
        <p className="text-xs text-slate-600 font-medium">
          Period: {report.startDate || "Start of Time"} to {report.endDate || "Present"}
        </p>
      </div>

      {/* Screen Header */}
      <div className="print:hidden">
        <PageHeader
          title="Profit & Loss Report"
          description="Real-time P&L calculated strictly from posted double-entry journal items and ledger transactions."
          actions={
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              Print Report
            </button>
          }
        />
      </div>


      {/* Period Selection & Date Filters */}
      <div className="print:hidden p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Reporting Period</span>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleQuickPreset("thisMonth")}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              This Month
            </button>
            <button
              onClick={() => handleQuickPreset("thisQuarter")}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              This Quarter
            </button>
            <button
              onClick={() => handleQuickPreset("ytd")}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              Year to Date (YTD)
            </button>
            <button
              onClick={() => handleQuickPreset("allTime")}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              All Time
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={() => handleApplyFilter()}
              className="flex-1 px-4 py-2 text-sm font-semibold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-sm"
            >
              Apply Filter
            </button>

            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  handleApplyFilter("", "");
                }}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                title="Reset Dates"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Revenue */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-md relative overflow-hidden print:border-slate-300 print:bg-white">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider print:text-slate-600">
              Total Revenue
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center justify-center print:hidden">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="text-2xl lg:text-3xl font-extrabold text-white font-mono tracking-tight print:text-slate-900">
            {formatCurrency(report.totalRevenue)}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Sales Income Account (4000)</span>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-md relative overflow-hidden print:border-slate-300 print:bg-white">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider print:text-slate-600">
              Total Expenses
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-950/80 text-rose-400 border border-rose-800/60 flex items-center justify-center print:hidden">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>

          <div className="text-2xl lg:text-3xl font-extrabold text-white font-mono tracking-tight print:text-slate-900">
            {formatCurrency(report.totalExpenses)}
          </div>

          <div className="flex justify-between items-center text-xs text-slate-400 pt-1 border-t border-slate-800/80">
            <span>Purchase: {formatCurrency(report.totalPurchaseExpenses)}</span>
            <span>Opex: {formatCurrency(report.totalOperatingExpenses)}</span>
          </div>
        </div>

        {/* Net Profit / Loss */}
        <div
          className={`p-6 rounded-2xl border space-y-3 shadow-md relative overflow-hidden print:bg-white print:border-slate-300 ${
            isProfitable
              ? "bg-slate-900 border-emerald-500/40"
              : "bg-slate-900 border-rose-500/40"
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider print:text-slate-600">
              Net Profit / Loss
            </span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center print:hidden ${
                isProfitable
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                  : "bg-rose-950 text-rose-400 border border-rose-800"
              }`}
            >
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div
            className={`text-2xl lg:text-3xl font-extrabold font-mono tracking-tight print:text-slate-900 ${
              isProfitable ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {formatCurrency(report.netProfit)}
          </div>

          <div className="flex items-center justify-between text-xs font-semibold">
            <span
              className={`px-2.5 py-0.5 rounded-full ${
                isProfitable
                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                  : "bg-rose-950 text-rose-300 border border-rose-800"
              }`}
            >
              {isProfitable ? "Profitable" : "Net Loss"}
            </span>
            <span className="text-slate-300">
              Profit Margin: {report.profitMarginPercentage}%
            </span>
          </div>
        </div>
      </div>

      {/* Account-Level Breakdown Tables */}
      {!report.hasData ? (
        <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">No Posted Transactions in Period</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            No double-entry journal postings fall within the selected date range. Post customer
            invoices or vendor bills to see real-time P&L breakdowns.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Section 1: REVENUE */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm print:bg-white print:border-slate-300">
            <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex justify-between items-center print:bg-slate-100 print:border-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <h3 className="text-base font-bold text-white tracking-tight print:text-slate-900">
                  REVENUE (INCOME)
                </h3>
              </div>
              <span className="text-xs font-mono font-semibold text-emerald-400 print:text-slate-900">
                {formatCurrency(report.totalRevenue)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-semibold print:border-slate-300 print:text-slate-700">
                    <th className="px-6 py-3">Account Code</th>
                    <th className="px-6 py-3">Account Name</th>
                    <th className="px-6 py-3 text-right">Debit (Paise)</th>
                    <th className="px-6 py-3 text-right">Credit (Paise)</th>
                    <th className="px-6 py-3 text-right">Net Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 print:divide-slate-200">
                  {report.salesIncomeRows.concat(report.otherIncomeRows).map((row) => (
                    <tr key={row.accountId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-3.5 font-mono text-xs text-amber-400 font-semibold print:text-slate-900">
                        {row.accountCode}
                      </td>
                      <td className="px-6 py-3.5 text-slate-200 font-medium print:text-slate-900">
                        {row.accountName}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono text-slate-400 print:text-slate-700">
                        {formatCurrency(row.debit)}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono text-slate-400 print:text-slate-700">
                        {formatCurrency(row.credit)}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono font-bold text-emerald-400 print:text-slate-900">
                        {formatCurrency(row.netAmount)}
                      </td>
                    </tr>
                  ))}
                  {report.salesIncomeRows.length === 0 && report.otherIncomeRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-slate-500 text-center italic">
                        No revenue account postings in period.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-950/60 font-bold border-t border-slate-800 text-white print:bg-slate-100 print:text-slate-900 print:border-slate-300">
                    <td colSpan={4} className="px-6 py-4 text-right uppercase text-xs tracking-wider">
                      Total Revenue
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-emerald-400 text-base print:text-slate-900">
                      {formatCurrency(report.totalRevenue)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Section 2: EXPENSES */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm print:bg-white print:border-slate-300">
            <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex justify-between items-center print:bg-slate-100 print:border-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <h3 className="text-base font-bold text-white tracking-tight print:text-slate-900">
                  EXPENSES (PURCHASE & OPERATING)
                </h3>
              </div>
              <span className="text-xs font-mono font-semibold text-rose-400 print:text-slate-900">
                {formatCurrency(report.totalExpenses)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-semibold print:border-slate-300 print:text-slate-700">
                    <th className="px-6 py-3">Account Code</th>
                    <th className="px-6 py-3">Account Name</th>
                    <th className="px-6 py-3 text-right">Debit (Paise)</th>
                    <th className="px-6 py-3 text-right">Credit (Paise)</th>
                    <th className="px-6 py-3 text-right">Net Expense</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 print:divide-slate-200">
                  {/* Purchase Expense Header */}
                  <tr className="bg-slate-950/40 text-xs font-bold text-slate-400 uppercase tracking-wider print:bg-slate-50">
                    <td colSpan={5} className="px-6 py-2">
                      Purchase Expenses (Cost of Goods Sold)
                    </td>
                  </tr>
                  {report.purchaseExpenseRows.map((row) => (
                    <tr key={row.accountId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-3 font-mono text-xs text-amber-400 font-semibold print:text-slate-900">
                        {row.accountCode}
                      </td>
                      <td className="px-6 py-3 text-slate-200 font-medium print:text-slate-900">
                        {row.accountName}
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-slate-400 print:text-slate-700">
                        {formatCurrency(row.debit)}
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-slate-400 print:text-slate-700">
                        {formatCurrency(row.credit)}
                      </td>
                      <td className="px-6 py-3 text-right font-mono font-bold text-slate-100 print:text-slate-900">
                        {formatCurrency(row.netAmount)}
                      </td>
                    </tr>
                  ))}

                  {/* Operating Expense Header */}
                  <tr className="bg-slate-950/40 text-xs font-bold text-slate-400 uppercase tracking-wider print:bg-slate-50">
                    <td colSpan={5} className="px-6 py-2 pt-4">
                      Operating Expenses
                    </td>
                  </tr>
                  {report.operatingExpenseRows.map((row) => (
                    <tr key={row.accountId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-3 font-mono text-xs text-amber-400 font-semibold print:text-slate-900">
                        {row.accountCode}
                      </td>
                      <td className="px-6 py-3 text-slate-200 font-medium print:text-slate-900">
                        {row.accountName}
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-slate-400 print:text-slate-700">
                        {formatCurrency(row.debit)}
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-slate-400 print:text-slate-700">
                        {formatCurrency(row.credit)}
                      </td>
                      <td className="px-6 py-3 text-right font-mono font-bold text-slate-100 print:text-slate-900">
                        {formatCurrency(row.netAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-950/60 font-bold border-t border-slate-800 text-white print:bg-slate-100 print:text-slate-900 print:border-slate-300">
                    <td colSpan={4} className="px-6 py-4 text-right uppercase text-xs tracking-wider">
                      Total Expenses
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-rose-400 text-base print:text-slate-900">
                      {formatCurrency(report.totalExpenses)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Section 3: NET PROFIT SUMMARY BAR */}
          <div
            className={`p-6 rounded-2xl border flex flex-wrap items-center justify-between gap-4 shadow-md ${
              isProfitable
                ? "bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border-emerald-800/60"
                : "bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-900 border-rose-800/60"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                  isProfitable ? "bg-emerald-900 text-emerald-300" : "bg-rose-900 text-rose-300"
                }`}
              >
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white tracking-tight">NET PROFIT / LOSS</h4>
                <p className="text-xs text-slate-400">
                  Total Income ({formatCurrency(report.totalRevenue)}) − Total Expenses (
                  {formatCurrency(report.totalExpenses)})
                </p>
              </div>
            </div>

            <div className="text-right">
              <div
                className={`text-3xl font-extrabold font-mono tracking-tight ${
                  isProfitable ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {formatCurrency(report.netProfit)}
              </div>
              <div className="text-xs text-slate-400 font-medium">
                Profit Margin: {report.profitMarginPercentage}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
