"use client";

import React, { useEffect, useState } from "react";
import { X, BookOpen, CheckCircle2, AlertCircle, Calendar, Hash, FileText } from "lucide-react";
import type { JournalEntryDetail } from "@/services/accounting/query";
import { getJournalEntryByIdAction } from "@/actions/accounting";

export interface JournalEntryDetailModalProps {
  entryId: string | null;
  onClose: () => void;
}

export function JournalEntryDetailModal({ entryId, onClose }: JournalEntryDetailModalProps) {
  const [detail, setDetail] = useState<JournalEntryDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!entryId) {
      return;
    }

    Promise.resolve().then(() => {
      if (isMounted) setIsLoading(true);
    });

    getJournalEntryByIdAction(entryId)
      .then((data) => {
        if (isMounted) {
          setDetail(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setDetail(null);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [entryId]);

  if (!entryId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Journal Entry Details</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                ID: {entryId}
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 animate-pulse">
              Loading journal entry breakdown...
            </div>
          ) : !detail ? (
            <div className="py-12 text-center text-rose-400">
              Failed to load journal entry details.
            </div>
          ) : (
            <>
              {/* Transaction Summary Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-xs text-slate-400 block flex items-center gap-1 font-medium">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" /> Journal
                  </span>
                  <span className="text-sm font-semibold text-slate-200 mt-1 block">
                    {detail.journalName} ({detail.journalType})
                  </span>
                </div>

                <div>
                  <span className="text-xs text-slate-400 block flex items-center gap-1 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date
                  </span>
                  <span className="text-sm font-mono font-semibold text-slate-200 mt-1 block">
                    {detail.date.toISOString().split("T")[0]}
                  </span>
                </div>

                <div>
                  <span className="text-xs text-slate-400 block flex items-center gap-1 font-medium">
                    <Hash className="w-3.5 h-3.5 text-slate-400" /> Reference
                  </span>
                  <span className="text-sm font-mono font-semibold text-amber-400 mt-1 block truncate">
                    {detail.reference || "—"}
                  </span>
                </div>

                <div>
                  <span className="text-xs text-slate-400 block flex items-center gap-1 font-medium">
                    <FileText className="w-3.5 h-3.5 text-slate-400" /> Status
                  </span>
                  <span className="mt-1 block">
                    {detail.isBalanced ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-900">
                        <CheckCircle2 className="w-3.5 h-3.5" /> BALANCED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-950 text-rose-400 border border-rose-900">
                        <AlertCircle className="w-3.5 h-3.5" /> UNBALANCED
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Description */}
              {detail.description && (
                <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/80 text-sm text-slate-300">
                  <span className="text-xs text-slate-500 font-semibold uppercase block mb-1">
                    Description
                  </span>
                  {detail.description}
                </div>
              )}

              {/* Line Items Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-inner">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/90 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-4">Account Code & Name</th>
                      <th className="p-4">Analytic Tag</th>
                      <th className="p-4 text-right">Debit (Dr)</th>
                      <th className="p-4 text-right">Credit (Cr)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {detail.items.map((line) => (
                      <tr key={line.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4">
                          <div className="font-semibold text-slate-100 flex items-center gap-2">
                            <span className="font-mono text-amber-400 font-bold">{line.accountCode}</span>
                            <span>{line.accountName}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          {line.analyticAccountName ? (
                            <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-purple-950 text-purple-300 border border-purple-900">
                              {line.analyticAccountName}
                            </span>
                          ) : (
                            <span className="text-slate-600 italic text-xs">—</span>
                          )}
                        </td>
                        <td className="p-4 text-right font-mono font-bold">
                          {line.debit > 0 ? (
                            <span className="text-emerald-400">
                              ₹{(line.debit / 100).toLocaleString("en-IN")}
                            </span>
                          ) : (
                            <span className="text-slate-600">₹0</span>
                          )}
                        </td>
                        <td className="p-4 text-right font-mono font-bold">
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

              {/* Balance Summary Footer */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between text-sm">
                <div>
                  <span className="text-slate-400 text-xs block font-medium">Difference</span>
                  <span
                    className={`font-mono font-bold text-sm ${
                      detail.difference === 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    ₹{(detail.difference / 100).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-slate-400 text-xs block font-medium text-right">
                      Total Debit
                    </span>
                    <span className="font-mono font-extrabold text-base text-emerald-400">
                      ₹{(detail.totalDebit / 100).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block font-medium text-right">
                      Total Credit
                    </span>
                    <span className="font-mono font-extrabold text-base text-emerald-400">
                      ₹{(detail.totalCredit / 100).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
