"use client";

import React, { useState } from "react";
import { BookText, ShoppingBag, ShoppingCart, Landmark, Banknote, Plus, BookPlus } from "lucide-react";
import type { JournalSummaryItem } from "@/services/accounting/query";
import type { Account, JournalType } from "@/db/schema/accounts";
import { JournalFormModal } from "./journal-form-modal";

export interface JournalsGridProps {
  journals: JournalSummaryItem[];
  accountsList?: Account[];
}

export function JournalsGrid({ journals, accountsList = [] }: JournalsGridProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const journalIcons: Record<JournalType, React.ElementType> = {
    SALES: ShoppingCart,
    PURCHASE: ShoppingBag,
    BANK: Landmark,
    CASH: Banknote,
  };

  const journalColors: Record<JournalType, { badge: string; iconBg: string }> = {
    SALES: {
      badge: "bg-blue-950/80 text-blue-400 border-blue-800",
      iconBg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    PURCHASE: {
      badge: "bg-amber-950/80 text-amber-400 border-amber-800",
      iconBg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
    BANK: {
      badge: "bg-emerald-950/80 text-emerald-400 border-emerald-800",
      iconBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    CASH: {
      badge: "bg-purple-950/80 text-purple-400 border-purple-800",
      iconBg: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    },
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls Bar (Excalidraw Design) */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-950 text-amber-400 border border-amber-800">
            <BookPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Accounting Journals</h3>
            <p className="text-xs text-slate-400">Configured transaction journals and default account mappings.</p>
          </div>
        </div>

        {/* + New Journal Button */}
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-amber-950/40 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Journal</span>
        </button>
      </div>

      {/* Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {journals.map((j) => {
          const Icon = journalIcons[j.type] ?? BookText;
          const color = journalColors[j.type] ?? {
            badge: "bg-slate-800 text-slate-300 border-slate-700",
            iconBg: "bg-slate-800 text-slate-300 border-slate-700",
          };

          return (
            <div
              key={j.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 hover:border-slate-700 transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div className={`p-3 rounded-xl border ${color.iconBg}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">{j.name}</h3>
                    <span
                      className={`inline-flex px-2.5 py-0.5 mt-1 rounded-full text-xs font-extrabold uppercase border ${color.badge}`}
                    >
                      {j.type} JOURNAL
                    </span>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Default Account</span>
                  <span className="text-sm font-semibold text-slate-200 mt-0.5 block truncate">
                    {j.defaultAccountCode ? (
                      <span>
                        <span className="font-mono text-amber-400 mr-1.5">{j.defaultAccountCode}</span>
                        {j.defaultAccountName}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">Not configured</span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Total Entries</span>
                  <span className="text-base font-bold font-mono text-white mt-0.5 block">
                    {j.totalEntriesCount} posted
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span>Last Transaction Date</span>
                <span className="font-mono font-medium text-slate-300">
                  {j.lastPostingDate
                    ? j.lastPostingDate.toISOString().split("T")[0]
                    : "No transactions"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Journal Modal (Excalidraw Specifications) */}
      <JournalFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        accountsList={accountsList}
      />
    </div>
  );
}
