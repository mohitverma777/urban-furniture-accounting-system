"use client";

import React, { useState } from "react";
import { X, Plus, Trash2, ShieldAlert, CheckCircle2, FileSpreadsheet, ArrowLeft } from "lucide-react";
import type { Account } from "@/db/schema/accounts";
import type { Contact } from "@/db/schema/contacts";
import type { JournalSummaryItem } from "@/services/accounting/query";
import { useToast } from "@/components/ui/toast";
import { createManualJournalEntryAction } from "@/actions/accounting";

export interface JournalLineFormItem {
  id: string;
  accountId: string;
  partnerId: string;
  debit: number;
  credit: number;
}

export interface JournalEntryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  journalsList: JournalSummaryItem[];
  accountsList: Account[];
  contactsList: Contact[];
  onSuccess?: () => void;
}

export function JournalEntryFormModal({
  isOpen,
  onClose,
  journalsList,
  accountsList,
  contactsList,
  onSuccess,
}: JournalEntryFormModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Top header fields
  const [date, setDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [journalId, setJournalId] = useState<string>(
    journalsList[0]?.id || ""
  );
  const [partnerId, setPartnerId] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  // Dynamic lines
  const [lines, setLines] = useState<JournalLineFormItem[]>([
    {
      id: crypto.randomUUID(),
      accountId: accountsList[0]?.id || "",
      partnerId: "",
      debit: 0,
      credit: 0,
    },
    {
      id: crypto.randomUUID(),
      accountId: accountsList[1]?.id || accountsList[0]?.id || "",
      partnerId: "",
      debit: 0,
      credit: 0,
    },
  ]);

  if (!isOpen) return null;

  // Calculate debits and credits totals in Rupees
  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const imbalanceDiff = Math.abs(totalDebit - totalCredit);
  const isBalanced = totalDebit > 0 && totalCredit > 0 && Math.abs(totalDebit - totalCredit) < 0.001;

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        accountId: accountsList[0]?.id || "",
        partnerId: partnerId,
        debit: 0,
        credit: 0,
      },
    ]);
  };

  const handleRemoveLine = (id: string) => {
    if (lines.length <= 2) {
      toast({
        title: "Minimum 2 Lines Required",
        description: "A double-entry journal voucher requires at least one Debit and one Credit line.",
        variant: "error",
      });
      return;
    }
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const handleLineChange = (
    id: string,
    field: keyof JournalLineFormItem,
    value: string | number
  ) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;

        const updated = { ...line, [field]: value };
        // Clear opposite field when entering amount if desired
        if (field === "debit" && Number(value) > 0) {
          updated.credit = 0;
        } else if (field === "credit" && Number(value) > 0) {
          updated.debit = 0;
        }
        return updated;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!journalId) {
      toast({
        title: "Validation Error",
        description: "Please select an Accounting Journal.",
        variant: "error",
      });
      return;
    }

    if (!isBalanced) {
      toast({
        title: "Blocking Error: Unbalanced Entry",
        description: `Total Debits (₹${totalDebit.toLocaleString(
          "en-IN"
        )}) must equal Total Credits (₹${totalCredit.toLocaleString(
          "en-IN"
        )}). Imbalance difference: ₹${imbalanceDiff.toLocaleString("en-IN")}.`,
        variant: "error",
      });
      return;
    }

    // Verify all lines have selected account
    const invalidLine = lines.find((l) => !l.accountId);
    if (invalidLine) {
      toast({
        title: "Validation Error",
        description: "All journal lines must have a valid Account selected from Chart of Accounts.",
        variant: "error",
      });
      return;
    }

    setIsSubmitting(true);
    const selectedPartner = contactsList.find((c) => c.id === partnerId);
    const partnerNameStr = selectedPartner ? ` (Partner: ${selectedPartner.name})` : "";
    const finalDesc = (description.trim() || "Manual Journal Entry") + partnerNameStr;

    const result = await createManualJournalEntryAction({
      journalId,
      date,
      reference: reference.trim() || undefined,
      description: finalDesc,
      partnerId: partnerId || undefined,
      lines: lines.map((l) => ({
        accountId: l.accountId,
        partnerId: l.partnerId || partnerId || undefined,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
      })),
    });

    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: "Journal Entry Posted",
        description: `Entry ${reference || result.entryId?.substring(0, 8)} posted successfully to General Ledger.`,
        variant: "success",
      });
      onClose();
      onSuccess?.();
    } else {
      toast({
        title: "Posting Failed",
        description: result.error,
        variant: "error",
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-0">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar matching Excalidraw design */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="p-2 rounded-xl bg-amber-950 text-amber-400 border border-amber-800">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>New Journal Entry</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Manual Voucher
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Post balanced double-entry accounting transactions to General Ledger.
              </p>
            </div>
          </div>

          {/* Action Buttons: Post, Cancel, Back */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !isBalanced}
              className={`px-5 py-2 text-xs font-bold rounded-xl transition-all shadow-lg flex items-center gap-1.5 ${
                isBalanced
                  ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950/40 cursor-pointer"
                  : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? "Posting..." : "Post"}</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Header Controls Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            {/* Accounting Date */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Accounting Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
                required
              />
            </div>

            {/* Journal Selection (Many-to-One) */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Journal <span className="text-rose-400">*</span>
              </label>
              <select
                value={journalId}
                onChange={(e) => setJournalId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
                required
              >
                {journalsList.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.name} ({j.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Partner / Contact Master Selection (Many-to-One) */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Partner / Contact (Master)
              </label>
              <select
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
              >
                <option value="">-- Optional Partner --</option>
                {contactsList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Reference Number */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Number / Reference
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. Bill/2026/0001, Inv/2026/001"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2 lg:col-span-4 space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Entry Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Monthly showroom rental payment or asset purchase voucher"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
          </div>

          {/* Dynamic Lines Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Journal Lines (Double-Entry Balance)
              </h3>
              <button
                type="button"
                onClick={handleAddLine}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold border border-slate-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add a Line</span>
              </button>
            </div>

            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/60 shadow-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3 w-[35%]">Account (Chart of Accounts)</th>
                    <th className="p-3 w-[25%]">Partner (Contact Master)</th>
                    <th className="p-3 text-right w-[18%]">Debit (₹)</th>
                    <th className="p-3 text-right w-[18%]">Credit (₹)</th>
                    <th className="p-3 text-center w-[4%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {lines.map((line) => (
                    <tr key={line.id} className="hover:bg-slate-900/60 transition-colors">
                      {/* Account Dropdown */}
                      <td className="p-2.5">
                        <select
                          value={line.accountId}
                          onChange={(e) => handleLineChange(line.id, "accountId", e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                        >
                          {accountsList.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.code} - {acc.name} ({acc.type})
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Line Partner Selection */}
                      <td className="p-2.5">
                        <select
                          value={line.partnerId}
                          onChange={(e) => handleLineChange(line.id, "partnerId", e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                        >
                          <option value="">-- Default Partner --</option>
                          {contactsList.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Debit Input */}
                      <td className="p-2.5">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.debit || ""}
                          onChange={(e) =>
                            handleLineChange(line.id, "debit", parseFloat(e.target.value) || 0)
                          }
                          placeholder="0.00"
                          className="w-full text-right bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-emerald-400 font-bold focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
                        />
                      </td>

                      {/* Credit Input */}
                      <td className="p-2.5">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.credit || ""}
                          onChange={(e) =>
                            handleLineChange(line.id, "credit", parseFloat(e.target.value) || 0)
                          }
                          placeholder="0.00"
                          className="w-full text-right bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-emerald-400 font-bold focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
                        />
                      </td>

                      {/* Delete Action */}
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(line.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Remove line"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals & Blocking Warning */}
          <div className="space-y-3">
            {/* Totals Summary */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-slate-400 uppercase text-[10px]">Total Debits: </span>
                  <span className="font-bold text-emerald-400 text-sm">
                    ₹{totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px]">Total Credits: </span>
                  <span className="font-bold text-emerald-400 text-sm">
                    ₹{totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 uppercase text-[10px]">Difference: </span>
                <span
                  className={`font-bold text-sm ${
                    isBalanced ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  ₹{imbalanceDiff.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* BLOCKING WARNING if debit and credit don't match */}
            {!isBalanced && (
              <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-semibold flex items-center gap-3 animate-in fade-in-0">
                <ShieldAlert className="w-5 h-5 shrink-0 text-rose-400 animate-bounce" />
                <div className="flex-1">
                  <span className="font-extrabold uppercase tracking-wide block text-rose-200">
                    Blocking Warning: Unbalanced Entry
                  </span>
                  <span>
                    Total Debits (₹{totalDebit.toLocaleString("en-IN")}) and Total Credits (₹
                    {totalCredit.toLocaleString("en-IN")}) do not match! Imbalance difference: ₹
                    {imbalanceDiff.toLocaleString("en-IN")}. The <strong>Post</strong> button is blocked until the entry is balanced.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Field Explanation Box matching Excalidraw specifications */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1.5">
            <div className="font-bold text-amber-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <span>Field Explanation</span>
            </div>
            <p className="text-slate-300">
              <strong className="text-slate-100">Account:</strong> Selection From Chart of Accounts (Many to one dropdown)
            </p>
            <p className="text-slate-300">
              <strong className="text-slate-100">Partner:</strong> Selection from Contact Master (Many to one dropdown)
            </p>
            <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800/80 mt-1">
              * The Transaction will be connected and posted directly through the Chart of Accounts to the General Ledger.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
