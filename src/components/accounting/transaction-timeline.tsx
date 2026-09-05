"use client";

import React from "react";
import {
  FileText,
  FileCheck,
  Boxes,
  CreditCard,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { TransactionTimelineData, TimelineStep } from "@/services/accounting/timeline";

export interface TransactionTimelineProps {
  timeline: TransactionTimelineData | null;
}

export function TransactionTimeline({ timeline }: TransactionTimelineProps) {
  if (!timeline || timeline.steps.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-xs shadow-md">
        No transaction timeline events recorded yet. Convert draft order to post double-entry vouchers.
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
      {/* Timeline Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h3 className="font-bold text-lg text-white flex items-center gap-2">
            <span>Accounting Impact &amp; Transaction Timeline</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Step-by-step life cycle from commercial agreement to double-entry journal posting, warehouse stock movement, and payment settlement.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-violet-950 text-violet-300 border border-violet-800">
            {timeline.orderNumber}
          </span>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
            {timeline.totalAmountFormatted}
          </span>
        </div>
      </div>

      {/* Timeline Steps Stream */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
        {timeline.steps.map((step) => (
          <TimelineStepCard key={step.id} step={step} />
        ))}
      </div>
    </div>
  );
}

function TimelineStepCard({ step }: { step: TimelineStep }) {
  const categoryIcon = getCategoryIcon(step.category);
  const categoryColor = getCategoryColor(step.category);

  return (
    <div className="relative group">
      {/* Node Dot / Icon */}
      <div
        className={`absolute -left-6 sm:-left-8 top-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full border flex items-center justify-center -translate-x-1/2 z-10 transition-transform group-hover:scale-110 ${categoryColor.dot}`}
      >
        {categoryIcon}
      </div>

      {/* Step Content Card */}
      <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-3 shadow-md hover:border-slate-700 transition-colors">
        {/* Step Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-900 pb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-sm text-white">{step.title}</h4>
            {step.statusBadge && (
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {step.statusBadge}
              </span>
            )}
          </div>
          <span className="text-xs font-mono text-slate-500">{step.date}</span>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-300 leading-relaxed">{step.description}</p>

        {/* Double-Entry Ledger Impact Grid (if debits / credits exist) */}
        {(step.impact.debits.length > 0 || step.impact.credits.length > 0) && (
          <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
            {/* Debits (Dr) */}
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-900/50 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Debit (Dr) Impact
                </span>
                <span>Asset / Expense</span>
              </div>
              <div className="space-y-1.5">
                {step.impact.debits.map((d, i) => (
                  <div key={i} className="flex justify-between items-center text-slate-200">
                    <span>
                      <strong className="text-emerald-400">Dr</strong> {d.accountCode} - {d.accountName}
                    </span>
                    <span className="font-bold text-emerald-300">{d.amountFormatted}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Credits (Cr) */}
            <div className="p-3 rounded-xl bg-violet-950/30 border border-violet-900/50 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-violet-400 uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  Credit (Cr) Impact
                </span>
                <span>Revenue / Liability</span>
              </div>
              <div className="space-y-1.5">
                {step.impact.credits.map((c, i) => (
                  <div key={i} className="flex justify-between items-center text-slate-200">
                    <span>
                      <strong className="text-violet-400">Cr</strong> {c.accountCode} - {c.accountName}
                    </span>
                    <span className="font-bold text-violet-300">{c.amountFormatted}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Stock Movements Impact (if present) */}
        {step.impact.stockMovements.length > 0 && (
          <div className="pt-2 p-3 rounded-xl bg-purple-950/30 border border-purple-900/50 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300 uppercase tracking-wider">
              <Boxes className="w-4 h-4 text-purple-400" />
              <span>Perpetual Stock Movements</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              {step.impact.stockMovements.map((sm, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-900/90 text-slate-200">
                  <span className="truncate pr-2">{sm.productName}</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                      sm.quantity > 0
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                        : "bg-rose-950 text-rose-400 border border-rose-900"
                    }`}
                  >
                    {sm.quantity > 0 ? `+${sm.quantity} units` : `${sm.quantity} units`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getCategoryIcon(category: TimelineStep["category"]) {
  switch (category) {
    case "ORDER":
      return <FileText className="w-3.5 h-3.5 text-blue-400" />;
    case "INVOICE":
      return <FileCheck className="w-3.5 h-3.5 text-emerald-400" />;
    case "STOCK":
      return <Boxes className="w-3.5 h-3.5 text-purple-400" />;
    case "PAYMENT":
      return <CreditCard className="w-3.5 h-3.5 text-amber-400" />;
  }
}

function getCategoryColor(category: TimelineStep["category"]) {
  switch (category) {
    case "ORDER":
      return { dot: "bg-blue-950 border-blue-500 text-blue-400" };
    case "INVOICE":
      return { dot: "bg-emerald-950 border-emerald-500 text-emerald-400" };
    case "STOCK":
      return { dot: "bg-purple-950 border-purple-500 text-purple-400" };
    case "PAYMENT":
      return { dot: "bg-amber-950 border-amber-500 text-amber-400" };
  }
}
