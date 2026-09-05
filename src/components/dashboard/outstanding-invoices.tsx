import React from "react";
import type { OutstandingInvoiceItem } from "@/services/dashboard/types";

export function OutstandingInvoices({ items }: { items: OutstandingInvoiceItem[] }) {
  if (items.length === 0) {
    return (
      <div className="p-6 text-center text-slate-400 text-sm">
        No unsettled customer invoices or vendor bills.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-300">
        <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
          <tr>
            <th className="p-3">Order #</th>
            <th className="p-3">Counterparty</th>
            <th className="p-3">Type</th>
            <th className="p-3">Status</th>
            <th className="p-3 text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
              <td className="p-3 font-mono font-semibold text-amber-400">
                {item.orderNumber}
              </td>
              <td className="p-3 text-white font-medium">{item.contactName}</td>
              <td className="p-3">
                <span
                  className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase ${
                    item.type === "SO"
                      ? "bg-blue-950 text-blue-400 border border-blue-900"
                      : "bg-purple-950 text-purple-400 border border-purple-900"
                  }`}
                >
                  {item.type === "SO" ? "Customer Inv" : "Vendor Bill"}
                </span>
              </td>
              <td className="p-3">
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase ${
                    item.status === "BILLED"
                      ? "bg-amber-950 text-amber-400 border border-amber-900"
                      : item.status === "PARTIAL"
                      ? "bg-blue-950 text-blue-400 border border-blue-900"
                      : "bg-slate-800 text-slate-300 border border-slate-700"
                  }`}
                >
                  {item.status}
                </span>
              </td>
              <td className="p-3 font-mono font-bold text-right text-white">
                ₹{(item.totalAmount / 100).toLocaleString("en-IN")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
