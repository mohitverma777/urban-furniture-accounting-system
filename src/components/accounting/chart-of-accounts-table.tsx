"use client";

import React, { useState, useMemo } from "react";
import { Search, Filter, BookOpen } from "lucide-react";
import type { Account, AccountType } from "@/db/schema/accounts";
import { EmptyState } from "@/components/common/empty-state";

export interface ChartOfAccountsTableProps {
  initialAccounts: Account[];
}

export function ChartOfAccountsTable({ initialAccounts }: ChartOfAccountsTableProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AccountType | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const filteredAccounts = useMemo(() => {
    return initialAccounts.filter((acc) => {
      // Type Filter
      if (typeFilter !== "ALL" && acc.type !== typeFilter) return false;

      // Status Filter
      if (statusFilter === "ACTIVE" && !acc.isActive) return false;
      if (statusFilter === "INACTIVE" && acc.isActive) return false;

      // Search Query
      if (search.trim() !== "") {
        const q = search.trim().toLowerCase();
        const codeMatch = acc.code.toLowerCase().includes(q);
        const nameMatch = acc.name.toLowerCase().includes(q);
        if (!codeMatch && !nameMatch) return false;
      }

      return true;
    });
  }, [initialAccounts, search, typeFilter, statusFilter]);

  const typeBadges: Record<AccountType, string> = {
    ASSET: "bg-emerald-950/80 text-emerald-400 border-emerald-800/80",
    LIABILITY: "bg-rose-950/80 text-rose-400 border-rose-800/80",
    EXPENSE: "bg-amber-950/80 text-amber-400 border-amber-800/80",
    INCOME: "bg-blue-950/80 text-blue-400 border-blue-800/80",
    CAPITAL: "bg-purple-950/80 text-purple-400 border-purple-800/80",
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search account code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Account Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 hidden sm:inline" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as AccountType | "ALL")}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 transition-colors"
            >
              <option value="ALL">All Types</option>
              <option value="ASSET">ASSET</option>
              <option value="LIABILITY">LIABILITY</option>
              <option value="EXPENSE">EXPENSE</option>
              <option value="INCOME">INCOME</option>
              <option value="CAPITAL">CAPITAL</option>
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 transition-colors"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Table / Empty State */}
      {filteredAccounts.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No Accounts Found"
          description="No accounts match your current search and filter criteria."
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/90 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">Account Code</th>
                  <th className="p-4">Account Name</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-mono font-bold text-amber-400 tracking-wide">
                      {acc.code}
                    </td>
                    <td className="p-4 font-semibold text-slate-100">{acc.name}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${
                          typeBadges[acc.type] ?? "bg-slate-800 text-slate-300 border-slate-700"
                        }`}
                      >
                        {acc.type}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${
                          acc.isActive
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                            : "bg-rose-950 text-rose-400 border border-rose-900"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            acc.isActive ? "bg-emerald-400" : "bg-rose-400"
                          }`}
                        />
                        {acc.isActive ? "Active" : "Inactive"}
                      </span>
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
