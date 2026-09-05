"use client";

import React, { useState, useEffect } from "react";
import { Scale, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import type { Account } from "@/db/schema/accounts";
import type { GeneralLedgerReport } from "@/services/accounting/query";
import { getGeneralLedgerAction } from "@/actions/accounting";
import { EmptyState } from "@/components/common/empty-state";

export interface GeneralLedgerViewProps {
  accountsList: Account[];
  initialAccountId?: string;
}

export function GeneralLedgerView({ accountsList, initialAccountId }: GeneralLedgerViewProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    initialAccountId || (accountsList.length > 0 ? accountsList[0].id : "")
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [report, setReport] = useState<GeneralLedgerReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!selectedAccountId) {
      return;
    }

    Promise.resolve().then(() => {
      if (isMounted) setIsLoading(true);
    });

    getGeneralLedgerAction({
      accountId: selectedAccountId,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })
      .then((data) => {
        if (isMounted) {
          setReport(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setReport(null);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedAccountId, startDate, endDate]);

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
        {/* Account Selector */}
        <div className="flex-1 min-w-[280px]">
          <label className="text-xs font-semibold text-slate-400 block mb-1">
            Select Account
          </label>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 transition-colors font-medium"
          >
            {accountsList.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.code} — {acc.name} ({acc.type})
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Controls */}
        <div className="flex items-center gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Loading / Report View */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-400 animate-pulse">
          Loading General Ledger transactions...
        </div>
      ) : !report ? (
        <EmptyState
          icon={Scale}
          title="Select an Account"
          description="Choose an account from the Chart of Accounts to view its General Ledger postings."
        />
      ) : (
        <>
          {/* Metrics Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* Opening Balance */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md">
              <span className="text-xs text-slate-400 font-medium block">Opening Balance</span>
              <span className="text-lg font-bold font-mono text-white mt-1 block">
                ₹{(report.openingBalance / 100).toLocaleString("en-IN")}
              </span>
            </div>

            {/* Period Debits */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md">
              <span className="text-xs text-slate-400 font-medium block flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> Period Debits
              </span>
              <span className="text-lg font-bold font-mono text-emerald-400 mt-1 block">
                ₹{(report.periodDebit / 100).toLocaleString("en-IN")}
              </span>
            </div>

            {/* Period Credits */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md">
              <span className="text-xs text-slate-400 font-medium block flex items-center gap-1">
                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" /> Period Credits
              </span>
              <span className="text-lg font-bold font-mono text-emerald-400 mt-1 block">
                ₹{(report.periodCredit / 100).toLocaleString("en-IN")}
              </span>
            </div>

            {/* Closing Balance */}
            <div className="bg-slate-900 border border-amber-500/30 bg-amber-500/5 p-4 rounded-2xl shadow-md">
              <span className="text-xs text-amber-400 font-semibold block">Closing Balance</span>
              <span className="text-lg font-extrabold font-mono text-amber-400 mt-1 block">
                ₹{(report.closingBalance / 100).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Ledger Transactions Table */}
          {report.transactions.length === 0 ? (
            <EmptyState
              icon={Scale}
              title="No Ledger Transactions"
              description={`No postings recorded for '${report.account.code} - ${report.account.name}' in the selected date period.`}
            />
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/90 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-4">Date</th>
                      <th className="p-4">Journal</th>
                      <th className="p-4">Reference</th>
                      <th className="p-4">Description</th>
                      <th className="p-4 text-right">Debit (Dr)</th>
                      <th className="p-4 text-right">Credit (Cr)</th>
                      <th className="p-4 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {/* Opening Balance Row */}
                    <tr className="bg-slate-950/40 text-slate-400 italic">
                      <td className="p-4 font-mono text-xs">—</td>
                      <td className="p-4">—</td>
                      <td className="p-4 font-mono font-semibold text-slate-400">OPENING BALANCE</td>
                      <td className="p-4">Pre-period balance</td>
                      <td className="p-4 text-right">—</td>
                      <td className="p-4 text-right">—</td>
                      <td className="p-4 text-right font-mono font-bold text-amber-400 not-italic">
                        ₹{(report.openingBalance / 100).toLocaleString("en-IN")}
                      </td>
                    </tr>

                    {/* Transaction Rows */}
                    {report.transactions.map((tx) => (
                      <tr key={tx.itemId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-mono text-xs font-semibold text-slate-300">
                          {tx.date.toISOString().split("T")[0]}
                        </td>
                        <td className="p-4">
                          <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                            {tx.journalName}
                          </span>
                        </td>
                        <td className="p-4 font-mono font-bold text-amber-400">
                          {tx.reference || "—"}
                        </td>
                        <td className="p-4 text-slate-200">{tx.description || "—"}</td>
                        <td className="p-4 text-right font-mono font-bold">
                          {tx.debit > 0 ? (
                            <span className="text-emerald-400">
                              ₹{(tx.debit / 100).toLocaleString("en-IN")}
                            </span>
                          ) : (
                            <span className="text-slate-600">₹0</span>
                          )}
                        </td>
                        <td className="p-4 text-right font-mono font-bold">
                          {tx.credit > 0 ? (
                            <span className="text-emerald-400">
                              ₹{(tx.credit / 100).toLocaleString("en-IN")}
                            </span>
                          ) : (
                            <span className="text-slate-600">₹0</span>
                          )}
                        </td>
                        <td className="p-4 text-right font-mono font-extrabold text-amber-400">
                          ₹{(tx.runningBalance / 100).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
