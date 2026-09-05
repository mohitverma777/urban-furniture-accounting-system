"use client";

import React, { useEffect, useState } from "react";
import { CreditCard, Calendar, CheckCircle2 } from "lucide-react";

interface PortalPayment {
  id: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  reference?: string | null;
  orderId: string;
}

export function formatINR(paise: number): string {
  return `₹${((paise || 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export default function PortalPaymentsPage() {
  const [payments, setPayments] = useState<PortalPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/payments")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.payments)) {
          setPayments(data.payments);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">
          My Payments
        </h1>
        <p className="text-slate-400 text-sm">
          Track verified payment receipts and transaction records processed for your account.
        </p>
      </div>

      {loading ? (
        <div className="p-12 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center space-y-3">
          <CreditCard className="mx-auto h-12 w-12 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-200">No payments recorded</h3>
          <p className="text-xs text-slate-400">
            No payment receipts have been settled for your account yet.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/90 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Receipt ID</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Payment Method</th>
                  <th className="py-3.5 px-4">Reference</th>
                  <th className="py-3.5 px-4 text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {payments.map((pmt) => (
                  <tr key={pmt.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-200">
                      {pmt.reference || pmt.id.substring(0, 8).toUpperCase()}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">
                      {new Date(pmt.paymentDate).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-3 px-4">
                      <span className="uppercase px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {pmt.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs font-mono">
                      {pmt.reference || "—"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      {formatINR(pmt.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
