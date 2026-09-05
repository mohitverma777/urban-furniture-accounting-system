"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import type { BudgetReportItem } from "@/services/budgets";
import type { AnalyticAccount } from "@/db/schema";
import { AnalyticAccountDialog } from "./analytic-account-dialog";
import { BudgetDialog } from "./budget-dialog";
import { BudgetDetailModal } from "./budget-detail-modal";
import { AnalyticDetailModal } from "./analytic-detail-modal";
import { BudgetPieChartModal } from "./budget-pie-chart-modal";
import {
  PieChart,
  Layers,
  Plus,
  Calendar,
  FileSpreadsheet,
  List,
  LayoutGrid,
  ChevronRight,
  ExternalLink,
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

/** SVG Pie Chart showing Achieved vs Balance progress with unique gradient IDs */
function MiniPieChart({
  achievedPct,
  itemId,
  onClick,
}: {
  achievedPct: number;
  itemId: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const pct = Math.min(100, Math.max(0, achievedPct));
  const cx = 18;
  const cy = 18;
  const r = 12;
  const strokeWidth = 5;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  const achievedGradId = `achievedGrad-${itemId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const balanceGradId = `balanceGrad-${itemId.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 px-2 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-sky-500/60 hover:bg-slate-900 transition-all group focus:outline-none shadow-sm"
      title="Click to view detailed Pie Chart breakdown"
    >
      <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
        <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 36 36">
          <defs>
            <linearGradient id={achievedGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
            <linearGradient id={balanceGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#fb7185" />
            </linearGradient>
          </defs>
          
          {/* Balance Sector (Solid Rose Ring) */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={`url(#${balanceGradId})`}
            strokeWidth={strokeWidth}
            strokeOpacity="0.8"
            fill="#090d16"
          />

          {/* Achieved Sector (Sky Blue Arc) */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={`url(#${achievedGradId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-500"
          />
        </svg>

        {/* Pie Icon inside center */}
        <PieChart className="w-3.5 h-3.5 text-sky-400 absolute group-hover:scale-110 transition-transform" />
      </div>

      <div className="flex flex-col text-left">
        <span className="text-xs font-mono font-extrabold text-white group-hover:text-amber-400 transition-colors">
          {Math.round(pct)}%
        </span>
        <span className="text-[9px] font-bold text-sky-400 uppercase tracking-tighter">
          Pie Chart
        </span>
      </div>
    </button>
  );
}

export function BudgetsClientShell({
  reportItems,
  analyticAccounts,
  budgetsList,
}: BudgetsClientShellProps) {
  const [activeTab, setActiveTab] = useState<"report" | "analytics" | "targets">("report");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");

  // Creation dialogs
  const [isAnalyticDialogOpen, setIsAnalyticDialogOpen] = useState(false);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);

  // Detail modals
  const [selectedBudgetItem, setSelectedBudgetItem] = useState<BudgetReportItem | null>(null);
  const [selectedAnalytic, setSelectedAnalytic] = useState<AnalyticAccount | null>(null);
  const [pieModalItem, setPieModalItem] = useState<BudgetReportItem | null>(null);

  // Summaries
  const totalPlanned = reportItems.reduce((sum, item) => sum + item.plannedAmount, 0);
  const totalActual = reportItems.reduce((sum, item) => sum + item.actualAmount, 0);
  const overBudgetCount = reportItems.filter((item) => item.status === "Over Budget").length;

  return (
    <div className="space-y-6 select-none">
      {/* Page Header */}
      <PageHeader
        title="Budgets & Cost Centers"
        description="Analytic accounts, budget vs actual variance analysis, and spend controls."
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedAnalytic(null);
                setIsAnalyticDialogOpen(true);
              }}
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
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1 text-sm font-semibold">
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
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900 text-slate-300 font-mono">
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
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900 text-slate-300 font-mono">
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
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900 text-slate-300 font-mono">
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

          {/* Report Toolbar Header with View Switcher (Excalidraw wireframe feature) */}
          <div className="flex items-center justify-between bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsBudgetDialogOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
              <div className="h-4 w-px bg-slate-800" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Budget Report View
              </span>
            </div>

            {/* List View vs Kanban View Switcher */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setViewMode("list")}
                title="List View"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === "list"
                    ? "bg-amber-500 text-slate-950 font-bold shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List View</span>
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                title="Kanban View"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === "kanban"
                    ? "bg-amber-500 text-slate-950 font-bold shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Kanban View</span>
              </button>
            </div>
          </div>

          {/* Budget Variance Report (List View vs Kanban View) */}
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
          ) : viewMode === "list" ? (
            /* LIST VIEW (Wireframe List View) */
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
              <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-amber-400" />
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Budget Report (List View)
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  Click any row to open full Form View
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-semibold">
                      <th className="px-6 py-3.5">Budget</th>
                      <th className="px-6 py-3.5">Start Date</th>
                      <th className="px-6 py-3.5">End Date</th>
                      <th className="px-6 py-3.5 text-center">Status</th>
                      <th className="px-6 py-3.5 text-center">Pie Chart</th>
                      <th className="px-6 py-3.5 text-right">Committed</th>
                      <th className="px-6 py-3.5 text-right">Achieved</th>
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

                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedBudgetItem(item)}
                          className="hover:bg-slate-800/60 cursor-pointer transition-colors"
                        >
                          <td className="px-6 py-4 font-semibold text-white">
                            <div className="flex items-center gap-2">
                              <span className="hover:text-amber-400 transition-colors font-bold">
                                {item.name}
                              </span>
                              {item.workflowStatus === "REVISED" && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
                                  Revised
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-slate-500 font-normal block">
                              {item.analyticName} ({item.analyticType})
                            </span>
                          </td>

                          <td className="px-6 py-4 text-xs font-mono text-slate-300">
                            {startDateStr}
                          </td>

                          <td className="px-6 py-4 text-xs font-mono text-slate-300">
                            {endDateStr}
                          </td>

                          <td className="px-6 py-4 text-center">
                            <span className="px-3 py-1 rounded-full text-xs font-bold font-mono border bg-slate-950 text-amber-300 border-amber-800/80">
                              {item.workflowStatus}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex justify-center items-center">
                              <MiniPieChart
                                achievedPct={item.utilizationPercentage}
                                itemId={item.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPieModalItem(item);
                                }}
                              />
                            </div>
                          </td>

                          <td className="px-6 py-4 text-right font-mono font-bold text-slate-200">
                            {formatCurrency(item.plannedAmount)}
                          </td>

                          <td className="px-6 py-4 text-right font-mono font-bold text-amber-400">
                            {formatCurrency(item.actualAmount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* KANBAN VIEW (Wireframe Kanban View) */
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-white">
                  Budget Report (Kanban View)
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  Click any card to open full Form View
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reportItems.map((item) => {
                  const startDateStr =
                    item.startDate instanceof Date
                      ? item.startDate.toISOString().split("T")[0]
                      : String(item.startDate);
                  const endDateStr =
                    item.endDate instanceof Date
                      ? item.endDate.toISOString().split("T")[0]
                      : String(item.endDate);

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedBudgetItem(item)}
                      className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg hover:border-amber-500/50 cursor-pointer transition-all hover:scale-[1.01] flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="font-extrabold text-white text-lg tracking-tight hover:text-amber-400">
                            {item.name}
                          </h4>
                          <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-slate-950 text-amber-400 border border-amber-800 font-bold">
                            {item.workflowStatus}
                          </span>
                        </div>

                        <div className="text-xs font-mono text-slate-400 space-y-1">
                          <div>
                            <span className="text-slate-500">Start Date: </span>
                            <span className="text-slate-200">{startDateStr}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">End Date: </span>
                            <span className="text-slate-200">{endDateStr}</span>
                          </div>
                        </div>
                      </div>

                      {/* Pie Chart & Utilization Gauge */}
                      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-4">
                        <div className="space-y-1 text-xs">
                          <span className="text-slate-400 font-semibold block">Committed</span>
                          <span className="font-mono font-bold text-white">
                            {formatCurrency(item.plannedAmount)}
                          </span>
                          <span className="text-slate-400 font-semibold block pt-1">Achieved</span>
                          <span className="font-mono font-bold text-amber-400">
                            {formatCurrency(item.actualAmount)}
                          </span>
                        </div>

                        <div className="flex flex-col items-center gap-1">
                          <MiniPieChart
                            achievedPct={item.utilizationPercentage}
                            itemId={item.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPieModalItem(item);
                            }}
                          />
                          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                            Progress
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                        <span className="font-mono">{item.analyticName}</span>
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          Open Form View <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
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
              onClick={() => {
                setSelectedAnalytic(null);
                setIsAnalyticDialogOpen(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-800 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create Cost Center</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {analyticAccounts.map((aa) => {
              const linkedCount = reportItems.filter((b) => b.analyticAccountId === aa.id).length;
              return (
                <div
                  key={aa.id}
                  onClick={() => setSelectedAnalytic(aa)}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-md hover:border-purple-500/50 cursor-pointer transition-all flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h4 className="font-bold text-white text-base hover:text-purple-300">{aa.name}</h4>
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
                    <span>{linkedCount} Linked Budgets</span>
                    <span className="text-purple-400 font-semibold flex items-center gap-1">
                      Open Form View <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
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
            {reportItems.map((bg) => {
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
                  onClick={() => setSelectedBudgetItem(bg)}
                  className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-md hover:border-amber-500/50 cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="font-bold text-white text-base hover:text-amber-400">{bg.name}</h4>
                    <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-purple-950 text-purple-300 border border-purple-900">
                      {bg.analyticName} ({bg.analyticType})
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
                    <span className="font-mono font-semibold text-emerald-400 flex items-center gap-1">
                      Open Form <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Standard Dialog Modals */}
      <AnalyticAccountDialog
        isOpen={isAnalyticDialogOpen}
        onClose={() => setIsAnalyticDialogOpen(false)}
      />

      <BudgetDialog
        isOpen={isBudgetDialogOpen}
        onClose={() => setIsBudgetDialogOpen(false)}
        analyticAccounts={analyticAccounts}
      />

      {/* Wireframe Interactive Modals */}
      <BudgetDetailModal
        budget={selectedBudgetItem}
        allBudgets={reportItems}
        isOpen={!!selectedBudgetItem}
        onClose={() => setSelectedBudgetItem(null)}
        onSelectBudget={(b) => setSelectedBudgetItem(b)}
        onOpenCreateNew={() => setIsBudgetDialogOpen(true)}
      />

      <AnalyticDetailModal
        analyticAccount={selectedAnalytic}
        allBudgets={reportItems}
        isOpen={!!selectedAnalytic}
        onClose={() => setSelectedAnalytic(null)}
        onSelectBudget={(b) => setSelectedBudgetItem(b)}
      />

      <BudgetPieChartModal
        item={pieModalItem}
        isOpen={!!pieModalItem}
        onClose={() => setPieModalItem(null)}
        onOpenFormView={(b) => setSelectedBudgetItem(b)}
      />
    </div>
  );
}
