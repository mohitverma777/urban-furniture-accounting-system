"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import type { BudgetReportItem } from "@/services/budgets";
import type { AnalyticAccount } from "@/db/schema";
import { AnalyticAccountDialog } from "./analytic-account-dialog";
import { BudgetDialog } from "./budget-dialog";
import {
  PieChart,
  Layers,
  Plus,
  Calendar,
  FileSpreadsheet,
} from "lucide-react";


interface BudgetsClientShellProps {
  reportItems: BudgetReportItem[];
  analyticAccounts: AnalyticAccount[];
  budgetsList: {
    id: string;
    name: string;
    plannedAmount: number;
    startDate: Date;
    endDate: Date;
    analyticName: string | null;
    analyticType: string | null;
  }[];
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

export function BudgetsClientShell({
  reportItems,
  analyticAccounts,
  budgetsList,
}: BudgetsClientShellProps) {
  const [activeTab, setActiveTab] = useState<"report" | "analytics" | "targets">("report");

  const [isAnalyticDialogOpen, setIsAnalyticDialogOpen] = useState(false);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);

  // Summaries
  const totalPlanned = reportItems.reduce((sum, item) => sum + item.plannedAmount, 0);
  const totalActual = reportItems.reduce((sum, item) => sum + item.actualAmount, 0);
  const overBudgetCount = reportItems.filter((item) => item.status === "Over Budget").length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Budgets & Cost Centers"
        description="Analytic accounts, budget vs actual variance analysis, and spend controls."
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAnalyticDialogOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 shadow-sm transition-colors"
            >
              <Layers className="w-4 h-4" />
              <span>Add Cost Center</span>
            </button>
            <button
              onClick={() => setIsBudgetDialogOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Create Budget</span>
            </button>
          </div>
        }
      />

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1 text-sm font-semibold select-none">
        <button
          onClick={() => setActiveTab("report")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === "report"
              ? "bg-slate-800 text-amber-400 border border-slate-700 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>Budget Variance Report</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900 text-slate-300">
            {reportItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === "analytics"
              ? "bg-slate-800 text-purple-400 border border-slate-700 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Analytic Cost Centers</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900 text-slate-300">
            {analyticAccounts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("targets")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === "targets"
              ? "bg-slate-800 text-amber-400 border border-slate-700 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Budget Targets</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900 text-slate-300">
            {budgetsList.length}
          </span>
        </button>
      </div>

      {/* TAB 1: BUDGET VARIANCE REPORT */}
      {activeTab === "report" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-md">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Planned Budget
              </span>
              <div className="text-2xl lg:text-3xl font-extrabold text-white font-mono tracking-tight">
                {formatCurrency(totalPlanned)}
              </div>
              <p className="text-xs text-slate-400">Target spend across all active cost centers</p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-md">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Actual Spend
              </span>
              <div className="text-2xl lg:text-3xl font-extrabold text-amber-400 font-mono tracking-tight">
                {formatCurrency(totalActual)}
              </div>
              <p className="text-xs text-slate-400">Calculated strictly from posted journal lines</p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-md">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Over Budget Targets
              </span>
              <div className="flex items-center justify-between">
                <div
                  className={`text-2xl lg:text-3xl font-extrabold font-mono tracking-tight ${
                    overBudgetCount > 0 ? "text-rose-400" : "text-emerald-400"
                  }`}
                >
                  {overBudgetCount}
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    overBudgetCount > 0
                      ? "bg-rose-950 text-rose-300 border border-rose-800"
                      : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                  }`}
                >
                  {overBudgetCount > 0 ? "Requires Attention" : "All Limits Safe"}
                </span>
              </div>
              <p className="text-xs text-slate-400">Budgets exceeding 100% utilization</p>
            </div>
          </div>

          {/* Variance Report Table */}
          {reportItems.length === 0 ? (
            <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">No Budget Reports Available</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Create budget targets for analytic cost centers to start tracking real-time variance and utilization percentages.
              </p>
              <button
                onClick={() => setIsBudgetDialogOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-sm hover:bg-amber-400 transition-colors shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Budget Target</span>
              </button>
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
              <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-amber-400" />
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Budget vs Actual Variance Report
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {reportItems.length} Budgets Evaluated
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-semibold">
                      <th className="px-6 py-3.5">Budget Name</th>
                      <th className="px-6 py-3.5">Analytic Center</th>
                      <th className="px-6 py-3.5 text-right">Planned Target</th>
                      <th className="px-6 py-3.5 text-right">Actual Spend</th>
                      <th className="px-6 py-3.5 text-right">Variance</th>
                      <th className="px-6 py-3.5">Progress & Utilization</th>
                      <th className="px-6 py-3.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {reportItems.map((item) => {
                      const startDateStr =
                        item.startDate instanceof Date
                          ? item.startDate.toISOString().split("T")[0]
                          : String(item.startDate);
                      const endDateStr =
                        item.endDate instanceof Date
                          ? item.endDate.toISOString().split("T")[0]
                          : String(item.endDate);

                      // Progress bar colors
                      let barColor = "bg-emerald-500";
                      let badgeStyle = "bg-emerald-950 text-emerald-300 border-emerald-800";
                      if (item.status === "Near Limit") {
                        barColor = "bg-amber-500";
                        badgeStyle = "bg-amber-950 text-amber-300 border-amber-800";
                      } else if (item.status === "Over Budget") {
                        barColor = "bg-rose-500";
                        badgeStyle = "bg-rose-950 text-rose-300 border-rose-800";
                      }

                      const clampedPercentage = Math.min(100, Math.max(0, item.utilizationPercentage));

                      return (
                        <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-4 font-semibold text-white">
                            <div>{item.name}</div>
                            <span className="text-[11px] font-mono text-slate-500 font-normal">
                              {startDateStr} — {endDateStr}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-purple-950 text-purple-300 border border-purple-900">
                              {item.analyticName} ({item.analyticType})
                            </span>
                          </td>

                          <td className="px-6 py-4 text-right font-mono font-bold text-slate-200">
                            {formatCurrency(item.plannedAmount)}
                          </td>

                          <td className="px-6 py-4 text-right font-mono font-bold text-amber-400">
                            {formatCurrency(item.actualAmount)}
                          </td>

                          <td className="px-6 py-4 text-right font-mono font-semibold text-slate-300">
                            {formatCurrency(item.varianceAmount)}
                          </td>

                          <td className="px-6 py-4 w-48">
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-xs font-mono">
                                <span className="text-slate-400">Utilization</span>
                                <span className="font-bold text-white">
                                  {item.utilizationPercentage}%
                                </span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                                <div
                                  className={`h-full rounded-full transition-all ${barColor}`}
                                  style={{ width: `${clampedPercentage}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-center">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold border ${badgeStyle}`}
                            >
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ANALYTIC COST CENTERS */}
      {activeTab === "analytics" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Analytic Accounts (Cost & Revenue Centers)</h3>
            <button
              onClick={() => setIsAnalyticDialogOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-800 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create Cost Center</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {analyticAccounts.map((aa) => (
              <div
                key={aa.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-md hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-base">{aa.name}</h4>
                    <span className="text-xs text-slate-400 font-mono">
                      ID: {aa.id.substring(0, 8)}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono border ${
                      aa.type === "EXPENSE"
                        ? "bg-rose-950 text-rose-300 border-rose-900"
                        : "bg-emerald-950 text-emerald-300 border-emerald-900"
                    }`}
                  >
                    {aa.type}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
                  <span>Created: {new Date(aa.createdAt).toLocaleDateString("en-IN")}</span>
                  <span className="text-amber-400 font-semibold">Active Tag</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: BUDGET CONFIGURATIONS */}
      {activeTab === "targets" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Configured Budget Targets</h3>
            <button
              onClick={() => setIsBudgetDialogOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create Budget Target</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {budgetsList.map((bg) => {
              const startDateStr =
                bg.startDate instanceof Date
                  ? bg.startDate.toISOString().split("T")[0]
                  : String(bg.startDate);
              const endDateStr =
                bg.endDate instanceof Date
                  ? bg.endDate.toISOString().split("T")[0]
                  : String(bg.endDate);

              return (
                <div
                  key={bg.id}
                  className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-md"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="font-bold text-white text-base">{bg.name}</h4>
                    <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-purple-950 text-purple-300 border border-purple-900">
                      {bg.analyticName || "General"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <span className="text-xs text-slate-400 block">Planned Target Amount</span>
                    <span className="font-mono font-extrabold text-white text-xl">
                      {formatCurrency(bg.plannedAmount)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-slate-800/80 text-xs">
                    <span className="text-slate-400">
                      Period: {startDateStr} — {endDateStr}
                    </span>
                    <span className="font-mono font-semibold text-emerald-400">Target Configured</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dialog Modals */}
      <AnalyticAccountDialog
        isOpen={isAnalyticDialogOpen}
        onClose={() => setIsAnalyticDialogOpen(false)}
      />

      <BudgetDialog
        isOpen={isBudgetDialogOpen}
        onClose={() => setIsBudgetDialogOpen(false)}
        analyticAccounts={analyticAccounts}
      />
    </div>
  );
}
