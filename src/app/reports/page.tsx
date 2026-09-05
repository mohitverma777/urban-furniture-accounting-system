import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { BarChart3, FileSpreadsheet, ShieldAlert, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Reports"
        description="Real-time Balance Sheet, Profit & Loss (P&L), and Budget Variance reports derived strictly from database transactions."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/reports/profit-loss"
          className="group p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 hover:border-amber-500/50 hover:bg-slate-900/90 transition-all shadow-md flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="w-10 h-10 rounded-xl bg-amber-950 text-amber-400 border border-amber-900 flex items-center justify-center font-bold">
                <BarChart3 className="w-5 h-5" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
              Profit & Loss Statement
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Calculated dynamically from Sales Income (4000) minus Purchase & Operating Expenses (5000, 5100).
            </p>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-800">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
              Transaction Derived
            </span>
            <span className="text-xs font-bold text-amber-400">View Report →</span>
          </div>
        </Link>

        <Link
          href="/reports/balance-sheet"
          className="group p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 hover:border-emerald-500/50 hover:bg-slate-900/90 transition-all shadow-md flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-900 flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
              Balance Sheet
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Assets (Cash, Bank, Debtors, Inventory) vs Liabilities (Creditors, Tax) & Capital.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-800">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
              Balanced Equation
            </span>
            <span className="text-xs font-bold text-emerald-400">View Report →</span>
          </div>
        </Link>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 hover:border-slate-700 transition-colors shadow-md flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950 text-purple-400 border border-purple-900 flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Budget Report</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Planned vs Actual performance per Analytic Cost Center.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-800">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
              Cost Center Analysis
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
