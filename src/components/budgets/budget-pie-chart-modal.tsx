"use client";

import React from "react";
import type { BudgetReportItem } from "@/services/budgets";
import { formatCurrency } from "./budgets-client-shell";
import { X, PieChart as PieIcon, ArrowRight, CheckCircle, Percent } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

interface BudgetPieChartModalProps {
  item: BudgetReportItem | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenFormView?: (item: BudgetReportItem) => void;
}

export function BudgetPieChartModal({
  item,
  isOpen,
  onClose,
  onOpenFormView,
}: BudgetPieChartModalProps) {
  if (!isOpen || !item) return null;

  const planned = item.plannedAmount;
  const actual = item.actualAmount;
  const balance = Math.max(0, planned - actual);

  const pieData = [
    { name: "Achieved (Spent / Revenue)", value: actual / 100, color: "#38bdf8" },
    { name: "Balance (Remaining)", value: balance / 100, color: "#fb7185" },
  ];

  const achievedPct = item.utilizationPercentage;
  const balancePct = Math.max(0, Number((100 - achievedPct).toFixed(1)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-sky-950 text-sky-400 border border-sky-800 flex items-center justify-center font-bold">
              <PieIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-tight">
                {item.name}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Budget vs Actual Pie Breakdown
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          
          {/* Visual Pie Chart Graphic matching Excalidraw drawing */}
          <div className="relative w-full h-64 bg-slate-950/60 rounded-2xl border border-slate-800/80 flex items-center justify-center p-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  innerRadius={45}
                  paddingAngle={4}
                  stroke="#090d16"
                  strokeWidth={3}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "12px",
                    color: "#f8fafc",
                    fontSize: "12px",
                    fontWeight: "600",
                  }}
                  formatter={(val) => [`₹${Number(val).toLocaleString("en-IN")}`, "Amount"]}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Central Percentage */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-extrabold font-mono text-white">
                {achievedPct}%
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
                Achieved
              </span>
            </div>
          </div>

          {/* Breakdown Stat Cards */}
          <div className="grid grid-cols-2 gap-4">
            {/* Achieved Card */}
            <div className="p-4 rounded-2xl bg-sky-950/30 border border-sky-900/50 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                  Achieved
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-sky-900/80 text-sky-200">
                  {achievedPct}%
                </span>
              </div>
              <div className="text-lg font-extrabold text-white font-mono">
                {formatCurrency(actual)}
              </div>
              <span className="text-[11px] text-slate-400 block">Actual spend / revenue</span>
            </div>

            {/* Balance Card */}
            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-900/50 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                  Balance
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-rose-900/80 text-rose-200">
                  {balancePct}%
                </span>
              </div>
              <div className="text-lg font-extrabold text-white font-mono">
                {formatCurrency(balance)}
              </div>
              <span className="text-[11px] text-slate-400 block">Remaining target limit</span>
            </div>
          </div>

          {/* Total Summary Row */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 font-semibold">Total Planned Budget Target</span>
            <span className="font-extrabold text-amber-400 text-sm">
              {formatCurrency(planned)}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            Close
          </button>

          {onOpenFormView && (
            <button
              onClick={() => {
                onClose();
                onOpenFormView(item);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-md"
            >
              <span>Open Form View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
