"use client";

import React, { useState } from "react";
import { Plus, X, Boxes, Loader2 } from "lucide-react";
import { createStockAdjustmentAction } from "@/actions/stock";
import type { Product } from "@/db/schema/products";

export interface StockAdjustmentDialogProps {
  stockableProducts: Product[];
  onSuccess?: () => void;
}

export function StockAdjustmentDialog({
  stockableProducts,
  onSuccess,
}: StockAdjustmentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>(
    stockableProducts[0]?.id || ""
  );
  const [direction, setDirection] = useState<"INCREASE" | "DECREASE">("INCREASE");
  const [quantity, setQuantity] = useState<string>("1");
  const [reason, setReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setError("Please select a product.");
      return;
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setError("Please enter a valid positive integer quantity.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await createStockAdjustmentAction({
      productId: selectedProductId,
      quantity: qty,
      direction,
      reason,
    });

    setIsSubmitting(false);

    if (result.success) {
      setIsOpen(false);
      setQuantity("1");
      setReason("");
      if (onSuccess) onSuccess();
    } else {
      setError(result.error || "Failed to record stock adjustment.");
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-sm transition-colors shadow-md"
      >
        <Plus className="w-4 h-4" />
        <span>Manual Stock Adjustment</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Stock Adjustment</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Manual inventory correction or physical audit adjustment.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  {error}
                </div>
              )}

              {/* Product Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Product (Goods / Combo) *
                </label>
                {stockableProducts.length === 0 ? (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-500 text-center">
                    No active stockable products found.
                  </div>
                ) : (
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 font-medium"
                    required
                  >
                    {stockableProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.type})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Adjustment Direction Toggle */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Adjustment Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDirection("INCREASE")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      direction === "INCREASE"
                        ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-md"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    + Increase Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection("DECREASE")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      direction === "DECREASE"
                        ? "bg-rose-950/80 border-rose-500/50 text-rose-300 shadow-md"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    - Decrease Stock
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Quantity Units *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 font-mono font-bold focus:outline-none focus:border-amber-500/50"
                  required
                />
              </div>

              {/* Reason / Reference */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Reason / Audit Reference Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Physical inventory count audit"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || stockableProducts.length === 0}
                  className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <span>Post Adjustment</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
