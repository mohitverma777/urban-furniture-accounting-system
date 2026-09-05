import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { BarChart3, FileSpreadsheet, ShieldAlert, ArrowRight, Receipt, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Reports"
        description="Real-time Balance Sheet, Profit & Loss (P&L), GST Summary, and AI-powered Cash Flow Forecast reports."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link
          href="/reports/cash-flow-forecast"
          className="group p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border border-amber-500/30 space-y-4 hover:border-amber-400 hover:bg-slate-900/90 transition-all shadow-xl flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="w-10 h-10 rounded-xl bg-amber-950 text-amber-400 border border-amber-800 flex items-center justify-center font-bold shadow-inner">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
              AI Cash Flow Forecast
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Linear regression modeling on General Ledger cash postings with 95% confidence bands & 3-month predictive liquidity insights.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-800">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800">
              Predictive AI
            </span>
            <span className="text-xs font-bold text-amber-400">Launch Forecast →</span>
          </div>
        </Link>

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

        <Link
          href="/reports/gst"
          className="group p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 hover:border-orange-500/50 hover:bg-slate-900/90 transition-all shadow-md flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="w-10 h-10 rounded-xl bg-orange-950 text-orange-400 border border-orange-900 flex items-center justify-center font-bold">
                <Receipt className="w-5 h-5" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-orange-400 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-orange-400 transition-colors">
              GST Tax Summary
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              CGST, SGST &amp; IGST breakdown per month and rate slab. Net GST payable vs Input Tax Credit.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-800">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-950/60 text-orange-300 border border-orange-900">
              GST Compliance
            </span>
            <span className="text-xs font-bold text-orange-400">View Report →</span>
          </div>
        </Link>
      </div>
    </div>
  );
}

