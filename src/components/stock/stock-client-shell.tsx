"use client";

import React, { useState, useMemo } from "react";
import { Search, Boxes, History } from "lucide-react";
import type { ProductStockSummaryItem, StockMovementHistoryItem } from "@/services/stock/query";
import { EmptyState } from "@/components/common/empty-state";

export interface StockClientShellProps {
  initialSummaries: ProductStockSummaryItem[];
  initialHistory: StockMovementHistoryItem[];
}

type StockTab = "OVERVIEW" | "HISTORY";

export function StockClientShell({
  initialSummaries,
  initialHistory,
}: StockClientShellProps) {
  const [activeTab, setActiveTab] = useState<StockTab>("OVERVIEW");
  const [search, setSearch] = useState("");
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string>("ALL");

  // Filtered Stock Overview Summaries
  const filteredSummaries = useMemo(() => {
    if (!search.trim()) return initialSummaries;
    const q = search.toLowerCase().trim();
    return initialSummaries.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.category && s.category.toLowerCase().includes(q))
    );
  }, [initialSummaries, search]);

  // Filtered Stock Movement History
  const filteredHistory = useMemo(() => {
    return initialHistory.filter((h) => {
      if (historyTypeFilter !== "ALL" && h.type !== historyTypeFilter) return false;
      if (search.trim() !== "") {
        const q = search.toLowerCase().trim();
        const pMatch = h.productName.toLowerCase().includes(q);
        const refMatch = h.referenceId?.toLowerCase().includes(q);
        if (!pMatch && !refMatch) return false;
      }
      return true;
    });
  }, [initialHistory, historyTypeFilter, search]);

  return (
    <div className="space-y-6">
      {/* Module Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab("OVERVIEW")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === "OVERVIEW"
              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-md"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Product Stock Breakdown</span>
        </button>

        <button
          onClick={() => setActiveTab("HISTORY")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === "HISTORY"
              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-md"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Stock Movement Ledger</span>
        </button>
      </div>

      {/* Controls Bar */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder={
              activeTab === "OVERVIEW"
                ? "Search product name or category..."
                : "Search movement history reference or product..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
          />
        </div>

        {/* History Movement Type Filter */}
        {activeTab === "HISTORY" && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Movement Type:</span>
            <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setHistoryTypeFilter("ALL")}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  historyTypeFilter === "ALL"
                    ? "bg-slate-800 text-white font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setHistoryTypeFilter("PURCHASE")}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  historyTypeFilter === "PURCHASE"
                    ? "bg-emerald-950 text-emerald-400 font-bold border border-emerald-900/50"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Purchases (+Qty)
              </button>
              <button
                onClick={() => setHistoryTypeFilter("SALE")}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  historyTypeFilter === "SALE"
                    ? "bg-rose-950 text-rose-400 font-bold border border-rose-900/50"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Sales (-Qty)
              </button>
              <button
                onClick={() => setHistoryTypeFilter("ADJUSTMENT")}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  historyTypeFilter === "ADJUSTMENT"
                    ? "bg-purple-950 text-purple-300 font-bold border border-purple-900/50"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Adjustments
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tab 1: Product Stock Overview Table */}
      {activeTab === "OVERVIEW" && (
        <>
          {filteredSummaries.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title="No Product Stock Found"
              description="No products match your search or inventory filter selection."
            />
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/90 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-4">Product Name</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Type</th>
                      <th className="p-4 text-center">Opening Qty</th>
                      <th className="p-4 text-center">Purchased (+Qty)</th>
                      <th className="p-4 text-center">Sold (-Qty)</th>
                      <th className="p-4 text-center">Adjustments</th>
                      <th className="p-4 text-right">Current Stock on Hand</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredSummaries.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4">
                          <div className="font-semibold text-white">{item.name}</div>
                          {item.isArchived && (
                            <span className="text-[10px] uppercase font-bold text-rose-400">
                              (Archived)
                            </span>
                          )}
                        </td>

                        <td className="p-4 text-slate-400 text-xs font-mono">
                          {item.category || "—"}
                        </td>

                        <td className="p-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
                              item.type === "GOODS"
                                ? "bg-purple-950 text-purple-300 border border-purple-900"
                                : item.type === "COMBO"
                                ? "bg-amber-950 text-amber-300 border border-amber-900"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                            }`}
                          >
                            {item.type}
                          </span>
                        </td>

                        <td className="p-4 text-center font-mono text-slate-400">
                          {item.openingQty}
                        </td>

                        <td className="p-4 text-center font-mono font-semibold text-emerald-400">
                          +{item.purchasedQty}
                        </td>

                        <td className="p-4 text-center font-mono font-semibold text-rose-400">
                          -{item.soldQty}
                        </td>

                        <td className="p-4 text-center font-mono font-semibold text-purple-300">
                          {item.adjustedQty > 0 ? `+${item.adjustedQty}` : item.adjustedQty}
                        </td>

                        <td className="p-4 text-right font-mono font-extrabold text-base">
                          {item.type === "SERVICE" ? (
                            <span className="text-slate-600 text-xs italic">N/A (Service)</span>
                          ) : (
                            <span
                              className={
                                item.currentQty <= 0
                                  ? "text-rose-400 font-bold"
                                  : "text-amber-400 font-extrabold"
                              }
                            >
                              {item.currentQty} units
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Tab 2: Stock Movement History Log Table */}
      {activeTab === "HISTORY" && (
        <>
          {filteredHistory.length === 0 ? (
            <EmptyState
              icon={History}
              title="No Movement Ledger History"
              description="No stock movements match your query. Convert purchase/sales orders or post manual stock adjustments to record movements."
            />
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/90 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-4">Timestamp</th>
                      <th className="p-4">Product Name</th>
                      <th className="p-4">Type</th>
                      <th className="p-4 text-center">Movement Qty</th>
                      <th className="p-4">Source Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredHistory.map((mov) => {
                      const dateStr =
                        mov.createdAt instanceof Date
                          ? mov.createdAt.toISOString().replace("T", " ").substring(0, 19)
                          : String(mov.createdAt);

                      return (
                        <tr key={mov.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-4 font-mono text-xs text-slate-400">{dateStr}</td>

                          <td className="p-4 font-semibold text-white">{mov.productName}</td>

                          <td className="p-4">
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase ${
                                mov.type === "PURCHASE"
                                  ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                                  : mov.type === "SALE"
                                  ? "bg-rose-950 text-rose-400 border border-rose-900"
                                  : "bg-purple-950 text-purple-300 border border-purple-900"
                              }`}
                            >
                              {mov.type}
                            </span>
                          </td>

                          <td className="p-4 text-center font-mono font-bold text-base">
                            {mov.quantity > 0 ? (
                              <span className="text-emerald-400">+{mov.quantity}</span>
                            ) : (
                              <span className="text-rose-400">{mov.quantity}</span>
                            )}
                          </td>

                          <td className="p-4 font-mono text-xs text-amber-400 font-semibold">
                            {mov.referenceId || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
