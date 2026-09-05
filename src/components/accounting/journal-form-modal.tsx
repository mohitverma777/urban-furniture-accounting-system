"use client";

import React, { useState } from "react";
import { X, BookPlus, CheckCircle2 } from "lucide-react";
import type { Account, JournalType } from "@/db/schema/accounts";
import { useToast } from "@/components/ui/toast";
import { createJournalAction } from "@/actions/accounting";

export interface JournalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountsList: Account[];
  onSuccess?: () => void;
}

export function JournalFormModal({
  isOpen,
  onClose,
  accountsList,
  onSuccess,
}: JournalFormModalProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [type, setType] = useState<JournalType>("SALES");
  const [defaultAccountId, setDefaultAccountId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a Journal Name.",
        variant: "error",
      });
      return;
    }

    setIsSubmitting(true);
    const result = await createJournalAction({
      name: name.trim(),
      type,
      defaultAccountId: defaultAccountId || null,
    });
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: "Journal Created",
        description: `Journal '${name}' created successfully.`,
        variant: "success",
      });
      setName("");
      setType("SALES");
      setDefaultAccountId("");
      onClose();
      onSuccess?.();
    } else {
      toast({
        title: "Failed to Create Journal",
        description: result.error,
        variant: "error",
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-0">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-950 text-amber-400 border border-amber-800">
              <BookPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">New Journal</h2>
              <p className="text-xs text-slate-400">Add an accounting journal master configuration.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body matching Excalidraw specifications */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Journal Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">
              Journal Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sales Journal, HDFC Bank Journal, General Journal"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
              required
            />
          </div>

          {/* Journal Type Selection */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">
              Journal Type <span className="text-rose-400">*</span>
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as JournalType)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
            >
              <option value="SALES">Sales (Customer Invoices & Credit Notes)</option>
              <option value="PURCHASE">Purchase (Vendor Bills & Disbursements)</option>
              <option value="BANK">Bank (Bank Settlements & Deposits)</option>
              <option value="CASH">Cash (Petty Cash Transactions)</option>
            </select>
          </div>

          {/* Default Account (Many-to-One Selection from Chart of Accounts) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">
              Default Account <span className="text-slate-500 font-normal">(Chart of Accounts Many to One)</span>
            </label>
            <select
              value={defaultAccountId}
              onChange={(e) => setDefaultAccountId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
            >
              <option value="">-- Select Default Account --</option>
              {accountsList.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} - {acc.name} ({acc.type})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-amber-400/90 italic pt-0.5">
              * Selection from Chart of Accounts (Many to one)
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors shadow-lg shadow-amber-950/40 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? "Creating..." : "Create Journal"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
