"use client";

import React from "react";
import { BookOpen, CheckCircle2, AlertCircle } from "lucide-react";

export interface AccountingImpactCardProps {
  journalEntry: {
    id: string;
    date: Date;
    reference: string | null;
    description: string | null;
    lines: Array<{
      id: string;
      accountCode: string;
      accountName: string;
      debit: number;
      credit: number;
      analyticAccountName: string | null;
    }>;
  } | null;
}

export function AccountingImpactCard({ journalEntry }: AccountingImpactCardProps) {
  if (!journalEntry) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-2">
        <div className="inline-flex p-3 rounded-full bg-slate-800 text-slate-500 mb-1">
          <BookOpen className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-300">No Accounting Posting Yet</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Double-entry journal postings are created automatically when the Purchase Order is converted to a Vendor Bill.
        </p>
      </div>
    );
  }

  const totalDebit = journalEntry.lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = journalEntry.lines.reduce((sum, l) => sum + l.credit, 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference === 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white">General Ledger Entry</h4>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Ref: {journalEntry.reference || "—"}
            </p>
          </div>
        </div>

        {isBalanced ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-950 text-emerald-400 border border-emerald-900">
            <CheckCircle2 className="w-3.5 h-3.5" /> BALANCED
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-950 text-rose-400 border border-rose-900">
            <AlertCircle className="w-3.5 h-3.5" /> UNBALANCED
          </span>
        )}
      </div>

      {/* Itemized Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-900/90 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="p-3">Account Code & Name</th>
              <th className="p-3">Analytic Tag</th>
              <th className="p-3 text-right">Debit (Dr)</th>
              <th className="p-3 text-right">Credit (Cr)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {journalEntry.lines.map((line) => (
              <tr key={line.id} className="hover:bg-slate-900/40 transition-colors">
                <td className="p-3">
                  <div className="font-medium text-slate-200 flex items-center gap-2">
                    <span className="font-mono text-purple-400 font-bold">{line.accountCode}</span>
                    <span>{line.accountName}</span>
                  </div>
                </td>
                <td className="p-3 text-xs">
                  {line.analyticAccountName ? (
                    <span className="inline-flex px-2 py-0.5 rounded font-medium bg-purple-950 text-purple-300 border border-purple-900">
                      {line.analyticAccountName}
                    </span>
                  ) : (
                    <span className="text-slate-600 italic">—</span>
                  )}
                </td>
                <td className="p-3 text-right font-mono font-bold">
                  {line.debit > 0 ? (
                    <span className="text-emerald-400">
                      ₹{(line.debit / 100).toLocaleString("en-IN")}
                    </span>
                  ) : (
                    <span className="text-slate-600">₹0</span>
                  )}
                </td>
                <td className="p-3 text-right font-mono font-bold">
                  {line.credit > 0 ? (
                    <span className="text-emerald-400">
                      ₹{(line.credit / 100).toLocaleString("en-IN")}
                    </span>
                  ) : (
                    <span className="text-slate-600">₹0</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Ledger Balance Footer */}
      <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
        <div>
          <span className="text-slate-400 font-medium block">Difference</span>
          <span
            className={`font-mono font-bold text-sm ${
              difference === 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            ₹{(difference / 100).toLocaleString("en-IN")}
          </span>
        </div>
        <div className="flex items-center gap-6">
          <div>
            <span className="text-slate-400 font-medium block text-right">Total Debit</span>
            <span className="font-mono font-extrabold text-sm text-emerald-400">
              ₹{(totalDebit / 100).toLocaleString("en-IN")}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block text-right">Total Credit</span>
            <span className="font-mono font-extrabold text-sm text-emerald-400">
              ₹{(totalCredit / 100).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
