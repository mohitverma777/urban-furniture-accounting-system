"use client";

import React, { useState } from "react";
import { ShieldAlert, Sparkles, RefreshCw } from "lucide-react";
import { AuditButton } from "@/components/ai/audit-button";
import { AuditResults } from "@/components/ai/audit-results";
import { runAiLedgerAuditAction, type AiAuditResponse } from "@/actions/ai-audit";

export function AuditLedgerCard() {
  const [isLoading, setIsLoading] = useState(false);
  const [auditResponse, setAuditResponse] = useState<AiAuditResponse | null>(null);

  const handleRunAudit = async () => {
    setIsLoading(true);
    const response = await runAiLedgerAuditAction();
    setAuditResponse(response);
    setIsLoading(false);
  };

  return (
    <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/40 border border-slate-800 shadow-xl space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white flex items-center gap-2">
              <span>Ledger Audit &amp; Anomaly Detection</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-950 text-violet-300 border border-violet-800 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                AI Powered
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic rule-based audit engine with Gemma AI executive explanation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {auditResponse && (
            <button
              type="button"
              onClick={handleRunAudit}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors disabled:opacity-50"
              title="Re-run Audit"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          )}

          <AuditButton onAudit={handleRunAudit} isLoading={isLoading} />
        </div>
      </div>

      {/* Audit Results View */}
      {auditResponse && (
        <AuditResults
          report={auditResponse.auditReport}
          aiExplanation={auditResponse.aiExplanation}
          isLoading={isLoading}
          error={auditResponse.error ?? null}
          isAiAvailable={auditResponse.isAiAvailable}
        />
      )}
    </div>
  );
}
