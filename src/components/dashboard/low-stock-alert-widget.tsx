"use client";

import React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  PackageX,
  ShoppingCart,
  ArrowRight,
  TrendingDown,
  Sparkles,
  PlusCircle,
} from "lucide-react";
import type { LowStockAlertItem } from "@/services/dashboard/types";

interface LowStockAlertWidgetProps {
  alerts: LowStockAlertItem[];
}

export function LowStockAlertWidget({ alerts }: LowStockAlertWidgetProps) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-900 flex items-center justify-center font-bold">
            <PackageX className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Stock Levels Healthy</h4>
            <p className="text-xs text-slate-400">
              All catalog inventory products are above minimum reorder thresholds.
            </p>
          </div>
        </div>
        <Link
          href="/products"
          className="text-xs font-semibold text-amber-400 hover:underline"
        >
          View Inventory →
        </Link>
      </div>
    );
  }

  const criticalCount = alerts.filter(
    (a) => a.status === "CRITICAL_OUT_OF_STOCK"
  ).length;

  return (
    <div className="p-6 rounded-2xl bg-gradient-to-r from-rose-950/30 via-slate-900 to-amber-950/30 border border-rose-500/30 shadow-xl space-y-4">
      {/* Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-500/20 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-950 text-rose-400 border border-rose-800 flex items-center justify-center font-bold shadow-inner">
            <AlertTriangle className="w-5 h-5 animate-pulse text-rose-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Low Stock &amp; Reorder Alerts</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {alerts.length} Low
              </span>
              {criticalCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-950 text-rose-400 border border-rose-800 uppercase">
                  {criticalCount} Critical
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Automatic inventory depletion detection (SO → Stock Depletion → Purchase Order Suggestion)
            </p>
          </div>
        </div>

        <Link
          href="/purchases"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-md self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create Purchase Order</span>
        </Link>
      </div>

      {/* Grid of Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {alerts.map((item) => {
          const isCritical = item.status === "CRITICAL_OUT_OF_STOCK";

          return (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition-all shadow-md space-y-3 flex flex-col justify-between ${
                isCritical
                  ? "bg-rose-950/20 border-rose-900/60 hover:border-rose-500/50"
                  : "bg-amber-950/20 border-amber-900/60 hover:border-amber-500/50"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-white line-clamp-1">
                      {item.name}
                    </h4>
                    <span className="text-[11px] font-mono text-slate-400">
                      {item.category || "General Furniture"}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      isCritical
                        ? "bg-rose-950 text-rose-400 border border-rose-800"
                        : "bg-amber-950 text-amber-400 border border-amber-800"
                    }`}
                  >
                    {isCritical ? "Out of Stock" : "Low Stock"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1 border-t border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Stock-on-Hand</span>
                    <span
                      className={`font-bold text-sm ${
                        isCritical ? "text-rose-400" : "text-amber-400"
                      }`}
                    >
                      {item.currentQty} units
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Reorder Target</span>
                    <span className="text-slate-200 font-medium">
                      +{item.recommendedReorderQty} units
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Estimated PO Cost</span>
                  <span className="font-mono font-bold text-white">
                    ₹{(item.estimatedReorderCost / 100).toLocaleString("en-IN")}
                  </span>
                </div>
                <Link
                  href={`/purchases?reorderProduct=${item.id}`}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1"
                >
                  <span>Reorder</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
