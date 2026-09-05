"use client";

import React, { useState } from "react";
import { X, CreditCard } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { recordCustomerPaymentAction } from "@/actions/sales";

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  outstandingAmount: number; // in Paise
  onSuccess?: () => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  outstandingAmount,
  onSuccess,
}: PaymentModalProps) {
  const { toast } = useToast();
  const maxAmountInr = outstandingAmount / 100;

  const [amount, setAmount] = useState<number>(maxAmountInr);
  const [paymentMethod, setPaymentMethod] = useState<"BANK" | "CASH">("BANK");
  const [reference, setReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (amount <= 0) {
      toast({ title: "Invalid Amount", description: "Payment amount must be greater than 0.", variant: "error" });
      return;
    }

    if (amount > maxAmountInr) {
      toast({
        title: "Overpayment Error",
        description: `Payment amount (₹${amount}) cannot exceed outstanding invoice balance (₹${maxAmountInr}).`,
        variant: "error",
      });
      return;
    }

    setIsSubmitting(true);
    const result = await recordCustomerPaymentAction({
      orderId,
      amount,
      paymentMethod,
      reference: reference.trim() || undefined,
    });
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: "Payment Recorded",
        description: `Customer payment of ₹${amount.toLocaleString("en-IN")} recorded for ${orderNumber}.`,
        variant: "success",
      });
      onClose();
      onSuccess?.();
    } else {
      toast({
        title: "Payment Failed",
        description: result.error,
        variant: "error",
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in-0">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-900">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Register Payment</h3>
              <p className="text-xs text-slate-400 font-mono">Invoice: {orderNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex justify-between items-center">
            <span className="text-slate-400">Outstanding Balance:</span>
            <span className="font-mono font-bold text-amber-400 text-sm">
              ₹{maxAmountInr.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">
              Payment Amount (₹ INR) <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={maxAmountInr}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm font-mono text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as "BANK" | "CASH")}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
            >
              <option value="BANK">BANK (Transfer / Cheque / Card / UPI)</option>
              <option value="CASH">CASH (Physical Cash)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Reference / UTR / Cheque #</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. UTR-987654321"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-colors shadow-lg shadow-emerald-950/40 disabled:opacity-50"
            >
              {isSubmitting ? "Posting Payment..." : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
