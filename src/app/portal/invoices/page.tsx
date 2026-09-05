"use client";

import React, { useEffect, useState } from "react";
import { FileText, Calendar, CheckCircle2, Clock, AlertCircle, Download } from "lucide-react";

interface PortalInvoice {
  id: string;
  orderNumber: string;
  invoiceDate: string | null;
  dueDate: string | null;
  totalAmount: number;
  status: string;
}

export function formatINR(paise: number): string {
  return `₹${((paise || 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export default function PortalInvoicesPage() {
  const [invoices, setInvoices] = useState<PortalInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/invoices")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.invoices)) {
          setInvoices(data.invoices);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "PAID":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-900">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Paid
          </span>
        );
      case "BILLED":
      case "PARTIAL":
      case "UNPAID":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950 text-amber-400 border border-amber-900">
            <Clock className="w-3 h-3 mr-1" /> Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            <AlertCircle className="w-3 h-3 mr-1" /> {status}
          </span>
        );
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">
          My Invoices
        </h1>
        <p className="text-slate-400 text-sm">
          View and download certified tax invoices issued for your account.
        </p>
      </div>

      {loading ? (
        <div className="p-12 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center space-y-3">
          <FileText className="mx-auto h-12 w-12 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-200">No invoices found</h3>
          <p className="text-xs text-slate-400">
            You don&apos;t have any commercial invoices associated with your customer profile.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/90 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Invoice Date</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Total Amount</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-200">
                      {inv.orderNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">
                      {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(inv.status)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-100">
                      {formatINR(inv.totalAmount)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <a
                        href={`/api/sales/${inv.id}/invoice-pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 shadow transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </a>
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
