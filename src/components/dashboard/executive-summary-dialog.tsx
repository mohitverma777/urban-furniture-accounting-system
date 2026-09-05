"use client";

import React, { useState } from "react";
import {
  Sparkles,
  X,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Copy,
  Printer,
  FileText,
  DollarSign,
  Loader2,
  Building,
} from "lucide-react";

interface ExecutiveSummaryData {
  metrics: {
    revenue: string;
    revenueTrend: string;
    expenses: string;
    expensesTrend: string;
    netProfit: string;
    margin: string;
    receivables: string;
    payables: string;
    cash: string;
  };
  observations: string[];
  recommendations: string[];
  narrative: string;
  generatedAt: string;
}

export function ExecutiveSummaryButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ExecutiveSummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setIsOpen(true);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/executive-summary");
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        setError(json.error || "Could not generate summary");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to executive summary service");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!data) return;
    const text = `
MONTHLY BUSINESS EXECUTIVE SUMMARY
Generated: ${data.generatedAt}
Urban Furniture Accounting & ERP

FINANCIAL HEALTH:
- Revenue: ${data.metrics.revenue} (${data.metrics.revenueTrend})
- Expenses: ${data.metrics.expenses} (${data.metrics.expensesTrend})
- Net Profit: ${data.metrics.netProfit} (Margin: ${data.metrics.margin})
- Receivables: ${data.metrics.receivables}
- Payables: ${data.metrics.payables}
- Liquid Cash: ${data.metrics.cash}

KEY OBSERVATIONS:
${data.observations.map((o, i) => `${i + 1}. ${o}`).join("\n")}

RECOMMENDED ACTIONS:
${data.recommendations.map((r, i) => `[Action ${i + 1}] ${r}`).join("\n")}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        onClick={handleGenerate}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:brightness-110 shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] border border-amber-300/40"
      >
        <Sparkles className="w-4 h-4 fill-slate-950 text-slate-950" />
        <span>Generate Business Summary</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    Executive Business Summary
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                      CFO AI Briefing
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Live synthesis of double-entry ledger, working capital, and operational risks.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loading && (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-center">
                  <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-200">Analyzing Double-Entry Ledger…</p>
                    <p className="text-xs text-slate-400">
                      Auditing revenues, operating costs, receivables, and inventory positions.
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Analysis Failed</h4>
                    <p className="text-xs text-rose-300/90 mt-1">{error}</p>
                    <button
                      onClick={handleGenerate}
                      className="mt-3 text-xs font-semibold px-3 py-1.5 bg-rose-900/60 hover:bg-rose-900 border border-rose-700 rounded-lg text-rose-200 transition-colors"
                    >
                      Retry Generation
                    </button>
                  </div>
                </div>
              )}

              {data && !loading && (
                <div className="space-y-6">
                  {/* Executive Narrative */}
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-sm text-slate-300 leading-relaxed border-l-4 border-l-amber-500">
                    <p className="font-medium text-slate-200 italic">“{data.narrative}”</p>
                    <span className="text-[10px] text-slate-500 block mt-2 font-mono">
                      Generated: {data.generatedAt}
                    </span>
                  </div>

                  {/* Financial KPI Cards */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                      Executive Scorecard
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {/* Revenue */}
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                        <span className="text-[11px] text-slate-400 font-medium">Revenue</span>
                        <div className="text-lg font-extrabold text-slate-100 font-mono">
                          {data.metrics.revenue}
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> {data.metrics.revenueTrend} MoM
                        </span>
                      </div>

                      {/* Expenses */}
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                        <span className="text-[11px] text-slate-400 font-medium">Expenses</span>
                        <div className="text-lg font-extrabold text-slate-100 font-mono">
                          {data.metrics.expenses}
                        </div>
                        <span className="text-[10px] font-semibold text-rose-400 flex items-center gap-1">
                          <TrendingDown className="w-3 h-3" /> {data.metrics.expensesTrend} MoM
                        </span>
                      </div>

                      {/* Net Profit */}
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                        <span className="text-[11px] text-slate-400 font-medium">Net Profit</span>
                        <div className="text-lg font-extrabold text-slate-100 font-mono">
                          {data.metrics.netProfit}
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-400">
                          {data.metrics.margin} Margin
                        </span>
                      </div>

                      {/* Receivables */}
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                        <span className="text-[11px] text-slate-400 font-medium">Receivables (AR)</span>
                        <div className="text-lg font-extrabold text-slate-100 font-mono">
                          {data.metrics.receivables}
                        </div>
                        <span className="text-[10px] text-amber-400">Uncollected bills</span>
                      </div>

                      {/* Payables */}
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                        <span className="text-[11px] text-slate-400 font-medium">Payables (AP)</span>
                        <div className="text-lg font-extrabold text-slate-100 font-mono">
                          {data.metrics.payables}
                        </div>
                        <span className="text-[10px] text-slate-400">Vendor obligations</span>
                      </div>

                      {/* Cash */}
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                        <span className="text-[11px] text-slate-400 font-medium">Cash Reserve</span>
                        <div className="text-lg font-extrabold text-slate-100 font-mono">
                          {data.metrics.cash}
                        </div>
                        <span className="text-[10px] text-emerald-400">Bank & On-Hand</span>
                      </div>
                    </div>
                  </div>

                  {/* Observations */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      <span>Key Financial Observations</span>
                    </h3>
                    <ul className="space-y-2 text-xs text-slate-300">
                      {data.observations.map((obs, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                          <span className="leading-relaxed">{obs}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Recommended Actions */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Recommended Management Actions</span>
                    </h3>
                    <div className="space-y-2 text-xs">
                      {data.recommendations.map((rec, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800"
                        >
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px] shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-slate-300 leading-relaxed">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {data && !loading && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/50 shrink-0">
                <span className="text-[10px] text-slate-500">
                  Derived from live general ledger double-entry items
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copied ? "Copied!" : "Copy Report"}</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
