import { PageHeader } from "@/components/common/page-header";
import { BarChart3, FileSpreadsheet, ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Reports"
        description="Real-time Balance Sheet, Profit & Loss (P&L), and Budget Variance reports derived strictly from database transactions."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 hover:border-slate-700 transition-colors shadow-md">
          <div className="w-10 h-10 rounded-xl bg-blue-950 text-blue-400 border border-blue-900 flex items-center justify-center font-bold">
            <BarChart3 className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">Profit & Loss Statement</h3>
          <p className="text-xs text-slate-400">
            Calculated dynamically from Revenue (4000) minus Expenses (5000, 5100).
          </p>
          <div className="pt-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
              Transaction Derived
            </span>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 hover:border-slate-700 transition-colors shadow-md">
          <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-900 flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">Balance Sheet</h3>
          <p className="text-xs text-slate-400">
            Assets (Cash, Bank, Debtors, Inventory) vs Liabilities (Creditors, Tax) & Capital.
          </p>
          <div className="pt-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
              Balanced Equation
            </span>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 hover:border-slate-700 transition-colors shadow-md">
          <div className="w-10 h-10 rounded-xl bg-purple-950 text-purple-400 border border-purple-900 flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">Budget Report</h3>
          <p className="text-xs text-slate-400">
            Planned vs Actual performance per Analytic Cost Center.
          </p>
          <div className="pt-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
              Cost Center Analysis
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
