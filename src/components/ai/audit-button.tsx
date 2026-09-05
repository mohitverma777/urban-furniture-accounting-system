"use client";

import React from "react";
import { ShieldAlert, Loader2, Sparkles } from "lucide-react";

export interface AuditButtonProps {
  onAudit: () => void;
  isLoading: boolean;
  disabled?: boolean;
  className?: string;
  variant?: "primary" | "secondary";
}

export function AuditButton({
  onAudit,
  isLoading,
  disabled = false,
  className = "",
  variant = "primary",
}: AuditButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed";

  const variantStyles =
    variant === "primary"
      ? "bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border border-violet-400/30"
      : "bg-slate-800 hover:bg-slate-700 text-violet-300 border border-slate-700";

  return (
    <button
      type="button"
      onClick={onAudit}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variantStyles} ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-violet-300" />
          <span>Auditing Ledger...</span>
        </>
      ) : (
        <>
          <ShieldAlert className="w-4 h-4 text-violet-300" />
          <span>Audit Ledger with AI</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        </>
      )}
    </button>
  );
}
