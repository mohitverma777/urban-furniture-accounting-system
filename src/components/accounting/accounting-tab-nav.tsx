"use client";

import React from "react";
import { BookOpen, BookText, FileText, Scale } from "lucide-react";

export type AccountingTab = "accounts" | "journals" | "entries" | "ledger";

export interface AccountingTabNavProps {
  activeTab: AccountingTab;
  onTabChange: (tab: AccountingTab) => void;
}

export function AccountingTabNav({ activeTab, onTabChange }: AccountingTabNavProps) {
  const tabs = [
    { id: "accounts" as const, label: "Chart of Accounts", icon: BookOpen },
    { id: "journals" as const, label: "Journals", icon: BookText },
    { id: "entries" as const, label: "Journal Entries", icon: FileText },
    { id: "ledger" as const, label: "General Ledger", icon: Scale },
  ];

  return (
    <div className="flex items-center gap-2 border-b border-slate-800 pb-1 mb-6 overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              isActive
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? "text-amber-400" : "text-slate-400"}`} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
