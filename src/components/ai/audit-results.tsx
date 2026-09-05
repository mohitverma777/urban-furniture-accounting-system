"use client";

import React from "react";
import {
  ShieldCheck,
  AlertOctagon,
  AlertTriangle,
  Info,
  Sparkles,
  FileSearch,
  ExternalLink,
  CheckCircle2,
  WifiOff,
} from "lucide-react";
import type { AuditReport, AuditFinding, AnomalySeverity } from "@/services/accounting/anomaly-detector";

export interface AuditResultsProps {
  report: AuditReport | null;
  aiExplanation: string | null;
  isLoading: boolean;
  error: string | null;
  isAiAvailable?: boolean;
}

export function AuditResults({
  report,
  aiExplanation,
  isLoading,
  error,
  isAiAvailable = true,
}: AuditResultsProps) {
  if (isLoading) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl text-center space-y-4 animate-pulse">
        <div className="w-12 h-12 rounded-2xl bg-violet-500/20 border border-violet-500/30 text-violet-400 mx-auto flex items-center justify-center">
          <FileSearch className="w-6 h-6 animate-bounce" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Running Ledger Audit Engine</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            Analyzing posted journal entries, payments, purchase orders, and account categories for potential anomalies...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-900/60 text-rose-300 space-y-2">
        <div className="flex items-center gap-2 font-bold text-sm text-rose-200">
          <AlertOctagon className="w-5 h-5 text-rose-400" />
          <span>Audit Engine Error</span>
        </div>
        <p className="text-xs leading-relaxed">{error}</p>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  const { totalFindingsCount, criticalCount, highCount, mediumCount, lowCount, findings } = report;

  // Empty State: 0 findings
  if (totalFindingsCount === 0) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900 border border-emerald-900/50 shadow-xl text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white">No potential anomalies were detected.</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          All posted journal entries, payment records, and spending patterns are balanced and within standard baseline parameters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Audit Summary KPI Bar */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
            <FileSearch className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Ledger Audit Summary</h3>
              <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-violet-950 text-violet-300 border border-violet-800">
                {totalFindingsCount} {totalFindingsCount === 1 ? "Finding" : "Findings"} Detected
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic findings extracted directly from posted ledger records.
            </p>
          </div>
        </div>

        {/* Severity Count Pills */}
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="text-xs font-bold px-3 py-1 rounded-xl bg-rose-950 text-rose-400 border border-rose-900 flex items-center gap-1.5">
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>CRITICAL ({criticalCount})</span>
            </span>
          )}
          {highCount > 0 && (
            <span className="text-xs font-bold px-3 py-1 rounded-xl bg-amber-950 text-amber-400 border border-amber-900 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>HIGH ({highCount})</span>
            </span>
          )}
          {mediumCount > 0 && (
            <span className="text-xs font-bold px-3 py-1 rounded-xl bg-purple-950 text-purple-300 border border-purple-900 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              <span>MEDIUM ({mediumCount})</span>
            </span>
          )}
          {lowCount > 0 && (
            <span className="text-xs font-bold px-3 py-1 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              <span>LOW ({lowCount})</span>
            </span>
          )}
        </div>
      </div>

      {/* AI Explanation Block */}
      {aiExplanation && (
        <div className="p-6 rounded-2xl bg-violet-950/30 border border-violet-500/30 shadow-xl space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-violet-900/50 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" />
              <h4 className="font-bold text-sm text-white">AI Auditor Insight &amp; Recommended Actions</h4>
            </div>
            {!isAiAvailable ? (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                <WifiOff className="w-3 h-3" />
                Local AI Offline
              </span>
            ) : (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-violet-900/60 text-violet-300 border border-violet-700">
                Powered by Gemma 3 4B
              </span>
            )}
          </div>
          <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line font-normal">
            {aiExplanation}
          </div>
        </div>
      )}

      {/* Structured Findings List */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Detailed Findings List ({findings.length})
        </h4>

        <div className="space-y-3">
          {findings.map((f, idx) => (
            <FindingCard key={f.entityId ? `${f.type}-${f.entityId}-${idx}` : `${f.type}-${idx}`} finding={f} />
          ))}
        </div>
      </div>
    </div>
  );
}

function FindingCard({ finding }: { finding: AuditFinding }) {
  const { severity, title, description, amountFormatted, references, entityType } = finding;

  const severityBadge = getSeverityBadge(severity);

  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-3 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h5 className="font-bold text-sm text-white">{title}</h5>
            {severityBadge}
            {entityType && (
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                {entityType}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{description}</p>
        </div>

        {amountFormatted && (
          <div className="text-right shrink-0">
            <span className="text-xs text-slate-400 font-medium block">Impact Amount</span>
            <span className="text-sm font-extrabold font-mono text-amber-400">{amountFormatted}</span>
          </div>
        )}
      </div>

      {/* Recommended Action / References footer */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400">
          <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 shrink-0" />
          <span className="font-semibold text-slate-300">Recommended Action:</span>
          <span>{getRecommendedAction(finding.type)}</span>
        </div>

        {references && references.length > 0 && (
          <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
            <ExternalLink className="w-3 h-3 text-slate-500" />
            <span>Refs: {references.join(", ")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function getSeverityBadge(severity: AnomalySeverity) {
  switch (severity) {
    case "CRITICAL":
      return (
        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-400 border border-rose-900">
          CRITICAL
        </span>
      );
    case "HIGH":
      return (
        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-900">
          HIGH
        </span>
      );
    case "MEDIUM":
      return (
        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-900">
          MEDIUM
        </span>
      );
    case "LOW":
      return (
        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
          LOW
        </span>
      );
  }
}

function getRecommendedAction(type: AuditFinding["type"]): string {
  switch (type) {
    case "UNBALANCED_JOURNAL_ENTRY":
      return "Review debit and credit lines for calculation error before posting.";
    case "POTENTIAL_DUPLICATE_PAYMENT":
      return "Verify payment vouchers and bank reference IDs before reconciliation.";
    case "SPENDING_SPIKE":
      return "Verify purchase order authorization and vendor pricing line items.";
    case "UNCATEGORIZED_EXPENSE":
      return "Reclassify expense posting to specific operational cost center account.";
    case "MISSING_ACCOUNTING_METADATA":
      return "Update transaction record with required UTR/cheque or description note.";
    default:
      return "Review transaction details.";
  }
}
