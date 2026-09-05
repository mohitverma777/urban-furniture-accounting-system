"use client";

import React, { useState } from "react";
import type { AnalyticAccount } from "@/db/schema";
import type { BudgetReportItem } from "@/services/budgets";
import { formatCurrency } from "./budgets-client-shell";
import { createAnalyticAccountAction } from "@/actions/budgets";
import { X, ArrowLeft, Plus, CheckCircle, Layers, Calendar, ChevronRight, Loader2 } from "lucide-react";

interface AnalyticDetailModalProps {
  analyticAccount: AnalyticAccount | null;
  allBudgets: BudgetReportItem[];
  isOpen: boolean;
  onClose: () => void;
  onSelectBudget?: (budget: BudgetReportItem) => void;
}

export function AnalyticDetailModal({
  analyticAccount,
  allBudgets,
  isOpen,
  onClose,
  onSelectBudget,
}: AnalyticDetailModalProps) {
  const [name, setName] = useState(analyticAccount?.name || "");
  const [type, setType] = useState<"INCOME" | "EXPENSE">(analyticAccount?.type || "EXPENSE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (analyticAccount) {
      setName(analyticAccount.name);
      setType(analyticAccount.type as "INCOME" | "EXPENSE");
    } else {
      setName("");
      setType("EXPENSE");
    }
  }, [analyticAccount]);

  if (!isOpen) return null;

  const linkedBudgets = analyticAccount
    ? allBudgets.filter((b) => b.analyticAccountId === analyticAccount.id)
    : [];

  const handleSaveConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Analytic account name is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await createAnalyticAccountAction({
      name: name.trim(),
      type,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || "Failed to save analytic account.");
      return;
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden text-slate-100">
        
        {/* Top Control Bar (Matching Excalidraw Analyticals Form View Header) */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setName("");
                setType("EXPENSE");
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>

            <button
              onClick={handleSaveConfirm}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5" />
              )}
              <span>Confirm</span>
            </button>

            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
              Analytic Form View
            </span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-xs font-semibold text-rose-300">
              {error}
            </div>
          )}

          {/* Fields: Analytic Account Name & Type Dropdown */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Analytic Account Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Furniture, Marketing, Retail Store"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 font-semibold"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Type (Dropdown Selection) <span className="text-rose-400">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "INCOME" | "EXPENSE")}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-purple-500 font-semibold"
              >
                <option value="EXPENSE">Expense (Cost Center)</option>
                <option value="INCOME">Income (Revenue Center)</option>
              </select>
            </div>
          </div>

          {/* Bottom Table: "All the Budget list where the Analytic Account is used" */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                All the Budget list where the Analytic Account is used
              </h3>
              <span className="text-xs font-mono text-purple-300 font-semibold">
                {linkedBudgets.length} Budget Targets
              </span>
            </div>

            {linkedBudgets.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-950/40 border border-slate-800/80 text-center space-y-2">
                <p className="text-xs text-slate-400">
                  No active budget targets found using this analytic account.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/40">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 font-bold uppercase">
                        <th className="px-4 py-3">Budget</th>
                        <th className="px-4 py-3">Start Date</th>
                        <th className="px-4 py-3">End Date</th>
                        <th className="px-4 py-3 text-right">Committed</th>
                        <th className="px-4 py-3 text-right">Achieved</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {linkedBudgets.map((b) => {
                        const startDateStr =
                          b.startDate instanceof Date
                            ? b.startDate.toISOString().split("T")[0]
                            : String(b.startDate);
                        const endDateStr =
                          b.endDate instanceof Date
                            ? b.endDate.toISOString().split("T")[0]
                            : String(b.endDate);

                        return (
                          <tr
                            key={b.id}
                            onClick={() => {
                              if (onSelectBudget) {
                                onClose();
                                onSelectBudget(b);
                              }
                            }}
                            className="hover:bg-slate-800/60 cursor-pointer transition-colors"
                          >
                            <td className="px-4 py-3.5 font-bold text-amber-400 hover:underline">
                              {b.name}
                            </td>
                            <td className="px-4 py-3.5 text-slate-300">{startDateStr}</td>
                            <td className="px-4 py-3.5 text-slate-300">{endDateStr}</td>
                            <td className="px-4 py-3.5 text-right font-bold text-white">
                              {formatCurrency(b.plannedAmount)}
                            </td>
                            <td className="px-4 py-3.5 text-right font-bold text-emerald-400">
                              {formatCurrency(b.actualAmount)}
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
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
