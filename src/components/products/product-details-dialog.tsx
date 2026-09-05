"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Eye,
  Edit,
  Package,
  Boxes,
  TrendingUp,
  Tag,
  Calendar,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import type { Product } from "@/db/schema/products";
import { getProductDetailsAction } from "@/actions/products";
import type { ProductTransactionHistoryItem } from "@/services/products";

export interface ProductDetailsDialogProps {
  productId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (product: Product) => void;
}

interface ProductDetailsData {
  product: Product;
  stockOnHand: number;
  transactions: ProductTransactionHistoryItem[];
  summary: {
    totalUnitsSold: number;
    totalUnitsPurchased: number;
    totalSalesRevenuePaise: number;
    marginPercentage: number;
  };
}

function formatCurrency(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(rupees);
}

export function ProductDetailsDialog({
  productId,
  isOpen,
  onClose,
  onEdit,
}: ProductDetailsDialogProps) {
  const [data, setData] = useState<ProductDetailsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !productId) {
      setData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    getProductDetailsAction(productId)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.details) {
          setData(res.details);
        } else {
          setError(res.error || "Failed to load product details");
        }
      })
      .catch((err) => {
        if (isMounted) setError(err?.message || "An unexpected error occurred");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [productId, isOpen]);

  if (!isOpen) return null;

  const product = data?.product;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in-0">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-950/80 text-amber-400 border border-amber-800/80">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Product Master Profile</h2>
              <p className="text-xs text-slate-400">
                Detailed pricing, inventory stock status, and order history
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-400">Loading product details & inventory...</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center space-y-3 bg-rose-950/30 border border-rose-900/50 rounded-xl p-6">
              <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto" />
              <p className="text-sm text-rose-300 font-semibold">{error}</p>
            </div>
          ) : product ? (
            <>
              {/* Product Header Card */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-4">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-500/40 shadow-md shrink-0 bg-slate-900"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-amber-950/80 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md shrink-0">
                      <Package className="w-10 h-10" />
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-bold text-white">{product.name}</h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                          product.type === "GOODS"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                            : product.type === "SERVICE"
                            ? "bg-blue-950 text-blue-400 border border-blue-900"
                            : "bg-purple-950 text-purple-400 border border-purple-900"
                        }`}
                      >
                        {product.type}
                      </span>
                      {product.isArchived && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950 text-rose-400 border border-rose-900">
                          ARCHIVED
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 text-slate-500" />
                        Category: {product.category || "Uncategorized"}
                      </span>
                      <span className="font-mono text-slate-500">ID: {product.id}</span>
                    </div>
                  </div>
                </div>

                {onEdit && (
                  <button
                    onClick={() => {
                      onClose();
                      onEdit(product);
                    }}
                    className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors border border-slate-700"
                  >
                    <Edit className="w-4 h-4 text-amber-400" />
                    <span>Edit Item</span>
                  </button>
                )}
              </div>

              {/* Financial & Inventory KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <span className="text-xs font-semibold text-slate-400">Sales Price</span>
                  <div className="mt-2">
                    <span className="text-xl font-bold text-emerald-400">
                      {formatCurrency(product.salesPrice)}
                    </span>
                    <p className="text-[10px] text-slate-500">Listed unit price</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <span className="text-xs font-semibold text-slate-400">Cost Price</span>
                  <div className="mt-2">
                    <span className="text-xl font-bold text-slate-300">
                      {formatCurrency(product.costPrice)}
                    </span>
                    <p className="text-[10px] text-slate-500">Purchase cost</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold">Gross Margin</span>
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="mt-2">
                    <span className="text-xl font-bold text-amber-400">
                      {data?.summary.marginPercentage ?? 0}%
                    </span>
                    <p className="text-[10px] text-slate-500">Profit margin</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold">Stock On Hand</span>
                    <Boxes className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="mt-2">
                    <span className="text-xl font-bold text-white">
                      {product.type === "SERVICE" ? "N/A" : `${data?.stockOnHand ?? 0} units`}
                    </span>
                    <p className="text-[10px] text-slate-500">Current warehouse stock</p>
                  </div>
                </div>
              </div>

              {/* Order Transaction History */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Sales & Purchase Order Line History</span>
                  <span className="text-[10px] text-slate-500 normal-case font-normal">
                    {data?.transactions.length ?? 0} transaction line(s)
                  </span>
                </h4>

                {data?.transactions && data.transactions.length > 0 ? (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900/80 text-[11px] font-semibold text-slate-400 uppercase border-b border-slate-800">
                        <tr>
                          <th className="p-3">Order #</th>
                          <th className="p-3">Type</th>
                          <th className="p-3">Date</th>
                          <th className="p-3">Quantity</th>
                          <th className="p-3">Unit Price</th>
                          <th className="p-3 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 font-mono">
                        {data.transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-900/50 transition-colors">
                            <td className="p-3 font-bold text-white">{tx.orderNumber}</td>
                            <td className="p-3 font-sans">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                  tx.orderType === "SO"
                                    ? "bg-blue-950 text-blue-300 border border-blue-900"
                                    : "bg-purple-950 text-purple-300 border border-purple-900"
                                }`}
                              >
                                {tx.orderType === "SO" ? (
                                  <>
                                    <ArrowUpRight className="w-3 h-3 text-blue-400" />
                                    <span>Sale</span>
                                  </>
                                ) : (
                                  <>
                                    <ArrowDownLeft className="w-3 h-3 text-purple-400" />
                                    <span>Purchase</span>
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="p-3 text-slate-400 font-sans">
                              {tx.invoiceDate
                                ? new Date(tx.invoiceDate).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "—"}
                            </td>
                            <td className="p-3 font-bold text-slate-200">{tx.quantity} units</td>
                            <td className="p-3 text-slate-300">
                              {formatCurrency(tx.unitPricePaise)}
                            </td>
                            <td className="p-3 text-right font-bold text-emerald-400">
                              {formatCurrency(tx.lineTotalPaise)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center bg-slate-950/50 border border-slate-800/80 rounded-xl">
                    <p className="text-xs text-slate-400">
                      No order line history recorded for this product yet.
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
