"use client";

import React, { useState } from "react";
import { Sparkles, X, Loader2, HelpCircle, CheckCircle2, ArrowRight } from "lucide-react";

interface AiExplainButtonProps {
  label?: string;
  question: string;
  contextType: "TRANSACTION" | "PROFIT_CHANGE" | "GST_LIABILITY" | "BUDGET_LIMIT" | "INVOICE_UNPAID" | "GENERAL";
  entityData?: any;
  variant?: "pill" | "outline" | "ghost" | "inline";
  className?: string;
}

export function AiExplainButton({
  label = "Explain with AI",
  question,
  contextType,
  entityData,
  variant = "pill",
  className = "",
}: AiExplainButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ explanation: string; keyFactors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = async () => {
    setIsOpen(true);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, contextType, entityData }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setResult(json.data);
      } else {
        setError(json.error || "Failed to analyze question");
      }
    } catch (err: any) {
      setError(err.message || "Network error while connecting to AI");
    } finally {
      setLoading(false);
    }
  };

  const getButtonStyles = () => {
    switch (variant) {
      case "pill":
        return "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-950/80 hover:bg-violet-900 border border-violet-800/80 text-violet-300 hover:text-violet-200 shadow-sm transition-all";
      case "outline":
        return "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-all";
      case "ghost":
        return "inline-flex items-center gap-1 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors";
      case "inline":
        return "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors";
      default:
        return "";
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        type="button"
        className={`${getButtonStyles()} ${className}`}
        title="Ask AI to explain this number or transaction"
      >
        <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />
        <span>{label}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2 text-violet-400">
                <Sparkles className="w-4 h-4" />
                <h3 className="text-sm font-bold text-slate-100">Accounting AI Explanation</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                  Question Asked
                </span>
                <p className="text-xs font-semibold text-slate-200">{question}</p>
              </div>

              {loading && (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-center">
                  <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                  <p className="text-xs text-slate-400">Analyzing ledger vouchers & financial mechanics…</p>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
                  {error}
                </div>
              )}

              {result && !loading && (
                <div className="space-y-4 text-xs">
                  {/* Analysis Narrative */}
                  <div className="p-3.5 rounded-xl bg-violet-950/30 border border-violet-800/40 text-slate-200 leading-relaxed">
                    <p className="font-medium text-slate-100">{result.explanation}</p>
                  </div>

                  {/* Driving Factors */}
                  {result.keyFactors && result.keyFactors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider">
                        Key Driving Factors
                      </h4>
                      <ul className="space-y-1.5">
                        {result.keyFactors.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-slate-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/50 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
