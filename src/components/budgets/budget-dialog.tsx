"use client";

import React, { useState } from "react";
import { createBudgetAction } from "@/actions/budgets";
import type { AnalyticAccount } from "@/db/schema";
import { X, PieChart, Loader2 } from "lucide-react";

interface BudgetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  analyticAccounts: AnalyticAccount[];
}

export function BudgetDialog({ isOpen, onClose, analyticAccounts }: BudgetDialogProps) {
  const [name, setName] = useState("");
  const [analyticAccountId, setAnalyticAccountId] = useState(
    analyticAccounts[0]?.id || ""
  );
  const [plannedAmountRupees, setPlannedAmountRupees] = useState("");
  const [startDate, setStartDate] = useState(
    `${new Date().getFullYear()}-01-01`
  );
  const [endDate, setEndDate] = useState(
    `${new Date().getFullYear()}-12-31`
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Budget name is required.");
      return;
    }

    if (!analyticAccountId) {
      setError("Please select an analytic account.");
      return;
    }

    const amountNum = parseFloat(plannedAmountRupees);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid planned amount greater than 0.");
      return;
    }

    if (!startDate || !endDate || startDate >= endDate) {
      setError("Start date must be earlier than end date.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await createBudgetAction({
      name: name.trim(),
      analyticAccountId,
      plannedAmountRupees: amountNum,
      startDate,
      endDate,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || "Failed to create budget.");
      return;
    }

    setName("");
    setPlannedAmountRupees("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-950 text-amber-400 border border-amber-900 flex items-center justify-center font-bold">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                New Budget Target
              </h3>
              <p className="text-xs text-slate-400">
                Set planned spend or revenue targets for variance analysis.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-xs font-semibold text-rose-300">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              Budget Target Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Annual Marketing Budget 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Analytic Cost / Revenue Center <span className="text-rose-400">*</span>
              </label>
              <select
                value={analyticAccountId}
                onChange={(e) => setAnalyticAccountId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                required
              >
                {analyticAccounts.map((aa) => (
                  <option key={aa.id} value={aa.id}>
                    {aa.name} ({aa.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Planned Target Amount (₹) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="500000"
                value={plannedAmountRupees}
                onChange={(e) => setPlannedAmountRupees(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Start Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                End Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors disabled:opacity-50 shadow-md"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Create Budget Target</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
