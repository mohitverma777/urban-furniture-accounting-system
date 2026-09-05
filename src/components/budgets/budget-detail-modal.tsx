"use client";

import React, { useState } from "react";
import type { BudgetReportItem } from "@/services/budgets";
import { updateBudgetStatusAction, reviseBudgetAction } from "@/actions/budgets";
import { formatCurrency } from "./budgets-client-shell";
import { X, ArrowLeft, Plus, CheckCircle, RefreshCw, XCircle, ChevronRight, User, Calendar, Link as LinkIcon, Loader2 } from "lucide-react";

interface BudgetDetailModalProps {
  budget: BudgetReportItem | null;
  allBudgets: BudgetReportItem[];
  isOpen: boolean;
  onClose: () => void;
  onSelectBudget?: (budget: BudgetReportItem) => void;
  onOpenCreateNew?: () => void;
}

export function BudgetDetailModal({
  budget,
  allBudgets,
  isOpen,
  onClose,
  onSelectBudget,
  onOpenCreateNew,
}: BudgetDetailModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRevisingModalOpen, setIsRevisingModalOpen] = useState(false);
  const [revisedAmountRupees, setRevisedAmountRupees] = useState("");
  const [revisedResponsible, setRevisedResponsible] = useState("");

  if (!isOpen || !budget) return null;

  const startDateStr =
    budget.startDate instanceof Date
      ? budget.startDate.toISOString().split("T")[0]
      : String(budget.startDate);

  const endDateStr =
    budget.endDate instanceof Date
      ? budget.endDate.toISOString().split("T")[0]
      : String(budget.endDate);

  const committedRupees = budget.plannedAmount / 100;
  const achievedRupees = budget.actualAmount / 100;
  const amountToAchieveRupees = Math.max(0, committedRupees - achievedRupees);
  const achievedPct = budget.plannedAmount > 0 ? (budget.actualAmount / budget.plannedAmount) * 100 : 0;

  // Handler to update budget status
  const handleStatusChange = async (newStatus: "CONFIRMED" | "CANCELLED") => {
    setIsUpdating(true);
    await updateBudgetStatusAction({ id: budget.id, status: newStatus });
    setIsUpdating(false);
    onClose();
  };

  // Handler to open revision form
  const handleOpenRevise = () => {
    setRevisedAmountRupees(String(budget.plannedAmount / 100));
    setRevisedResponsible(budget.responsiblePerson || "");
    setIsRevisingModalOpen(true);
  };

  const handleConfirmRevise = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(revisedAmountRupees);
    if (isNaN(amount) || amount <= 0) return;

    setIsUpdating(true);
    const res = await reviseBudgetAction({
      originalId: budget.id,
      plannedAmountRupees: amount,
      responsiblePerson: revisedResponsible.trim() || undefined,
    });
    setIsUpdating(false);
    setIsRevisingModalOpen(false);
    if (res.success) {
      onClose();
    }
  };

  const linkedRevisionOf = budget.revisionOfId
    ? allBudgets.find((b) => b.id === budget.revisionOfId)
    : null;
  const linkedRevisedWith = budget.revisedWithId
    ? allBudgets.find((b) => b.id === budget.revisedWithId)
    : null;

  // Pipeline stepper states
  const steps: { key: "DRAFT" | "CONFIRMED" | "REVISED" | "CANCELLED"; label: string }[] = [
    { key: "DRAFT", label: "Draft" },
    { key: "CONFIRMED", label: "Confirm" },
    { key: "REVISED", label: "Revised" },
    { key: "CANCELLED", label: "Cancelled" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden text-slate-100">
        
        {/* Top Control Bar (Matching Wireframe Header) */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          {/* Action Buttons: New, Confirm, Revise, Cancel, Back */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                onClose();
                if (onOpenCreateNew) onOpenCreateNew();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>

            {budget.workflowStatus === "DRAFT" && (
              <button
                disabled={isUpdating}
                onClick={() => handleStatusChange("CONFIRMED")}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Confirm</span>
              </button>
            )}

            {budget.workflowStatus !== "CANCELLED" && (
              <button
                disabled={isUpdating}
                onClick={handleOpenRevise}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Revise</span>
              </button>
            )}

            {budget.workflowStatus !== "CANCELLED" && (
              <button
                disabled={isUpdating}
                onClick={() => handleStatusChange("CANCELLED")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 transition-colors shadow-sm disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          </div>

          {/* Status Pipeline Stepper */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800/80 text-xs font-mono">
            {steps.map((step, idx) => {
              const isActive = budget.workflowStatus === step.key;
              return (
                <React.Fragment key={step.key}>
                  {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-600" />}
                  <span
                    className={`px-3 py-1 rounded-xl transition-all ${
                      isActive
                        ? "bg-amber-500 text-slate-950 font-extrabold shadow"
                        : "text-slate-500"
                    }`}
                  >
                    {step.label}
                  </span>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Modal Form Details (Matching Wireframe Layout) */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Header Title */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>{budget.name}</span>
              {budget.workflowStatus === "REVISED" && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-mono font-normal">
                  Revised Budget
                </span>
              )}
            </h2>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-purple-950 text-purple-300 border border-purple-900 font-semibold">
              {budget.analyticName} ({budget.analyticType})
            </span>
          </div>

          {/* Key Form Fields Block */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-2xl bg-slate-950/60 border border-slate-800 text-sm">
            {/* Left Column */}
            <div className="space-y-3">
              <div>
                <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
                  Budget Name
                </span>
                <span className="text-base font-bold text-white">{budget.name}</span>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
                  Budget Period
                </span>
                <div className="flex items-center gap-2 text-slate-200 font-mono mt-0.5">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span>{startDateStr}</span>
                  <span className="text-slate-500">To</span>
                  <span>{endDateStr}</span>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-3">
              <div>
                <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
                  Responsible
                </span>
                <div className="flex items-center gap-2 text-slate-200 font-semibold mt-0.5">
                  <User className="w-4 h-4 text-purple-400" />
                  <span>{budget.responsiblePerson || "Not Assigned"}</span>
                </div>
              </div>

              {/* Revision Links (Wireframe fields: Revision Of / Revised With) */}
              {linkedRevisionOf && (
                <div>
                  <span className="text-xs font-semibold text-amber-400 block uppercase tracking-wider">
                    Revision Of
                  </span>
                  <button
                    onClick={() => onSelectBudget && onSelectBudget(linkedRevisionOf)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 underline mt-0.5"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>{linkedRevisionOf.name} (Original Budget)</span>
                  </button>
                </div>
              )}

              {linkedRevisedWith && (
                <div>
                  <span className="text-xs font-semibold text-emerald-400 block uppercase tracking-wider">
                    Revised With
                  </span>
                  <button
                    onClick={() => onSelectBudget && onSelectBudget(linkedRevisedWith)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 hover:text-emerald-200 underline mt-0.5"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>{linkedRevisedWith.name} (Revised Budget)</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Budget Lines Table (Matching Excalidraw Table) */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Budget Item Lines
            </h3>

            <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/40">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 font-bold uppercase">
                      <th className="px-4 py-3">Analytic</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3 text-right">Committed Amount</th>
                      <th className="px-4 py-3 text-right">Achieved Amount</th>
                      <th className="px-4 py-3 text-right">Achieved %</th>
                      <th className="px-4 py-3 text-right">Amount To Achieve</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    <tr className="hover:bg-slate-800/40 font-semibold">
                      <td className="px-4 py-3.5 text-purple-300 font-bold">
                        {budget.analyticName}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-900 border border-slate-800 text-slate-300">
                          {budget.analyticType}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-white">
                        {formatCurrency(budget.plannedAmount)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-amber-400">
                        {formatCurrency(budget.actualAmount)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-emerald-400">
                        {achievedPct.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-300">
                        {formatCurrency(Math.max(0, budget.plannedAmount - budget.actualAmount))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
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

      {/* Revision Inner Modal */}
      {isRevisingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-400" />
                <span>Revise Budget Target</span>
              </h3>
              <button
                onClick={() => setIsRevisingModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmRevise} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">
                  New Committed Budget Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={revisedAmountRupees}
                  onChange={(e) => setRevisedAmountRupees(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Responsible Person</label>
                <input
                  type="text"
                  placeholder="e.g. Finance Manager"
                  value={revisedResponsible}
                  onChange={(e) => setRevisedResponsible(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRevisingModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow"
                >
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Revision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
