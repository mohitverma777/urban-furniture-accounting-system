"use client";

import React, { useState, useMemo } from "react";
import { Search, Eye, CreditCard, ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { PaymentListItem } from "@/services/payments/query";
import { EmptyState } from "@/components/common/empty-state";
import { PaymentDetailModal } from "./payment-detail-modal";

export interface PaymentsClientShellProps {
  initialPayments: PaymentListItem[];
}

type DirectionTab = "ALL" | "CUSTOMER" | "VENDOR";
type MethodTab = "ALL" | "BANK" | "CASH";

export function PaymentsClientShell({
  initialPayments,
}: PaymentsClientShellProps) {
  const [search, setSearch] = useState("");
  const [directionTab, setDirectionTab] = useState<DirectionTab>("ALL");
  const [methodTab, setMethodTab] = useState<MethodTab>("ALL");
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  const filteredPayments = useMemo(() => {
    return initialPayments.filter((p) => {
      // Direction filter
      if (directionTab === "CUSTOMER" && p.orderType !== "SO") return false;
      if (directionTab === "VENDOR" && p.orderType !== "PO") return false;

      // Method filter
      if (methodTab !== "ALL" && p.paymentMethod !== methodTab) return false;

      // Search query filter
      if (search.trim() !== "") {
        const query = search.toLowerCase().trim();
        const refMatch = p.reference?.toLowerCase().includes(query);
        const orderMatch = p.orderNumber.toLowerCase().includes(query);
        const contactMatch = p.contactName.toLowerCase().includes(query);
        if (!refMatch && !orderMatch && !contactMatch) return false;
      }

      return true;
    });
  }, [initialPayments, directionTab, methodTab, search]);

  return (
    <div className="space-y-6">
      {/* Header Bar Controls */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm space-y-4 lg:space-y-0 lg:flex lg:items-center lg:justify-between lg:gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search reference, order #, or contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
          />
        </div>

        {/* Direction & Method Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Direction Tabs */}
          <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setDirectionTab("ALL")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                directionTab === "ALL"
                  ? "bg-slate-800 text-white shadow-sm font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All Direction
            </button>
            <button
              onClick={() => setDirectionTab("CUSTOMER")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                directionTab === "CUSTOMER"
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-900/60 shadow-sm font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400" /> Receipts (AR)
            </button>
            <button
              onClick={() => setDirectionTab("VENDOR")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                directionTab === "VENDOR"
                  ? "bg-rose-950 text-rose-400 border border-rose-900/60 shadow-sm font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" /> Disbursements (AP)
            </button>
          </div>

          {/* Method Filter */}
          <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setMethodTab("ALL")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                methodTab === "ALL"
                  ? "bg-slate-800 text-white shadow-sm font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All Methods
            </button>
            <button
              onClick={() => setMethodTab("BANK")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                methodTab === "BANK"
                  ? "bg-purple-950 text-purple-300 border border-purple-900/60 shadow-sm font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Bank
            </button>
            <button
              onClick={() => setMethodTab("CASH")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                methodTab === "CASH"
                  ? "bg-purple-950 text-purple-300 border border-purple-900/60 shadow-sm font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Cash
            </button>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      {filteredPayments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No Payments Found"
          description="No customer receipts or vendor disbursements match your search or filter selection."
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/90 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">Reference / ID</th>
                  <th className="p-4">Source Order</th>
                  <th className="p-4">Party / Contact</th>
                  <th className="p-4">Direction</th>
                  <th className="p-4">Method</th>
                  <th className="p-4">Payment Date</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPayments.map((pay) => {
                  const isCustomerReceipt = pay.orderType === "SO";
                  const dateStr =
                    pay.paymentDate instanceof Date
                      ? pay.paymentDate.toISOString().split("T")[0]
                      : String(pay.paymentDate);

                  return (
                    <tr key={pay.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-mono font-bold text-amber-400">
                        {pay.reference || pay.id.substring(0, 8)}
                      </td>
                      <td className="p-4 font-mono text-slate-200 font-semibold">
                        {pay.orderNumber}
                      </td>
                      <td className="p-4 font-medium text-white">{pay.contactName}</td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            isCustomerReceipt
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                              : "bg-rose-950 text-rose-400 border border-rose-900"
                          }`}
                        >
                          {isCustomerReceipt ? (
                            <>
                              <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400" />
                              INBOUND (AR)
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                              OUTBOUND (AP)
                            </>
                          )}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-xs uppercase font-semibold text-purple-300">
                        {pay.paymentMethod}
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-400">{dateStr}</td>
                      <td className="p-4 font-mono font-bold text-right text-emerald-400 text-base">
                        ₹{(pay.amount / 100).toLocaleString("en-IN")}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedPaymentId(pay.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Detail</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Detail Modal */}
      <PaymentDetailModal
        paymentId={selectedPaymentId}
        onClose={() => setSelectedPaymentId(null)}
      />
    </div>
  );
}
