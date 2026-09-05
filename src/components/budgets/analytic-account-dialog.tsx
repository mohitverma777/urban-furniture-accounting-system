"use client";

import React, { useState } from "react";
import { createAnalyticAccountAction } from "@/actions/budgets";
import type { AnalyticAccountType } from "@/db/schema";
import { X, Layers, Loader2 } from "lucide-react";

interface AnalyticAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AnalyticAccountDialog({ isOpen, onClose }: AnalyticAccountDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AnalyticAccountType>("EXPENSE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
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
      setError(result.error || "Failed to create analytic account.");
      return;
    }

    setName("");
    setType("EXPENSE");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-950 text-purple-400 border border-purple-900 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                New Analytic Cost Center
              </h3>
              <p className="text-xs text-slate-400">
                Track spend or revenue across departments or projects.
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
              Account / Cost Center Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Marketing, Manufacturing, Showroom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              Dimension Type <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType("EXPENSE")}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                  type === "EXPENSE"
                    ? "bg-rose-950/80 border-rose-700 text-rose-300 shadow-sm"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                EXPENSE (Cost Center)
              </button>

              <button
                type="button"
                onClick={() => setType("INCOME")}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                  type === "INCOME"
                    ? "bg-emerald-950/80 border-emerald-700 text-emerald-300 shadow-sm"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                INCOME (Revenue Center)
              </button>
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
                  <span>Creating...</span>
                </>
              ) : (
                <span>Save Analytic Account</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
