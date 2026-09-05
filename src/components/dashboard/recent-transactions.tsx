import React from "react";
import type { RecentTransactionItem } from "@/services/dashboard/types";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";

export function RecentTransactions({ items }: { items: RecentTransactionItem[] }) {
  if (items.length === 0) {
    return (
      <div className="p-6 text-center text-slate-400 text-sm">
        No double-entry transactions posted yet.
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-800/60">
      {items.map((item) => {
        const isDebit = item.debit > 0;
        const amount = isDebit ? item.debit : item.credit;

        return (
          <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-xl border ${
                  isDebit
                    ? "bg-rose-950/60 text-rose-400 border-rose-900/50"
                    : "bg-emerald-950/60 text-emerald-400 border-emerald-900/50"
                }`}
              >
                {isDebit ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white leading-tight">
                  {item.accountName}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {item.description} • <span className="font-mono">{item.date}</span>
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className={`font-mono font-bold text-sm ${isDebit ? "text-slate-200" : "text-emerald-400"}`}>
                {isDebit ? "Dr " : "Cr "}₹{(amount / 100).toLocaleString("en-IN")}
              </span>
              <span className="block text-[10px] font-mono text-slate-500">
                Entry #{item.entryNumber}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
