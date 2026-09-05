"use client";

import React, { useEffect, useState } from "react";
import { X, CreditCard, BookOpen, CheckCircle2, Calendar, Hash, User } from "lucide-react";
import { getPaymentByIdAction } from "@/actions/payments";
import type { PaymentDetail } from "@/services/payments/query";

export interface PaymentDetailModalProps {
  paymentId: string | null;
  onClose: () => void;
}

export function PaymentDetailModal({ paymentId, onClose }: PaymentDetailModalProps) {
  const [detail, setDetail] = useState<PaymentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!paymentId) {
      return;
    }

    Promise.resolve().then(() => {
      if (isMounted) setIsLoading(true);
    });

    getPaymentByIdAction(paymentId)
      .then((data) => {
        if (isMounted) {
          setDetail(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setDetail(null);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [paymentId]);

  if (!paymentId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Payment Details</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {paymentId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 animate-pulse">
              Loading payment details & journal posting...
            </div>
          ) : !detail ? (
            <div className="py-12 text-center text-rose-400">
              Failed to load payment details.
            </div>
          ) : (
            <>
              {/* Direction & Amount Header Card */}
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider mb-2 ${
                      detail.order.type === "SO"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                        : "bg-rose-950 text-rose-400 border border-rose-900"
                    }`}
                  >
                    {detail.order.type === "SO" ? "INBOUND CUSTOMER RECEIPT" : "OUTBOUND VENDOR DISBURSEMENT"}
                  </span>
                  <div className="text-sm font-semibold text-slate-300">
                    Source Document:{" "}
                    <span className="font-mono font-bold text-amber-400">
                      {detail.order.orderNumber}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-medium">Payment Amount</span>
                  <span className="text-2xl font-extrabold font-mono text-emerald-400">
                    ₹{(detail.amount / 100).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Summary Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-400 block flex items-center gap-1 font-medium">
                    <User className="w-3.5 h-3.5 text-slate-400" /> Party / Contact
                  </span>
                  <span className="font-bold text-slate-200 mt-1 block truncate">
                    {detail.contact.name}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block flex items-center gap-1 font-medium">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" /> Method
                  </span>
                  <span className="font-mono font-semibold text-slate-200 mt-1 block uppercase">
                    {detail.paymentMethod}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block flex items-center gap-1 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Payment Date
                  </span>
                  <span className="font-mono font-semibold text-slate-200 mt-1 block">
                    {detail.paymentDate instanceof Date
                      ? detail.paymentDate.toISOString().split("T")[0]
                      : String(detail.paymentDate)}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block flex items-center gap-1 font-medium">
                    <Hash className="w-3.5 h-3.5 text-slate-400" /> Reference / UTR
                  </span>
                  <span className="font-mono font-semibold text-amber-400 mt-1 block truncate">
                    {detail.reference || "—"}
                  </span>
                </div>
              </div>

              {/* Double-Entry Journal Posting Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-400" /> Linked Journal Entry Posting
                  </h4>
                  {detail.journalEntry && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-950 text-emerald-400 border border-emerald-900">
                      <CheckCircle2 className="w-3 h-3" /> BALANCED
                    </span>
                  )}
                </div>

                {!detail.journalEntry ? (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-slate-500 text-xs">
                    No linked journal entry found for this payment.
                  </div>
                ) : (
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-inner">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="bg-slate-900/90 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="p-3">Account Code & Name</th>
                          <th className="p-3">Analytic Tag</th>
                          <th className="p-3 text-right">Debit (Dr)</th>
                          <th className="p-3 text-right">Credit (Cr)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-xs">
                        {detail.journalEntry.lines.map((line) => (
                          <tr key={line.id} className="hover:bg-slate-900/40 transition-colors">
                            <td className="p-3">
                              <div className="font-semibold text-slate-100 flex items-center gap-2">
                                <span className="font-mono text-purple-400 font-bold">{line.accountCode}</span>
                                <span>{line.accountName}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              {line.analyticAccountName ? (
                                <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-purple-950 text-purple-300 border border-purple-900">
                                  {line.analyticAccountName}
                                </span>
                              ) : (
                                <span className="text-slate-600 italic">—</span>
                              )}
                            </td>
                            <td className="p-3 text-right font-mono font-bold">
                              {line.debit > 0 ? (
                                <span className="text-emerald-400">
                                  ₹{(line.debit / 100).toLocaleString("en-IN")}
                                </span>
                              ) : (
                                <span className="text-slate-600">₹0</span>
                              )}
                            </td>
                            <td className="p-3 text-right font-mono font-bold">
                              {line.credit > 0 ? (
                                <span className="text-emerald-400">
                                  ₹{(line.credit / 100).toLocaleString("en-IN")}
                                </span>
                              ) : (
                                <span className="text-slate-600">₹0</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
