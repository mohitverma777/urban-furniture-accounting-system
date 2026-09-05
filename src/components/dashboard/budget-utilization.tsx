import React from "react";
import type { BudgetUtilizationItem } from "@/services/dashboard/types";

export function BudgetUtilization({ items }: { items: BudgetUtilizationItem[] }) {
  if (items.length === 0) {
    return (
      <div className="p-6 text-center text-slate-400 text-sm">
        No active budgets configured.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((b) => (
        <div key={b.id} className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-200">{b.name}</span>
            <span className="font-mono text-slate-400">
              ₹{(b.practicalAmount / 100).toLocaleString("en-IN")} / ₹
              {(b.plannedAmount / 100).toLocaleString("en-IN")} ({b.utilizationPercentage}%)
            </span>
          </div>

          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                b.utilizationPercentage >= 90
                  ? "bg-rose-500"
                  : b.utilizationPercentage >= 75
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, Math.max(5, b.utilizationPercentage))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
