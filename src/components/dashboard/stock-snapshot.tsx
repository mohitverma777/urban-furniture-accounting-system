import React from "react";
import type { StockSnapshotItem } from "@/services/dashboard";

export function StockSnapshot({ items }: { items: StockSnapshotItem[] }) {
  if (items.length === 0) {
    return (
      <div className="p-6 text-center text-slate-400 text-sm">
        No active products in catalog.
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-800/60">
      {items.map((item) => (
        <div key={item.id} className="p-3 flex items-center justify-between text-sm hover:bg-slate-800/30 transition-colors">
          <div>
            <h4 className="font-semibold text-slate-200">{item.name}</h4>
            <span className="text-xs text-slate-400">
              {item.category} • <span className="font-mono text-amber-400">{item.type}</span>
            </span>
          </div>

          <div className="text-right font-mono">
            <span className="block font-bold text-emerald-400">
              ₹{(item.salesPrice / 100).toLocaleString("en-IN")}
            </span>
            <span className="text-xs text-slate-500">
              Cost: ₹{(item.costPrice / 100).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
