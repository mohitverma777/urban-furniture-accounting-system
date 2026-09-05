"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileCheck,
  CreditCard,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { convertOrderToVendorBillAction } from "@/actions/purchases";
import { VendorPaymentModal } from "./vendor-payment-modal";
import { AccountingImpactCard } from "./accounting-impact-card";

export interface PurchaseDetailClientProps {
  detail: {
    order: {
      id: string;
      orderNumber: string;
      type: string;
      status: "DRAFT" | "BILLED" | "PARTIAL" | "PAID";
      invoiceDate: Date | null;
      dueDate: Date | null;
      subtotal: number;
      taxAmount: number;
      totalAmount: number;
      contactId: string;
      contactName: string | null;
      contactEmail: string | null;
      contactMobile: string | null;
      contactAddress: string | null;
      contactCity: string | null;
      createdAt: Date;
    };
    items: Array<{
      id: string;
      productId: string;
      productName: string | null;
      productType: string | null;
      quantity: number;
      unitPrice: number;
      taxRate: number;
      taxAmount: number;
      lineTotal: number;
    }>;
    payments: Array<{
      id: string;
      amount: number;
      paymentMethod: string;
      paymentDate: Date;
      reference: string | null;
    }>;
    totalPaid: number;
    outstandingAmount: number;
    journalEntry: {
      id: string;
      date: Date;
      reference: string | null;
      description: string | null;
      lines: Array<{
        id: string;
        accountCode: string;
        accountName: string;
        debit: number;
        credit: number;
        analyticAccountName: string | null;
      }>;
    } | null;
  };
}

export function PurchaseDetailClient({ detail }: PurchaseDetailClientProps) {
  const { order, items, payments, totalPaid, outstandingAmount, journalEntry } = detail;
  const [isConverting, setIsConverting] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConvertToBill = async () => {
    setIsConverting(true);
    setError(null);
    const res = await convertOrderToVendorBillAction(order.id);
    setIsConverting(false);
    if (!res.success) {
      setError(res.error || "Failed to convert to Vendor Bill");
    }
  };

  const invDateStr = order.invoiceDate
    ? order.invoiceDate.toISOString().split("T")[0]
    : "—";
  const dueDateStr = order.dueDate
    ? order.dueDate.toISOString().split("T")[0]
    : "—";

  return (
    <div className="space-y-6">
      {/* Back Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/purchases"
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-amber-400 font-semibold mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Purchases
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-white font-mono tracking-tight">
              {order.orderNumber}
            </h1>
            <span
              className={`inline-flex px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                order.status === "PAID"
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                  : order.status === "PARTIAL"
                  ? "bg-amber-950 text-amber-400 border border-amber-900"
                  : order.status === "BILLED"
                  ? "bg-blue-950 text-blue-400 border border-blue-900"
                  : "bg-slate-800 text-slate-300 border border-slate-700"
              }`}
            >
              {order.status}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {order.status === "DRAFT" && (
            <button
              onClick={handleConvertToBill}
              disabled={isConverting}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition-colors shadow-md disabled:opacity-50"
            >
              {isConverting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Converting...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  <span>Convert to Vendor Bill</span>
                </>
              )}
            </button>
          )}

          {(order.status === "BILLED" || order.status === "PARTIAL") && (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition-colors shadow-md"
            >
              <CreditCard className="w-4 h-4" />
              <span>Record Vendor Payment</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Overview Metadata Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Vendor Info */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-md space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>Vendor Details</span>
          </div>
          <div className="text-base font-bold text-white">{order.contactName || "—"}</div>
          {order.contactEmail && (
            <div className="text-xs text-slate-400 font-mono">{order.contactEmail}</div>
          )}
          {order.contactMobile && (
            <div className="text-xs text-slate-400 font-mono">{order.contactMobile}</div>
          )}
          {order.contactAddress && (
            <div className="text-xs text-slate-500 mt-1">
              {order.contactAddress}, {order.contactCity}
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-md space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Key Timestamps</span>
          </div>
          <div className="flex justify-between items-center text-xs py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Order / Invoice Date</span>
            <span className="font-mono font-semibold text-slate-200">{invDateStr}</span>
          </div>
          <div className="flex justify-between items-center text-xs py-1">
            <span className="text-slate-400">Payment Due Date</span>
            <span className="font-mono font-semibold text-slate-200">{dueDateStr}</span>
          </div>
        </div>

        {/* Financial Balance Summary */}
        <div className="bg-slate-900 border border-amber-500/20 bg-amber-500/5 p-5 rounded-2xl shadow-md space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" /> Payment Balance
            </span>
          </div>

          <div className="flex justify-between items-center text-xs py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Total Order Amount</span>
            <span className="font-mono font-bold text-slate-100">
              ₹{(order.totalAmount / 100).toLocaleString("en-IN")}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Total Disbursed</span>
            <span className="font-mono font-bold text-emerald-400">
              ₹{(totalPaid / 100).toLocaleString("en-IN")}
            </span>
          </div>

          <div className="flex justify-between items-center pt-1 font-bold">
            <span className="text-amber-400 text-xs uppercase">Outstanding Balance</span>
            <span className="font-mono text-base text-amber-400">
              ₹{(outstandingAmount / 100).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <h3 className="text-base font-bold text-white uppercase tracking-wider">
          Purchased Line Items
        </h3>

        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/90 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Product Name</th>
                <th className="p-3">Type</th>
                <th className="p-3 text-center">Qty</th>
                <th className="p-3 text-right">Cost Price (₹)</th>
                <th className="p-3 text-right">Tax Rate</th>
                <th className="p-3 text-right">Tax (₹)</th>
                <th className="p-3 text-right">Line Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-900/40">
                  <td className="p-3 font-semibold text-slate-100">{item.productName || "—"}</td>
                  <td className="p-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
                        item.productType === "GOODS"
                          ? "bg-purple-950 text-purple-300 border border-purple-900"
                          : "bg-blue-950 text-blue-300 border border-blue-900"
                      }`}
                    >
                      {item.productType}
                    </span>
                  </td>
                  <td className="p-3 text-center font-mono font-semibold">{item.quantity}</td>
                  <td className="p-3 text-right font-mono">
                    ₹{(item.unitPrice / 100).toLocaleString("en-IN")}
                  </td>
                  <td className="p-3 text-right font-mono text-xs text-slate-400">
                    {item.taxRate}%
                  </td>
                  <td className="p-3 text-right font-mono text-slate-400">
                    ₹{(item.taxAmount / 100).toLocaleString("en-IN")}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-amber-400">
                    ₹{(item.lineTotal / 100).toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Breakdown */}
        <div className="flex justify-end">
          <div className="w-72 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal</span>
              <span className="font-mono font-semibold text-slate-200">
                ₹{(order.subtotal / 100).toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>GST Tax</span>
              <span className="font-mono font-semibold text-slate-200">
                ₹{(order.taxAmount / 100).toLocaleString("en-IN")}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-sm">
              <span className="text-slate-100">Total Order Amount</span>
              <span className="font-mono text-amber-400">
                ₹{(order.totalAmount / 100).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Accounting Impact Section */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-white uppercase tracking-wider">
          Accounting Impact & Double-Entry Journal
        </h3>
        <AccountingImpactCard journalEntry={journalEntry} />
      </div>

      {/* Payment History Timeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <h3 className="text-base font-bold text-white uppercase tracking-wider">
          Vendor Payment History
        </h3>

        {payments.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-slate-500 text-xs">
            No payments recorded yet for this Vendor Bill.
          </div>
        ) : (
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/90 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Payment Date</th>
                  <th className="p-3">Method</th>
                  <th className="p-3">Reference / UTR</th>
                  <th className="p-3 text-right">Amount Disbursed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/40">
                    <td className="p-3 font-mono text-xs text-slate-300">
                      {p.paymentDate.toISOString().split("T")[0]}
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-xs font-semibold text-amber-400">
                      {p.reference || "—"}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-400">
                      ₹{(p.amount / 100).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <VendorPaymentModal
        orderId={order.id}
        orderNumber={order.orderNumber}
        outstandingAmountPaise={outstandingAmount}
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
      />
    </div>
  );
}
