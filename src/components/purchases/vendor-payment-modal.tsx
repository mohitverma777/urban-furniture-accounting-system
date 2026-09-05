"use client";

import React, { useState } from "react";
import { X, CreditCard, Loader2 } from "lucide-react";
import { recordVendorPaymentAction } from "@/actions/purchases";

export interface VendorPaymentModalProps {
  orderId: string;
  orderNumber: string;
  outstandingAmountPaise: number; // in Paise
  isOpen: boolean;
  onClose: () => void;
}

export function VendorPaymentModal({
  orderId,
  orderNumber,
  outstandingAmountPaise,
  isOpen,
  onClose,
}: VendorPaymentModalProps) {
  const defaultAmountRupees = (outstandingAmountPaise / 100).toFixed(2);
  const [amountRupees, setAmountRupees] = useState(defaultAmountRupees);
  const [paymentMethod, setPaymentMethod] = useState<"BANK" | "CASH">("BANK");
  const [reference, setReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amountRupees);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid payment amount greater than ₹0.");
      return;
    }

    const maxRupees = outstandingAmountPaise / 100;
    if (parsedAmount > maxRupees) {
      setError(`Payment cannot exceed remaining balance of ₹${maxRupees.toLocaleString("en-IN")}.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await recordVendorPaymentAction({
      orderId,
      amount: parsedAmount,
      paymentMethod,
      reference: reference.trim() || undefined,
    });

    setIsSubmitting(false);

    if (result.success) {
      onClose();
    } else {
      setError(result.error || "Failed to record vendor payment");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Record Vendor Payment</h3>
              <p className="text-xs text-slate-400 mt-0.5">Bill: {orderNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
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

          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 flex justify-between items-center text-xs">
            <span className="text-slate-400 font-medium">Outstanding Balance</span>
            <span className="font-mono font-extrabold text-amber-400 text-sm">
              ₹{(outstandingAmountPaise / 100).toLocaleString("en-IN")}
            </span>
          </div>

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
                Cash Disbursement
              </button>
            </div>
          </div>

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

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">
              Payment Reference / UTR Number
            </label>
            <input
              type="text"
              placeholder="e.g. UTR-987654321"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow-md disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Confirm Payment</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
