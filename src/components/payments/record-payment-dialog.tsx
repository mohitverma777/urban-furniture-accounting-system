"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, CreditCard, Loader2 } from "lucide-react";
import {
  recordCentralPaymentAction,
  getUnpaidDocumentsAction,
} from "@/actions/payments";
import type { UnpaidDocumentItem } from "@/services/payments/query";

export interface RecordPaymentDialogProps {
  initialUnpaidDocs?: UnpaidDocumentItem[];
  onPaymentSuccess?: () => void;
}

export function RecordPaymentDialog({
  initialUnpaidDocs = [],
  onPaymentSuccess,
}: RecordPaymentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unpaidDocs, setUnpaidDocs] = useState<UnpaidDocumentItem[]>(initialUnpaidDocs);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [amountRupees, setAmountRupees] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"BANK" | "CASH">("BANK");
  const [reference, setReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch or refresh unpaid documents when dialog opens
  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      Promise.resolve().then(() => {
        if (isMounted) setIsLoadingDocs(true);
      });

      getUnpaidDocumentsAction()
        .then((docs) => {
          if (isMounted) {
            setUnpaidDocs(docs);
            setIsLoadingDocs(false);
            if (docs.length > 0) {
              setSelectedDocId(docs[0].id);
              setAmountRupees((docs[0].outstandingAmount / 100).toFixed(2));
            }
          }
        })
        .catch(() => {
          if (isMounted) setIsLoadingDocs(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const selectedDoc = unpaidDocs.find((d) => d.id === selectedDocId);

  const handleDocChange = (docId: string) => {
    setSelectedDocId(docId);
    const doc = unpaidDocs.find((d) => d.id === docId);
    if (doc) {
      setAmountRupees((doc.outstandingAmount / 100).toFixed(2));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) {
      setError("Please select a source document (Invoice or Vendor Bill).");
      return;
    }

    const parsedAmount = parseFloat(amountRupees);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Payment amount must be greater than ₹0.");
      return;
    }

    const maxRupees = selectedDoc.outstandingAmount / 100;
    if (parsedAmount > maxRupees) {
      setError(
        `Payment cannot exceed remaining balance of ₹${maxRupees.toLocaleString("en-IN")}.`
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await recordCentralPaymentAction({
      orderId: selectedDoc.id,
      amount: parsedAmount,
      paymentMethod,
      reference: reference.trim() || undefined,
    });

    setIsSubmitting(false);

    if (result.success) {
      setIsOpen(false);
      setReference("");
      if (onPaymentSuccess) onPaymentSuccess();
    } else {
      setError(result.error || "Failed to record payment");
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-sm transition-colors shadow-md"
      >
        <Plus className="w-4 h-4" />
        <span>Record Payment</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Record Central Payment</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Customer payment receipts (AR) or vendor disbursements (AP).
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

              {/* Source Document Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Source Document (Invoice / Vendor Bill) *
                </label>
                {isLoadingDocs ? (
                  <div className="py-2 text-xs text-slate-400 animate-pulse">
                    Loading unpaid invoices and bills...
                  </div>
                ) : unpaidDocs.length === 0 ? (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-500 text-center">
                    No unpaid customer invoices or vendor bills found.
                  </div>
                ) : (
                  <select
                    value={selectedDocId}
                    onChange={(e) => handleDocChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 font-medium"
                    required
                  >
                    {unpaidDocs.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.orderNumber} — {doc.contactName} ({doc.type === "SO" ? "Customer" : "Vendor"}) | Outstanding: ₹{(doc.outstandingAmount / 100).toLocaleString("en-IN")}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Document Overview Metadata */}
              {selectedDoc && (
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Document Type</span>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
                        selectedDoc.type === "SO"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                          : "bg-rose-950 text-rose-400 border border-rose-900"
                      }`}
                    >
                      {selectedDoc.type === "SO" ? "CUSTOMER INVOICE (INBOUND)" : "VENDOR BILL (OUTBOUND)"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Party Name</span>
                    <span className="font-semibold text-slate-200">{selectedDoc.contactName}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-800">
                    <span className="text-slate-400 font-medium">Remaining Outstanding</span>
                    <span className="font-mono font-extrabold text-amber-400 text-sm">
                      ₹{(selectedDoc.outstandingAmount / 100).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              )}

              {/* Payment Method Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Payment Method *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("BANK")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      paymentMethod === "BANK"
                        ? "bg-purple-950/80 border-purple-500/50 text-purple-300 shadow-md"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Bank Transfer (NEFT/RTGS)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CASH")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      paymentMethod === "CASH"
                        ? "bg-purple-950/80 border-purple-500/50 text-purple-300 shadow-md"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Cash Payment
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Payment Amount (₹) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amountRupees}
                  onChange={(e) => setAmountRupees(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 font-mono font-bold focus:outline-none focus:border-amber-500/50"
                  required
                />
              </div>

              {/* Reference */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Payment Reference / Transaction UTR
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR-123456789"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Footer */}
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
                  disabled={isSubmitting || unpaidDocs.length === 0}
                  className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <span>Post Payment</span>
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
