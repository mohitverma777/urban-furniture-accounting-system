"use client";

import React, { useState, useMemo } from "react";
import { Search, Filter, Eye, FileText, CheckCircle2, AlertCircle, Calendar } from "lucide-react";
import type { JournalEntryListItem, JournalSummaryItem } from "@/services/accounting/query";
import { EmptyState } from "@/components/common/empty-state";
import { JournalEntryDetailModal } from "./journal-entry-detail-modal";

export interface JournalEntriesTableProps {
  initialEntries: JournalEntryListItem[];
  journalsList: JournalSummaryItem[];
}

export function JournalEntriesTable({ initialEntries, journalsList }: JournalEntriesTableProps) {
  const [search, setSearch] = useState("");
  const [selectedJournal, setSelectedJournal] = useState<string>("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  const filteredEntries = useMemo(() => {
    return initialEntries.filter((entry) => {
      // Journal Filter
      if (selectedJournal !== "ALL" && entry.journalId !== selectedJournal) return false;

      // Date Range Filter
      if (startDate) {
        const start = new Date(startDate);
        if (entry.date < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (entry.date > end) return false;
      }

      // Reference / Description Search
      if (search.trim() !== "") {
        const q = search.trim().toLowerCase();
        const refMatch = entry.reference?.toLowerCase().includes(q) ?? false;
        const descMatch = entry.description?.toLowerCase().includes(q) ?? false;
        const idMatch = entry.id.toLowerCase().includes(q);
        if (!refMatch && !descMatch && !idMatch) return false;
      }

      return true;
    });
  }, [initialEntries, selectedJournal, startDate, endDate, search]);

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
        {/* Reference / Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by reference, description, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Journal Selector */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 hidden sm:inline" />
            <select
              value={selectedJournal}
              onChange={(e) => setSelectedJournal(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 transition-colors"
            >
              <option value="ALL">All Journals</option>
              {journalsList.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name} ({j.type})
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Inputs */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400 hidden sm:inline" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="From date"
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
            <span className="text-slate-500 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="To date"
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Table / Empty State */}
      {filteredEntries.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Journal Entries Found"
          description="No posted journal entries match your current search and date filters."
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/90 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">Date</th>
                  <th className="p-4">Journal</th>
                  <th className="p-4">Reference</th>
                  <th className="p-4">Description</th>
                  <th className="p-4 text-right">Total Debit</th>
                  <th className="p-4 text-right">Total Credit</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-mono text-xs font-semibold text-slate-300">
                      {entry.date.toISOString().split("T")[0]}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                        {entry.journalName}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-amber-400">
                      {entry.reference || "—"}
                    </td>
                    <td className="p-4 text-slate-200 max-w-xs truncate">
                      {entry.description || "—"}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-emerald-400">
                      ₹{(entry.totalDebit / 100).toLocaleString("en-IN")}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-emerald-400">
                      ₹{(entry.totalCredit / 100).toLocaleString("en-IN")}
                    </td>
                    <td className="p-4 text-center">
                      {entry.isBalanced ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-900">
                          <CheckCircle2 className="w-3 h-3" /> BALANCED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-950 text-rose-400 border border-rose-900">
                          <AlertCircle className="w-3 h-3" /> UNBALANCED
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setSelectedEntryId(entry.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold rounded-xl transition-colors cursor-pointer border border-slate-700"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Entry Detail View Modal */}
      <JournalEntryDetailModal
        entryId={selectedEntryId}
        onClose={() => setSelectedEntryId(null)}
      />
    </div>
  );
}
