"use client";

import React, { useState } from "react";
import { BookOpen, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

export interface JournalEntryItemView {
  id: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface AccountingImpactCardProps {
  entryData: {
    id: string;
    reference: string | null;
    description: string | null;
    date: Date | string;
    items: JournalEntryItemView[];
    totalDebit: number;
    totalCredit: number;
    difference: number;
    isBalanced: boolean;
  } | null;
}

export function AccountingImpactCard({ entryData }: AccountingImpactCardProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (!entryData) {
    return (
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
        <BookOpen className="w-6 h-6 text-slate-500 mx-auto" />
        <h4 className="text-sm font-semibold text-slate-300">No Journal Entry Posted</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Convert this Sales Order to an Invoice to post double-entry ledger items (Debit Debtors, Credit Sales Income, Credit Tax).
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
      {/* Accordion Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between bg-slate-950/60 hover:bg-slate-950 transition-colors border-b border-slate-800"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-950 text-blue-400 border border-blue-900">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base">View Accounting Entry</h3>
              <span className="text-xs font-mono text-blue-400 px-2 py-0.5 bg-blue-950/80 rounded border border-blue-900">
                Ref: {entryData.reference}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Double-entry posting impact generated automatically on invoice creation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase ${
              entryData.isBalanced
                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                : "bg-rose-950 text-rose-400 border border-rose-800"
            }`}
          >
            {entryData.isBalanced ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            {entryData.isBalanced ? "Balanced Entry" : "Unbalanced Mismatch"}
          </span>
          {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
      </button>

      {/* Accordion Content */}
      {isOpen && (
        <div className="p-6 space-y-5">
          {/* Summary KPIs */}
          <div className="grid grid-cols-3 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800 text-center font-mono">
            <div>
              <span className="text-xs text-slate-400 block uppercase font-sans">Total Debit</span>
              <span className="text-lg font-bold text-emerald-400">
                ₹{(entryData.totalDebit / 100).toLocaleString("en-IN")}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block uppercase font-sans">Total Credit</span>
              <span className="text-lg font-bold text-emerald-400">
                ₹{(entryData.totalCredit / 100).toLocaleString("en-IN")}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block uppercase font-sans">Difference</span>
              <span
                className={`text-lg font-bold ${
                  entryData.difference === 0 ? "text-slate-400" : "text-rose-400"
                }`}
              >
                ₹{(entryData.difference / 100).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Journal Items Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Code</th>
                  <th className="p-3">Account Name</th>
                  <th className="p-3 text-right">Debit (Dr)</th>
                  <th className="p-3 text-right">Credit (Cr)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {entryData.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-bold text-amber-400">{item.accountCode}</td>
                    <td className="p-3 text-slate-200 font-sans font-medium">
                      {item.accountName}
                    </td>
                    <td className="p-3 text-right text-emerald-400 font-semibold">
                      {item.debit > 0 ? `₹${(item.debit / 100).toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td className="p-3 text-right text-emerald-400 font-semibold">
                      {item.credit > 0 ? `₹${(item.credit / 100).toLocaleString("en-IN")}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
