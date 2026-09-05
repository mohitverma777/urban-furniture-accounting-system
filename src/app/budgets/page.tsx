import { PageHeader } from "@/components/common/page-header";
import { db } from "@/db";
import { budgets, analyticAccounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { EmptyState } from "@/components/common/empty-state";
import { PieChart, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  const budgetList = await db
    .select({
      id: budgets.id,
      name: budgets.name,
      plannedAmount: budgets.plannedAmount,
      startDate: budgets.startDate,
      endDate: budgets.endDate,
      analyticName: analyticAccounts.name,
    })
    .from(budgets)
    .leftJoin(analyticAccounts, eq(budgets.analyticAccountId, analyticAccounts.id));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budgets & Cost Centers"
        description="Analytic accounts, budget tracking, and variance analysis."
        actions={
          <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-sm transition-colors shadow-md">
            <Plus className="w-4 h-4" />
            <span>Create Budget</span>
          </button>
        }
      />

      {budgetList.length === 0 ? (
        <EmptyState
          icon={PieChart}
          title="No Budgets Defined"
          description="Define budget targets for analytic cost centers (Manufacturing, Showroom, Delivery, Marketing)."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {budgetList.map((bg) => {
            const startDateStr =
              bg.startDate instanceof Date
                ? bg.startDate.toISOString().split("T")[0]
                : String(bg.startDate);
            const endDateStr =
              bg.endDate instanceof Date
                ? bg.endDate.toISOString().split("T")[0]
                : String(bg.endDate);

            return (
              <div
                key={bg.id}
                className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-md"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-white text-base">{bg.name}</h3>
                  <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-purple-950 text-purple-300 border border-purple-900">
                    {bg.analyticName || "General"}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-slate-400 block">Planned Target</span>
                    <span className="font-mono font-bold text-white text-lg">
                      ₹{(bg.plannedAmount / 100).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-800/80 text-xs">
                  <span className="text-slate-400">
                    {startDateStr} — {endDateStr}
                  </span>
                  <span className="font-mono font-semibold text-emerald-400">
                    Target Set
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
