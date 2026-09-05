import { PageHeader } from "@/components/common/page-header";
import { db } from "@/db";
import { accounts, journalEntries, journalItems } from "@/db/schema";
import { eq, sum } from "drizzle-orm";
import { EmptyState } from "@/components/common/empty-state";
import { BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AccountingPage() {
  const accountList = await db.select().from(accounts);
  const rawEntries = await db.select().from(journalEntries);

  const entriesWithTotals = await Promise.all(
    rawEntries.map(async (entry) => {
      const [debitSum] = await db
        .select({ total: sum(journalItems.debit) })
        .from(journalItems)
        .where(eq(journalItems.entryId, entry.id));

      const [creditSum] = await db
        .select({ total: sum(journalItems.credit) })
        .from(journalItems)
        .where(eq(journalItems.entryId, entry.id));

      return {
        ...entry,
        totalDebit: (debitSum?.total ?? 0) as number,
        totalCredit: (creditSum?.total ?? 0) as number,
      };
    })
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Accounting & Chart of Accounts"
        description="Double-entry Chart of Accounts and Journal Entry postings."
      />

      {/* Chart of Accounts Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-400" />
          <span>Chart of Accounts</span>
        </h2>

        {accountList.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No Accounts Configured"
            description="Run database seed script to populate default Chart of Accounts."
          />
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">Code</th>
                  <th className="p-4">Account Name</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {accountList.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-mono font-bold text-amber-400">{acc.code}</td>
                    <td className="p-4 font-semibold text-white">{acc.name}</td>
                    <td className="p-4">
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                        {acc.type}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${
                          acc.isActive
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                            : "bg-rose-950 text-rose-400 border border-rose-900"
                        }`}
                      >
                        {acc.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Journal Entries Log */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">Journal Postings Log</h2>

        {entriesWithTotals.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No Journal Entries Posted"
            description="Post customer invoices or vendor bills to see double-entry journal logs."
          />
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">Entry ID</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Description / Reference</th>
                  <th className="p-4 text-right">Debit Total</th>
                  <th className="p-4 text-right">Credit Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {entriesWithTotals.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-mono font-semibold text-blue-400">
                      {entry.id.substring(0, 8)}...
                    </td>
                    <td className="p-4 font-mono text-xs">
                      {entry.date instanceof Date
                        ? entry.date.toISOString().split("T")[0]
                        : String(entry.date)}
                    </td>
                    <td className="p-4 text-slate-200">
                      {entry.description || entry.reference || "—"}
                    </td>
                    <td className="p-4 font-mono font-bold text-right text-emerald-400">
                      ₹{(entry.totalDebit / 100).toLocaleString("en-IN")}
                    </td>
                    <td className="p-4 font-mono font-bold text-right text-emerald-400">
                      ₹{(entry.totalCredit / 100).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
