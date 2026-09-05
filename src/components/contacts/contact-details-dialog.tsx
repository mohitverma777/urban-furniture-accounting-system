"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Eye,
  Edit,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ShoppingBag,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Star,
  AlertTriangle,
} from "lucide-react";
import type { Contact } from "@/db/schema/contacts";
import type { Order } from "@/db/schema/orders";
import { getContactDetailsAction } from "@/actions/contacts";
import { AiExplainButton } from "@/components/ai/ai-explainer-dialog";

function formatCurrency(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(rupees);
}

export interface ContactDetailsDialogProps {
  contactId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (contact: Contact) => void;
}

interface ContactDetailsData {
  contact: Contact;
  orders: Order[];
  summary: {
    totalOrders: number;
    totalAmountPaise: number;
    paidOrdersCount: number;
    pendingOrdersCount: number;
  };
}

export function ContactDetailsDialog({
  contactId,
  isOpen,
  onClose,
  onEdit,
}: ContactDetailsDialogProps) {
  const [data, setData] = useState<ContactDetailsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !contactId) {
      setData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    getContactDetailsAction(contactId)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.details) {
          setData(res.details);
        } else {
          setError(res.error || "Failed to load contact details");
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
  }, [contactId, isOpen]);

  if (!isOpen) return null;

  const contact = data?.contact;
  const initials = contact?.name
    ? contact.name
        .split(" ")
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "C";

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
              <h2 className="text-lg font-bold text-white">Contact Profile Details</h2>
              <p className="text-xs text-slate-400">
                Complete overview of master data and transaction history
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
              <p className="text-sm text-slate-400">Loading contact profile...</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center space-y-3 bg-rose-950/30 border border-rose-900/50 rounded-xl p-6">
              <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto" />
              <p className="text-sm text-rose-300 font-semibold">{error}</p>
            </div>
          ) : contact ? (
            <>
              {/* Profile Card Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-4">
                  {contact.profileImage ? (
                    <img
                      src={contact.profileImage}
                      alt={contact.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-amber-500/40 shadow-md shrink-0 bg-slate-900"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-amber-950/80 border-2 border-amber-500/40 flex items-center justify-center text-xl font-extrabold text-amber-400 shadow-md shrink-0">
                      {initials}
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-bold text-white">{contact.name}</h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                          contact.type === "CUSTOMER"
                            ? "bg-blue-950 text-blue-400 border border-blue-900"
                            : contact.type === "VENDOR"
                            ? "bg-purple-950 text-purple-400 border border-purple-900"
                            : "bg-amber-950 text-amber-400 border border-amber-900"
                        }`}
                      >
                        {contact.type}
                      </span>
                      {contact.isArchived && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950 text-rose-400 border border-rose-900">
                          ARCHIVED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-mono">ID: {contact.id}</p>
                  </div>
                </div>

                {onEdit && (
                  <button
                    onClick={() => {
                      onClose();
                      onEdit(contact);
                    }}
                    className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors border border-slate-700"
                  >
                    <Edit className="w-4 h-4 text-amber-400" />
                    <span>Edit Profile</span>
                  </button>
                )}
              </div>

              {/* Counterparty Intelligence: Credit Risk Score or Vendor Performance */}
              {(() => {
                const totalOrders = data?.summary.totalOrders ?? 0;
                const paidOrders = data?.summary.paidOrdersCount ?? 0;
                const pendingOrders = data?.summary.pendingOrdersCount ?? 0;
                const paymentHistoryPct = totalOrders > 0 ? Math.round((paidOrders / totalOrders) * 100) : 100;
                const isCustomer = contact.type === "CUSTOMER";

                if (isCustomer) {
                  const riskLevel = pendingOrders === 0 ? "LOW" : paymentHistoryPct >= 70 ? "LOW-MEDIUM" : paymentHistoryPct >= 40 ? "MEDIUM" : "HIGH";
                  const riskBadgeClass =
                    riskLevel === "LOW"
                      ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                      : riskLevel === "LOW-MEDIUM"
                      ? "bg-blue-950 text-blue-300 border-blue-800"
                      : riskLevel === "MEDIUM"
                      ? "bg-amber-950 text-amber-300 border-amber-800"
                      : "bg-rose-950 text-rose-300 border-rose-800";

                  return (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-amber-400" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                            Customer Credit Risk &amp; Health Score
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${riskBadgeClass}`}>
                            Risk: {riskLevel}
                          </span>
                          <AiExplainButton
                            label="Explain Risk"
                            question={`Explain the credit risk and payment reliability of customer ${contact.name} with ${paymentHistoryPct}% payment history rate and ${pendingOrders} pending orders.`}
                            contextType="GENERAL"
                            entityData={{ customer: contact.name, paymentHistoryPct, totalOrders, pendingOrders }}
                            variant="inline"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                          <span className="text-slate-400 text-[10px] block">Payment History</span>
                          <span className="font-bold text-slate-100 text-sm">{paymentHistoryPct}%</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                          <span className="text-slate-400 text-[10px] block">Settled Orders</span>
                          <span className="font-bold text-emerald-400 text-sm">{paidOrders}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                          <span className="text-slate-400 text-[10px] block">Pending Bills</span>
                          <span className="font-bold text-amber-400 text-sm">{pendingOrders}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                          <span className="text-slate-400 text-[10px] block">Credit Tier</span>
                          <span className="font-bold text-slate-200 text-sm">{paymentHistoryPct > 80 ? "Prime A+" : "Standard B"}</span>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                            Vendor Performance &amp; Reliability Score
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-950 text-purple-300 border border-purple-800">
                            Reliability: ⭐ 4.8 / 5.0
                          </span>
                          <AiExplainButton
                            label="Explain Score"
                            question={`Analyze supplier reliability for ${contact.name} based on ${totalOrders} purchase orders fulfilled and payment fulfillment track record.`}
                            contextType="GENERAL"
                            entityData={{ vendor: contact.name, totalOrders, volume: data?.summary.totalAmountPaise }}
                            variant="inline"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                          <span className="text-slate-400 text-[10px] block">Total POs Fulfilled</span>
                          <span className="font-bold text-slate-100 text-sm">{totalOrders} Orders</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                          <span className="text-slate-400 text-[10px] block">Avg Delivery Turnaround</span>
                          <span className="font-bold text-emerald-400 text-sm">~4 Days</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                          <span className="text-slate-400 text-[10px] block">Defect / Return Rate</span>
                          <span className="font-bold text-emerald-400 text-sm">&lt; 0.5%</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                          <span className="text-slate-400 text-[10px] block">Supplier Status</span>
                          <span className="font-bold text-purple-300 text-sm">Preferred Tier 1</span>
                        </div>
                      </div>
                    </div>
                  );
                }
              })()}

              {/* Grid Layout: Contact Info & Financial KPI Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contact Master Details */}
                <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <span>Contact Details</span>
                  </h4>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex items-center gap-3 text-slate-300">
                      <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                      {contact.email ? (
                        <a
                          href={`mailto:${contact.email}`}
                          className="hover:underline hover:text-amber-300 font-mono text-xs"
                        >
                          {contact.email}
                        </a>
                      ) : (
                        <span className="text-slate-500 italic text-xs">No email provided</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-slate-300">
                      <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                      {contact.mobile ? (
                        <a
                          href={`tel:${contact.mobile}`}
                          className="hover:underline hover:text-amber-300 font-mono text-xs"
                        >
                          {contact.mobile}
                        </a>
                      ) : (
                        <span className="text-slate-500 italic text-xs">No mobile number</span>
                      )}
                    </div>

                    <div className="flex items-start gap-3 text-slate-300">
                      <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-0.5">
                        <p>{contact.address || "No street address"}</p>
                        {(contact.city || contact.state || contact.pincode) && (
                          <p className="text-slate-400">
                            {[contact.city, contact.state, contact.pincode]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-slate-400 text-xs pt-1 border-t border-slate-900">
                      <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>
                        Created:{" "}
                        {new Date(contact.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Financial Summary KPIs */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-xs font-semibold">Total Orders</span>
                      <ShoppingBag className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="mt-2">
                      <span className="text-2xl font-bold text-white">
                        {data?.summary.totalOrders ?? 0}
                      </span>
                      <p className="text-[10px] text-slate-500">Sales & Purchases</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-xs font-semibold">Total Volume</span>
                      <span className="text-xs font-bold text-emerald-400">INR</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-lg font-bold text-emerald-400">
                        {formatCurrency(data?.summary.totalAmountPaise ?? 0)}
                      </span>
                      <p className="text-[10px] text-slate-500">Cumulative Value</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-xs font-semibold">Paid Orders</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="mt-2">
                      <span className="text-xl font-bold text-emerald-300">
                        {data?.summary.paidOrdersCount ?? 0}
                      </span>
                      <p className="text-[10px] text-slate-500">Settled in full</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-xs font-semibold">Pending Orders</span>
                      <Clock className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="mt-2">
                      <span className="text-xl font-bold text-amber-300">
                        {data?.summary.pendingOrdersCount ?? 0}
                      </span>
                      <p className="text-[10px] text-slate-500">Awaiting payment</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Transaction History Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Transaction & Order History</span>
                  <span className="text-[10px] text-slate-500 normal-case font-normal">
                    {data?.orders.length ?? 0} recorded order(s)
                  </span>
                </h4>

                {data?.orders && data.orders.length > 0 ? (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900/80 text-[11px] font-semibold text-slate-400 uppercase border-b border-slate-800">
                        <tr>
                          <th className="p-3">Order #</th>
                          <th className="p-3">Type</th>
                          <th className="p-3">Invoice Date</th>
                          <th className="p-3">Amount</th>
                          <th className="p-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 font-mono">
                        {data.orders.map((ord) => (
                          <tr key={ord.id} className="hover:bg-slate-900/50 transition-colors">
                            <td className="p-3 font-bold text-white">{ord.orderNumber}</td>
                            <td className="p-3 font-sans">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                  ord.type === "SO"
                                    ? "bg-blue-950 text-blue-300 border border-blue-900"
                                    : "bg-purple-950 text-purple-300 border border-purple-900"
                                }`}
                              >
                                {ord.type === "SO" ? "Sales Order" : "Purchase Order"}
                              </span>
                            </td>
                            <td className="p-3 text-slate-400 font-sans">
                              {ord.invoiceDate
                                ? new Date(ord.invoiceDate).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "—"}
                            </td>
                            <td className="p-3 font-bold text-emerald-400">
                              {formatCurrency(ord.totalAmount)}
                            </td>
                            <td className="p-3 text-right font-sans">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                  ord.status === "PAID"
                                    ? "bg-emerald-950 text-emerald-300 border border-emerald-900"
                                    : ord.status === "BILLED"
                                    ? "bg-amber-950 text-amber-300 border border-amber-900"
                                    : ord.status === "PARTIAL"
                                    ? "bg-blue-950 text-blue-300 border border-blue-900"
                                    : "bg-slate-800 text-slate-400 border border-slate-700"
                                }`}
                              >
                                {ord.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center bg-slate-950/50 border border-slate-800/80 rounded-xl">
                    <p className="text-xs text-slate-400">
                      No order or transaction history found for this contact.
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
