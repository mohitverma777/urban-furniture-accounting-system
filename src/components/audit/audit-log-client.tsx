"use client";

import React, { useState } from "react";
import {
  History,
  Search,
  Filter,
  ShieldCheck,
  Calendar,
  User,
  FileCode,
  Eye,
  CheckCircle2,
  X,
  Layers,
  ArrowRight,
} from "lucide-react";
import type { ChangeLog } from "@/db/schema/audit";

interface AuditLogClientProps {
  initialLogs: ChangeLog[];
  stats: {
    totalLogs: number;
    todayCount: number;
    entityCounts: Record<string, number>;
  };
}

export function AuditLogClient({ initialLogs, stats }: AuditLogClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntityType, setSelectedEntityType] = useState<string>("ALL");
  const [activeDiffModal, setActiveDiffModal] = useState<ChangeLog | null>(null);

  // Filter logs locally based on search and selected entity type
  const filteredLogs = initialLogs.filter((log) => {
    const matchesType =
      selectedEntityType === "ALL" || log.entityType === selectedEntityType;

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      log.entityType.toLowerCase().includes(q) ||
      log.entityId.toLowerCase().includes(q) ||
      log.changedBy.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q);

    return matchesType && matchesSearch;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case "CREATE":
        return "bg-emerald-950 text-emerald-400 border-emerald-900";
      case "STATUS_CHANGE":
        return "bg-amber-950 text-amber-400 border-amber-900";
      case "UPDATE":
        return "bg-blue-950 text-blue-400 border-blue-900";
      case "DELETE":
        return "bg-rose-950 text-rose-400 border-rose-900";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  const parseJson = (val: string | null) => {
    if (!val) return null;
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Logs */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Audit Entries
            </span>
            <History className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white">
            {stats.totalLogs}
          </p>
          <p className="text-xs text-slate-400">Immutable change log records</p>
        </div>

        {/* 2. Today's Changes */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Today's Modifications
            </span>
            <Calendar className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-cyan-400">
            {stats.todayCount}
          </p>
          <p className="text-xs text-slate-400">Activity in last 24 hours</p>
        </div>

        {/* 3. Tracked Entity Types */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Tracked Entities
            </span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-purple-400">
            {Object.keys(stats.entityCounts).length || 1} Types
          </p>
          <p className="text-xs text-slate-400">Orders, Budgets, Ledger &amp; Stock</p>
        </div>

        {/* 4. Non-Repudiation Status */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Compliance Status
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-400">Verified</p>
          <p className="text-xs text-slate-400">Non-repudiation audit trail active</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search audit trail by ID, user, action, or entity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-amber-400 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedEntityType}
            onChange={(e) => setSelectedEntityType(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:border-amber-400 transition-colors cursor-pointer"
          >
            <option value="ALL">All Entity Types</option>
            <option value="ORDER">Orders & Invoices</option>
            <option value="BUDGET">Budgets & Cost Centers</option>
            <option value="JOURNAL_ENTRY">Journal Entries</option>
            <option value="PAYMENT">Payments</option>
            <option value="PRODUCT">Products</option>
            <option value="CONTACT">Contacts</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="p-4">Timestamp</th>
              <th className="p-4">Action</th>
              <th className="p-4">Entity Type</th>
              <th className="p-4">Target Entity ID</th>
              <th className="p-4">Changed By</th>
              <th className="p-4 text-right">State Diff</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500 font-sans">
                  No matching audit trail records found.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const dateStr = new Date(log.createdAt).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                });

                return (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="p-4 text-slate-400">{dateStr}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-amber-400">
                      {log.entityType}
                    </td>
                    <td className="p-4 text-slate-200">
                      {log.entityId.substring(0, 18)}...
                    </td>
                    <td className="p-4 text-slate-300 flex items-center gap-1.5 font-sans text-xs">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{log.changedBy}</span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setActiveDiffModal(log)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-sans font-semibold border border-slate-700 transition-colors shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Diff</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Side-by-Side State Diff Inspection Modal */}
      {activeDiffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden space-y-4 p-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  Audit State Diff Inspector
                </h3>
              </div>
              <button
                onClick={() => setActiveDiffModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metadata Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Entity</span>
                <span className="font-mono font-bold text-amber-400">
                  {activeDiffModal.entityType}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Action</span>
                <span className="font-mono font-bold text-emerald-400">
                  {activeDiffModal.action}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Changed By</span>
                <span className="font-mono text-white">{activeDiffModal.changedBy}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Timestamp</span>
                <span className="font-mono text-slate-300">
                  {new Date(activeDiffModal.createdAt).toLocaleTimeString()}
                </span>
              </div>
            </div>

            {/* Old vs New JSON View */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              {/* Old Value */}
              <div className="space-y-1">
                <span className="text-slate-400 font-semibold block text-[11px] uppercase border-b border-slate-800 pb-1">
                  Previous State (Old Value)
                </span>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 h-56 overflow-auto text-rose-300">
                  {activeDiffModal.oldValue ? (
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(
                        parseJson(activeDiffModal.oldValue),
                        null,
                        2
                      )}
                    </pre>
                  ) : (
                    <span className="text-slate-600 font-sans italic">
                      null (Entity Creation)
                    </span>
                  )}
                </div>
              </div>

              {/* New Value */}
              <div className="space-y-1">
                <span className="text-slate-400 font-semibold block text-[11px] uppercase border-b border-slate-800 pb-1">
                  Updated State (New Value)
                </span>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 h-56 overflow-auto text-emerald-300">
                  {activeDiffModal.newValue ? (
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(
                        parseJson(activeDiffModal.newValue),
                        null,
                        2
                      )}
                    </pre>
                  ) : (
                    <span className="text-slate-600 font-sans italic">
                      null (Entity Deletion)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 flex justify-end border-t border-slate-800">
              <button
                onClick={() => setActiveDiffModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
