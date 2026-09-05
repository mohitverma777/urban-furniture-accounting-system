"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import type { BalanceSheetReport } from "@/services/reports";
import {
  Calendar,
  Printer,
  RotateCcw,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  PieChart,
  Scale,
  ShieldAlert,
} from "lucide-react";


interface BalanceSheetClientShellProps {
  report: BalanceSheetReport;
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

export function BalanceSheetClientShell({ report }: BalanceSheetClientShellProps) {
  const router = useRouter();

  const [asOfDate, setAsOfDate] = useState(report.asOfDate || "");

  const handleApplyFilter = (dateStr?: string) => {
    const d = dateStr !== undefined ? dateStr : asOfDate;

    const params = new URLSearchParams();
    if (d) params.set("asOfDate", d);

    const query = params.toString();
    router.push(`/reports/balance-sheet${query ? `?${query}` : ""}`);
  };

  const handleQuickPreset = (preset: "today" | "monthEnd" | "quarterEnd" | "yearEnd" | "allTime") => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (preset === "allTime") {
      setAsOfDate("");
      handleApplyFilter("");
      return;
    }

    if (preset === "today") {
      const todayStr = now.toISOString().split("T")[0];
      setAsOfDate(todayStr);
      handleApplyFilter(todayStr);
      return;
    }

    if (preset === "monthEnd") {
      const lastDayDate = new Date(year, month + 1, 0);
      const lastDay = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        lastDayDate.getDate()
      ).padStart(2, "0")}`;
      setAsOfDate(lastDay);
      handleApplyFilter(lastDay);
      return;
    }

    if (preset === "quarterEnd") {
      const qEndMonth = Math.floor(month / 3) * 3 + 3;
      const lastDayDate = new Date(year, qEndMonth, 0);
      const lastDay = `${year}-${String(qEndMonth).padStart(2, "0")}-${String(
        lastDayDate.getDate()
      ).padStart(2, "0")}`;
      setAsOfDate(lastDay);
      handleApplyFilter(lastDay);
      return;
    }

    if (preset === "yearEnd") {
      const yearEndStr = `${year}-12-31`;
      setAsOfDate(yearEndStr);
      handleApplyFilter(yearEndStr);
      return;
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="space-y-8">
      {/* Printable Header (Visible only during print) */}
      <div className="hidden print:block space-y-2 mb-6 border-b border-slate-300 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Urban Furniture Accounting</h1>
            <h2 className="text-lg font-semibold text-slate-700">Balance Sheet Statement</h2>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Generated: {new Date().toLocaleDateString("en-IN")}</p>
            <p>Source of Truth: Double-Entry Ledger</p>
          </div>
        </div>
        <p className="text-xs text-slate-600 font-medium">
          As Of Date: {report.asOfDate || "Present (All Posted Transactions)"}
        </p>
      </div>

      {/* Screen Header */}
      <div className="print:hidden">
        <PageHeader
          title="Balance Sheet"
          description="Real-time statement of financial position validating Assets = Liabilities + Capital."
          actions={
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              Print Statement
            </button>
          }
        />
      </div>

      {/* Date Filter & Quick Presets */}
      <div className="print:hidden p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Statement Date</span>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleQuickPreset("today")}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => handleQuickPreset("monthEnd")}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              Month End
            </button>
            <button
              onClick={() => handleQuickPreset("quarterEnd")}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              Quarter End
            </button>
            <button
              onClick={() => handleQuickPreset("yearEnd")}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              Year End
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
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1">As Of Date</label>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={() => handleApplyFilter()}
              className="flex-1 px-4 py-2 text-sm font-semibold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-sm"
            >
              Apply Date
            </button>

            {asOfDate && (
              <button
                onClick={() => {
                  setAsOfDate("");
                  handleApplyFilter("");
                }}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                title="Clear Date"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Accounting Equation Status Banner */}
      {!report.isBalanced && (
        <div className="p-5 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-200 flex items-start gap-4 shadow-lg animate-pulse">
          <div className="w-10 h-10 rounded-xl bg-rose-900 text-rose-300 border border-rose-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>WARNING: Balance Sheet Imbalance Detected</span>
            </h4>
            <p className="text-xs text-rose-300 leading-relaxed">
              The fundamental accounting equation <strong className="text-white">Assets = Liabilities + Capital</strong> is currently not balanced in the database!
            </p>
            <div className="pt-1 flex items-center gap-4 text-xs font-mono font-bold">
              <span>Assets: {formatCurrency(report.totalAssets)}</span>
              <span>Liabilities + Capital: {formatCurrency(report.totalLiabilitiesAndCapital)}</span>
              <span className="text-white underline underline-offset-2">
                Difference: {formatCurrency(report.difference)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Summary KPI Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Assets */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-md print:bg-white print:border-slate-300">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider print:text-slate-600">
              TOTAL ASSETS
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center print:hidden">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold text-white font-mono tracking-tight print:text-slate-900">
            {formatCurrency(report.totalAssets)}
          </div>
          <p className="text-xs text-slate-400">Cash, Bank, Debtors & Inventory</p>
        </div>

        {/* Total Liabilities & Capital */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-md print:bg-white print:border-slate-300">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider print:text-slate-600">
              TOTAL LIABILITIES & CAPITAL
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-950 text-blue-400 border border-blue-800 flex items-center justify-center print:hidden">
              <PieChart className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold text-white font-mono tracking-tight print:text-slate-900">
            {formatCurrency(report.totalLiabilitiesAndCapital)}
          </div>
          <div className="flex justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-1">
            <span>Liab: {formatCurrency(report.totalLiabilities)}</span>
            <span>Capital: {formatCurrency(report.totalCapital)}</span>
          </div>
        </div>

        {/* Equation Balance Status */}
        <div
          className={`p-6 rounded-2xl border space-y-3 shadow-md print:bg-white print:border-slate-300 ${
            report.isBalanced
              ? "bg-slate-900 border-emerald-500/40"
              : "bg-slate-900 border-rose-500/40"
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider print:text-slate-600">
              EQUATION STATUS
            </span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center print:hidden ${
                report.isBalanced
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                  : "bg-rose-950 text-rose-400 border border-rose-800"
              }`}
            >
              {report.isBalanced ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <ShieldAlert className="w-5 h-5" />
              )}
            </div>
          </div>

          <div
            className={`text-2xl lg:text-3xl font-extrabold font-mono tracking-tight print:text-slate-900 ${
              report.isBalanced ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {report.isBalanced ? "BALANCED" : "IMBALANCED"}
          </div>

          <div className="text-xs font-semibold text-slate-300">
            {report.isBalanced ? (
              <span className="text-emerald-400">Assets === Liabilities + Capital</span>
            ) : (
              <span className="text-rose-400">Difference: {formatCurrency(report.difference)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Account-Level Breakdown Tables */}
      {!report.hasData ? (
        <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">No Posted Transactions</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            No double-entry journal postings exist up to the selected date. Post customer invoices or vendor bills to see real-time balance sheet figures.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT COLUMN: ASSETS */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm print:bg-white print:border-slate-300">
            <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex justify-between items-center print:bg-slate-100 print:border-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <h3 className="text-base font-bold text-white tracking-tight print:text-slate-900">
                  ASSETS
                </h3>
              </div>
              <span className="text-xs font-mono font-semibold text-emerald-400 print:text-slate-900">
                {formatCurrency(report.totalAssets)}
              </span>
            </div>

            <div className="divide-y divide-slate-800/80 print:divide-slate-200">
              {/* Cash Accounts */}
              <div className="p-4 space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Cash (1000)
                </div>
                {report.cashAccounts.map((acc) => (
                  <div key={acc.accountId} className="flex justify-between items-center text-sm">
                    <span className="text-slate-200 font-medium print:text-slate-900">
                      <span className="font-mono text-amber-400 mr-2">{acc.accountCode}</span>
                      {acc.accountName}
                    </span>
                    <span className="font-mono font-semibold text-slate-100 print:text-slate-900">
                      {formatCurrency(acc.balance)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Bank Accounts */}
              <div className="p-4 space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Bank (1010)
                </div>
                {report.bankAccounts.map((acc) => (
                  <div key={acc.accountId} className="flex justify-between items-center text-sm">
                    <span className="text-slate-200 font-medium print:text-slate-900">
                      <span className="font-mono text-amber-400 mr-2">{acc.accountCode}</span>
                      {acc.accountName}
                    </span>
                    <span className="font-mono font-semibold text-slate-100 print:text-slate-900">
                      {formatCurrency(acc.balance)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Debtors Accounts */}
              <div className="p-4 space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Debtors / Accounts Receivable (1100)
                </div>
                {report.debtorsAccounts.map((acc) => (
                  <div key={acc.accountId} className="flex justify-between items-center text-sm">
                    <span className="text-slate-200 font-medium print:text-slate-900">
                      <span className="font-mono text-amber-400 mr-2">{acc.accountCode}</span>
                      {acc.accountName}
                    </span>
                    <span className="font-mono font-semibold text-slate-100 print:text-slate-900">
                      {formatCurrency(acc.balance)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Inventory Accounts */}
              <div className="p-4 space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Inventory (1200)
                </div>
                {report.inventoryAccounts.map((acc) => (
                  <div key={acc.accountId} className="flex justify-between items-center text-sm">
                    <span className="text-slate-200 font-medium print:text-slate-900">
                      <span className="font-mono text-amber-400 mr-2">{acc.accountCode}</span>
                      {acc.accountName}
                    </span>
                    <span className="font-mono font-semibold text-slate-100 print:text-slate-900">
                      {formatCurrency(acc.balance)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Other Asset Accounts */}
              {report.otherAssetAccounts.length > 0 && (
                <div className="p-4 space-y-2">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Other Assets
                  </div>
                  {report.otherAssetAccounts.map((acc) => (
                    <div key={acc.accountId} className="flex justify-between items-center text-sm">
                      <span className="text-slate-200 font-medium print:text-slate-900">
                        <span className="font-mono text-amber-400 mr-2">{acc.accountCode}</span>
                        {acc.accountName}
                      </span>
                      <span className="font-mono font-semibold text-slate-100 print:text-slate-900">
                        {formatCurrency(acc.balance)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Total Assets Summary Footer */}
              <div className="p-5 bg-slate-950/80 border-t border-slate-800 flex justify-between items-center font-bold text-base print:bg-slate-100 print:border-slate-300">
                <span className="text-white uppercase text-xs tracking-wider print:text-slate-900">
                  TOTAL ASSETS
                </span>
                <span className="font-mono text-emerald-400 text-lg print:text-slate-900">
                  {formatCurrency(report.totalAssets)}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: LIABILITIES & CAPITAL */}
          <div className="space-y-8">
            {/* LIABILITIES TABLE */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm print:bg-white print:border-slate-300">
              <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex justify-between items-center print:bg-slate-100 print:border-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <h3 className="text-base font-bold text-white tracking-tight print:text-slate-900">
                    LIABILITIES
                  </h3>
                </div>
                <span className="text-xs font-mono font-semibold text-rose-400 print:text-slate-900">
                  {formatCurrency(report.totalLiabilities)}
                </span>
              </div>

              <div className="divide-y divide-slate-800/80 print:divide-slate-200">
                {/* Creditors Accounts */}
                <div className="p-4 space-y-2">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Creditors / Accounts Payable (2000)
                  </div>
                  {report.creditorsAccounts.map((acc) => (
                    <div key={acc.accountId} className="flex justify-between items-center text-sm">
                      <span className="text-slate-200 font-medium print:text-slate-900">
                        <span className="font-mono text-amber-400 mr-2">{acc.accountCode}</span>
                        {acc.accountName}
                      </span>
                      <span className="font-mono font-semibold text-slate-100 print:text-slate-900">
                        {formatCurrency(acc.balance)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Tax Payable Accounts */}
                <div className="p-4 space-y-2">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Tax Payable / GST (2200)
                  </div>
                  {report.taxPayableAccounts.map((acc) => (
                    <div key={acc.accountId} className="flex justify-between items-center text-sm">
                      <span className="text-slate-200 font-medium print:text-slate-900">
                        <span className="font-mono text-amber-400 mr-2">{acc.accountCode}</span>
                        {acc.accountName}
                      </span>
                      <span className="font-mono font-semibold text-slate-100 print:text-slate-900">
                        {formatCurrency(acc.balance)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Other Liability Accounts */}
                {report.otherLiabilityAccounts.length > 0 && (
                  <div className="p-4 space-y-2">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Other Liabilities
                    </div>
                    {report.otherLiabilityAccounts.map((acc) => (
                      <div key={acc.accountId} className="flex justify-between items-center text-sm">
                        <span className="text-slate-200 font-medium print:text-slate-900">
                          <span className="font-mono text-amber-400 mr-2">{acc.accountCode}</span>
                          {acc.accountName}
                        </span>
                        <span className="font-mono font-semibold text-slate-100 print:text-slate-900">
                          {formatCurrency(acc.balance)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Total Liabilities Footer */}
                <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex justify-between items-center font-bold text-sm print:bg-slate-100 print:border-slate-300">
                  <span className="text-white uppercase text-xs tracking-wider print:text-slate-900">
                    TOTAL LIABILITIES
                  </span>
                  <span className="font-mono text-rose-400 text-base print:text-slate-900">
                    {formatCurrency(report.totalLiabilities)}
                  </span>
                </div>
              </div>
            </div>

            {/* CAPITAL / EQUITY TABLE */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm print:bg-white print:border-slate-300">
              <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex justify-between items-center print:bg-slate-100 print:border-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                  <h3 className="text-base font-bold text-white tracking-tight print:text-slate-900">
                    CAPITAL & EQUITY
                  </h3>
                </div>
                <span className="text-xs font-mono font-semibold text-blue-400 print:text-slate-900">
                  {formatCurrency(report.totalCapital)}
                </span>
              </div>

              <div className="divide-y divide-slate-800/80 print:divide-slate-200">
                {/* Capital Accounts */}
                <div className="p-4 space-y-2">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Capital Accounts (3000)
                  </div>
                  {report.capitalAccounts.map((acc) => (
                    <div key={acc.accountId} className="flex justify-between items-center text-sm">
                      <span className="text-slate-200 font-medium print:text-slate-900">
                        <span className="font-mono text-amber-400 mr-2">{acc.accountCode}</span>
                        {acc.accountName}
                      </span>
                      <span className="font-mono font-semibold text-slate-100 print:text-slate-900">
                        {formatCurrency(acc.balance)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Current Period Profit */}
                <div className="p-4 space-y-2">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Current Period Profit (P&L Derived)
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-200 font-medium print:text-slate-900">
                      Retained Earnings / Current Period Net Profit
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        report.currentPeriodProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                      } print:text-slate-900`}
                    >
                      {formatCurrency(report.currentPeriodProfit)}
                    </span>
                  </div>
                </div>

                {/* Total Capital Footer */}
                <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex justify-between items-center font-bold text-sm print:bg-slate-100 print:border-slate-300">
                  <span className="text-white uppercase text-xs tracking-wider print:text-slate-900">
                    TOTAL CAPITAL
                  </span>
                  <span className="font-mono text-blue-400 text-base print:text-slate-900">
                    {formatCurrency(report.totalCapital)}
                  </span>
                </div>
              </div>
            </div>

            {/* GRAND TOTAL: LIABILITIES & CAPITAL */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/80 via-slate-900 to-slate-900 border border-blue-800/60 flex justify-between items-center font-bold shadow-md print:bg-white print:border-slate-300">
              <div>
                <span className="text-white uppercase text-xs tracking-wider block print:text-slate-900">
                  TOTAL LIABILITIES & CAPITAL
                </span>
                <span className="text-xs text-slate-400 font-normal">
                  Liabilities ({formatCurrency(report.totalLiabilities)}) + Capital ({formatCurrency(report.totalCapital)})
                </span>
              </div>
              <span className="font-mono text-blue-400 text-xl print:text-slate-900">
                {formatCurrency(report.totalLiabilitiesAndCapital)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
