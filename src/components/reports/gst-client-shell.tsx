"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import type { GSTSummaryReport, GSTRateSlab, GSTMonthlyRow } from "@/services/reports";
import {
  Receipt,
  TrendingDown,
  TrendingUp,
  Calendar,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Download,
  AlertCircle,
  CheckCircle2,
  Info,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
} from "lucide-react";
import { AiExplainButton } from "@/components/ai/ai-explainer-dialog";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

function formatCurrencyCompact(paise: number): string {
  const rupees = paise / 100;
  if (Math.abs(rupees) >= 100000) {
    return `₹${(rupees / 100000).toFixed(2)}L`;
  }
  if (Math.abs(rupees) >= 1000) {
    return `₹${(rupees / 1000).toFixed(1)}K`;
  }
  return `₹${rupees.toFixed(0)}`;
}

const SLAB_COLORS: Record<number, { bg: string; text: string; badge: string; border: string }> = {
  0:  { bg: "bg-slate-900", text: "text-slate-400", badge: "bg-slate-800 text-slate-300", border: "border-slate-700" },
  5:  { bg: "bg-blue-950/50", text: "text-blue-400", badge: "bg-blue-950 text-blue-300 border-blue-800", border: "border-blue-800/50" },
  12: { bg: "bg-violet-950/50", text: "text-violet-400", badge: "bg-violet-950 text-violet-300 border-violet-800", border: "border-violet-800/50" },
  18: { bg: "bg-amber-950/50", text: "text-amber-400", badge: "bg-amber-950 text-amber-300 border-amber-800", border: "border-amber-800/50" },
  28: { bg: "bg-rose-950/50", text: "text-rose-400", badge: "bg-rose-950 text-rose-300 border-rose-800", border: "border-rose-800/50" },
};

function getSlabColor(rate: number) {
  return SLAB_COLORS[rate] ?? SLAB_COLORS[0];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "amber" | "emerald" | "rose" | "blue" | "violet";
  trend?: "up" | "down" | "neutral";
}) {
  const colorMap = {
    amber:   { icon: "text-amber-400",   bg: "bg-amber-950",   border: "border-amber-800/50" },
    emerald: { icon: "text-emerald-400", bg: "bg-emerald-950", border: "border-emerald-800/50" },
    rose:    { icon: "text-rose-400",    bg: "bg-rose-950",    border: "border-rose-800/50" },
    blue:    { icon: "text-blue-400",    bg: "bg-blue-950",    border: "border-blue-800/50" },
    violet:  { icon: "text-violet-400",  bg: "bg-violet-950",  border: "border-violet-800/50" },
  };
  const c = colorMap[color];
  return (
    <div className={`p-5 rounded-2xl bg-slate-900 border ${c.border} space-y-3`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
        <div className={`w-8 h-8 rounded-xl ${c.bg} ${c.icon} flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <div className={`text-2xl font-bold ${c.icon} font-mono`}>{value}</div>
        {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
      </div>
      {trend && trend !== "neutral" && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trend === "up" ? "text-emerald-400" : "text-rose-400"}`}>
          {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          <span>{trend === "up" ? "Credit available" : "Liability due"}</span>
        </div>
      )}
    </div>
  );
}

function SlabRow({ slab, type }: { slab: GSTRateSlab; type: "output" | "input" }) {
  const c = getSlabColor(slab.rate);
  if (slab.taxableValue === 0 && slab.totalTax === 0) return null;
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${c.bg} border ${c.border} text-xs`}>
      <span className={`font-bold px-2 py-0.5 rounded-md border text-[10px] ${c.badge}`}>
        {slab.rate}% GST
      </span>
      <div className="flex-1 grid grid-cols-3 gap-2 text-slate-300">
        <div>
          <span className="text-slate-500">Taxable</span>
          <div className="font-semibold font-mono">{formatCurrencyCompact(slab.taxableValue)}</div>
        </div>
        <div>
          <span className="text-slate-500">CGST {slab.cgstRate}%</span>
          <div className="font-semibold font-mono">{formatCurrencyCompact(slab.cgstAmount)}</div>
        </div>
        <div>
          <span className="text-slate-500">SGST {slab.sgstRate}%</span>
          <div className="font-semibold font-mono">{formatCurrencyCompact(slab.sgstAmount)}</div>
        </div>
      </div>
      <div className={`text-right font-bold font-mono ${c.text}`}>
        {formatCurrencyCompact(slab.totalTax)}
      </div>
    </div>
  );
}

function MonthAccordion({ row }: { row: GSTMonthlyRow }) {
  const [open, setOpen] = useState(false);
  const isPayable = row.netGSTLiability >= 0;

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
      {/* Row header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {open ? (
            <ChevronDown className="w-4 h-4 text-amber-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500" />
          )}
          <span className="font-semibold text-white text-sm">{row.monthLabel}</span>
          {row.netGSTLiability === 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              Nil Return
            </span>
          )}
        </div>

        <div className="flex items-center gap-6 text-xs">
          <div className="text-right hidden sm:block">
            <span className="text-slate-500">Output Tax</span>
            <div className="font-mono font-bold text-amber-400">{formatCurrencyCompact(row.totalOutputTax)}</div>
          </div>
          <div className="text-right hidden sm:block">
            <span className="text-slate-500">ITC</span>
            <div className="font-mono font-bold text-emerald-400">{formatCurrencyCompact(row.totalInputTax)}</div>
          </div>
          <div className={`text-right min-w-[90px] px-3 py-1.5 rounded-xl border ${
            isPayable && row.netGSTLiability > 0
              ? "bg-rose-950/50 border-rose-800/50 text-rose-400"
              : row.netGSTLiability < 0
              ? "bg-emerald-950/50 border-emerald-800/50 text-emerald-400"
              : "bg-slate-800 border-slate-700 text-slate-400"
          }`}>
            <div className="text-[10px] font-medium">Net</div>
            <div className="font-mono font-bold text-sm">
              {row.netGSTLiability < 0 && <span className="text-[10px]">refund</span>}
              {formatCurrencyCompact(Math.abs(row.netGSTLiability))}
            </div>
          </div>
        </div>
      </button>

      {/* Accordion body */}
      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            {/* Output Tax */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Output Tax (Sales)
                </span>
                <span className="text-[10px] text-slate-500 ml-auto">
                  Taxable: {formatCurrencyCompact(row.totalSalesTaxableValue)}
                </span>
              </div>
              {row.outputSlabs.length === 0 ? (
                <div className="text-xs text-slate-500 italic px-3">No sales this month</div>
              ) : (
                row.outputSlabs.map((s) => (
                  <SlabRow key={s.rate} slab={s} type="output" />
                ))
              )}
              {row.outputSlabs.length > 0 && (
                <div className="flex justify-between px-3 pt-2 border-t border-slate-800 text-xs">
                  <span className="text-slate-400 font-semibold">Total Output Tax</span>
                  <span className="font-bold font-mono text-amber-400">{formatCurrency(row.totalOutputTax)}</span>
                </div>
              )}
            </div>

            {/* Input Tax Credit */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Input Tax Credit (Purchases)
                </span>
                <span className="text-[10px] text-slate-500 ml-auto">
                  Taxable: {formatCurrencyCompact(row.totalPurchaseTaxableValue)}
                </span>
              </div>
              {row.inputSlabs.length === 0 ? (
                <div className="text-xs text-slate-500 italic px-3">No purchases this month</div>
              ) : (
                row.inputSlabs.map((s) => (
                  <SlabRow key={s.rate} slab={s} type="input" />
                ))
              )}
              {row.inputSlabs.length > 0 && (
                <div className="flex justify-between px-3 pt-2 border-t border-slate-800 text-xs">
                  <span className="text-slate-400 font-semibold">Total ITC</span>
                  <span className="font-bold font-mono text-emerald-400">{formatCurrency(row.totalInputTax)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Net liability banner */}
          <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
            row.netGSTLiability > 0
              ? "bg-rose-950/30 border-rose-800/40"
              : row.netGSTLiability < 0
              ? "bg-emerald-950/30 border-emerald-800/40"
              : "bg-slate-800 border-slate-700"
          }`}>
            <div className="flex items-center gap-2">
              {row.netGSTLiability > 0 ? (
                <AlertCircle className="w-4 h-4 text-rose-400" />
              ) : row.netGSTLiability < 0 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Info className="w-4 h-4 text-slate-400" />
              )}
              <span className="text-sm font-semibold text-white">
                {row.netGSTLiability > 0
                  ? "Net GST Payable to Government"
                  : row.netGSTLiability < 0
                  ? "GST Refund Claimable"
                  : "No GST Liability"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-lg font-bold font-mono ${
                row.netGSTLiability > 0 ? "text-rose-400" : row.netGSTLiability < 0 ? "text-emerald-400" : "text-slate-400"
              }`}>
                {formatCurrency(Math.abs(row.netGSTLiability))}
              </span>
              <AiExplainButton
                label="Why this amount?"
                question={`Why is the net GST liability ${formatCurrency(row.netGSTLiability)} for period ${row.monthLabel}?`}
                contextType="GST_LIABILITY"
                entityData={{
                  month: row.monthLabel,
                  netLiability: row.netGSTLiability,
                  totalOutputTax: row.totalOutputTax,
                  totalInputTax: row.totalInputTax,
                }}
                variant="inline"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SlabSummaryTable({ slabs, title, color }: {
  slabs: GSTRateSlab[];
  title: string;
  color: "amber" | "emerald";
}) {
  const activeSlabs = slabs.filter(s => s.totalTax > 0 || s.taxableValue > 0);
  const totalTax = activeSlabs.reduce((sum, s) => sum + s.totalTax, 0);
  const totalTaxable = activeSlabs.reduce((sum, s) => sum + s.taxableValue, 0);
  const colorText = color === "amber" ? "text-amber-400" : "text-emerald-400";
  const colorBorder = color === "amber" ? "border-amber-800/30" : "border-emerald-800/30";

  if (activeSlabs.length === 0) {
    return (
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <h3 className={`text-sm font-bold ${colorText} mb-3`}>{title}</h3>
        <p className="text-xs text-slate-500 italic">No data for selected period</p>
      </div>
    );
  }

  return (
    <div className={`p-5 rounded-2xl bg-slate-900 border ${colorBorder} space-y-3`}>
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-bold ${colorText}`}>{title}</h3>
        <span className="text-[10px] text-slate-500">
          {activeSlabs.reduce((s, r) => s + r.transactionCount, 0)} line items
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left pb-2 text-slate-500 font-semibold">Rate</th>
              <th className="text-right pb-2 text-slate-500 font-semibold">Taxable Value</th>
              <th className="text-right pb-2 text-slate-500 font-semibold">CGST</th>
              <th className="text-right pb-2 text-slate-500 font-semibold">SGST</th>
              <th className="text-right pb-2 text-slate-500 font-semibold">Total Tax</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {activeSlabs.map((slab) => {
              const c = getSlabColor(slab.rate);
              return (
                <tr key={slab.rate} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2">
                    <span className={`font-bold px-2 py-0.5 rounded border text-[10px] ${c.badge}`}>
                      {slab.rate}%
                    </span>
                  </td>
                  <td className="py-2 text-right font-mono text-slate-300">{formatCurrency(slab.taxableValue)}</td>
                  <td className="py-2 text-right font-mono text-slate-300">{formatCurrency(slab.cgstAmount)}</td>
                  <td className="py-2 text-right font-mono text-slate-300">{formatCurrency(slab.sgstAmount)}</td>
                  <td className={`py-2 text-right font-mono font-bold ${colorText}`}>{formatCurrency(slab.totalTax)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-700">
              <td className="pt-2 text-slate-300 font-bold">Total</td>
              <td className="pt-2 text-right font-mono text-slate-300 font-bold">{formatCurrency(totalTaxable)}</td>
              <td className="pt-2 text-right font-mono text-slate-300 font-bold">
                {formatCurrency(activeSlabs.reduce((s, r) => s + r.cgstAmount, 0))}
              </td>
              <td className="pt-2 text-right font-mono text-slate-300 font-bold">
                {formatCurrency(activeSlabs.reduce((s, r) => s + r.sgstAmount, 0))}
              </td>
              <td className={`pt-2 text-right font-mono font-bold ${colorText}`}>{formatCurrency(totalTax)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Shell
// ---------------------------------------------------------------------------

interface GSTClientShellProps {
  report: GSTSummaryReport;
}

export function GSTClientShell({ report }: GSTClientShellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const currentYear = new Date().getFullYear();
  const fyOptions = [
    { value: `${currentYear - 1}-${String(currentYear).slice(2)}`, label: `FY ${currentYear - 1}–${String(currentYear).slice(2)}` },
    { value: `${currentYear}-${String(currentYear + 1).slice(2)}`, label: `FY ${currentYear}–${String(currentYear + 1).slice(2)}` },
  ];

  const [selectedFY, setSelectedFY] = useState(report.financialYear);
  const [startDate, setStartDate] = useState(report.startDate ?? "");
  const [endDate, setEndDate] = useState(report.endDate ?? "");
  const [useCustomRange, setUseCustomRange] = useState(!!(report.startDate || report.endDate));

  const applyFilter = (params: { fy?: string; start?: string; end?: string }) => {
    const p = new URLSearchParams();
    if (params.fy) p.set("fy", params.fy);
    if (params.start) p.set("startDate", params.start);
    if (params.end) p.set("endDate", params.end);
    startTransition(() => router.push(`/reports/gst?${p.toString()}`));
  };

  const handleFYChange = (fy: string) => {
    setSelectedFY(fy);
    setUseCustomRange(false);
    applyFilter({ fy });
  };

  const handleCustomApply = () => {
    applyFilter({ start: startDate, end: endDate });
  };

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    setUseCustomRange(false);
    startTransition(() => router.push("/reports/gst"));
  };

  const netIsPayable = report.netGSTPayable >= 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="GST Tax Summary Report"
        description={`Indian GST Compliance — CGST, SGST & IGST breakdown. ${report.hasData ? `Financial Year ${report.financialYear}` : "No data available."}`}
      />

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-end gap-4">
        {/* FY Selector */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Financial Year</label>
          <div className="flex gap-2">
            {fyOptions.map((fy) => (
              <button
                key={fy.value}
                onClick={() => handleFYChange(fy.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  selectedFY === fy.value && !useCustomRange
                    ? "bg-amber-500 text-slate-950 border-amber-400"
                    : "bg-slate-800 text-slate-300 border-slate-700 hover:border-amber-500/50"
                }`}
              >
                {fy.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Range */}
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setUseCustomRange(true); }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500/70"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setUseCustomRange(true); }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500/70"
            />
          </div>
          {useCustomRange && (
            <button
              onClick={handleCustomApply}
              disabled={isPending}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors disabled:opacity-50"
            >
              Apply
            </button>
          )}
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-white transition-all ml-auto"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Output Tax Collected"
          value={formatCurrencyCompact(report.totalOutputTax)}
          sub={`On ${formatCurrencyCompact(report.totalSalesTurnover)} sales`}
          icon={TrendingUp}
          color="amber"
        />
        <KpiCard
          label="Input Tax Credit (ITC)"
          value={formatCurrencyCompact(report.totalInputTaxCredit)}
          sub={`On ${formatCurrencyCompact(report.totalPurchaseTurnover)} purchases`}
          icon={TrendingDown}
          color="emerald"
          trend="up"
        />
        <KpiCard
          label={report.netGSTPayable >= 0 ? "Net GST Payable" : "GST Refund Due"}
          value={formatCurrencyCompact(Math.abs(report.netGSTPayable))}
          sub={report.netGSTPayable >= 0 ? "Liability to government" : "Claimable refund"}
          icon={report.netGSTPayable >= 0 ? AlertCircle : CheckCircle2}
          color={report.netGSTPayable >= 0 ? "rose" : "emerald"}
          trend={report.netGSTPayable >= 0 ? "down" : "up"}
        />
        <KpiCard
          label="Filing Periods"
          value={String(report.monthlyRows.filter(r => r.totalOutputTax > 0 || r.totalInputTax > 0).length)}
          sub={`of ${report.monthlyRows.length} total months`}
          icon={Calendar}
          color="violet"
        />
      </div>

      {/* No data state */}
      {!report.hasData && (
        <div className="flex flex-col items-center justify-center py-20 space-y-3 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center">
            <FileSpreadsheet className="w-7 h-7 text-slate-600" />
          </div>
          <p className="text-slate-400 font-semibold">No GST Data Found</p>
          <p className="text-slate-500 text-sm text-center max-w-sm">
            No orders with taxable transactions found for the selected period. Create Sales or Purchase Orders with GST to see data here.
          </p>
        </div>
      )}

      {report.hasData && (
        <>
          {/* Slab Summary Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SlabSummaryTable
              slabs={report.outputSlabTotals}
              title="📤 Output Tax Summary (Sales)"
              color="amber"
            />
            <SlabSummaryTable
              slabs={report.inputSlabTotals}
              title="📥 Input Tax Credit Summary (Purchases)"
              color="emerald"
            />
          </div>

          {/* Net Payable Banner */}
          <div className={`p-5 rounded-2xl border flex items-center justify-between ${
            netIsPayable && report.netGSTPayable > 0
              ? "bg-rose-950/20 border-rose-800/40"
              : report.netGSTPayable < 0
              ? "bg-emerald-950/20 border-emerald-800/40"
              : "bg-slate-900 border-slate-700"
          }`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {report.netGSTPayable > 0 ? (
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                ) : report.netGSTPayable < 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Info className="w-5 h-5 text-slate-400" />
                )}
                <h3 className="text-base font-bold text-white">
                  {report.netGSTPayable > 0
                    ? "Net GST Payable to Government"
                    : report.netGSTPayable < 0
                    ? "GST Refund Claimable from Government"
                    : "Net GST Position: Neutral"}
                </h3>
              </div>
              <p className="text-xs text-slate-400 ml-7">
                Output Tax ({formatCurrency(report.totalOutputTax)}) − ITC ({formatCurrency(report.totalInputTaxCredit)})
              </p>
            </div>
            <div className={`text-3xl font-bold font-mono ${
              report.netGSTPayable > 0 ? "text-rose-400" : report.netGSTPayable < 0 ? "text-emerald-400" : "text-slate-400"
            }`}>
              {formatCurrency(Math.abs(report.netGSTPayable))}
            </div>
          </div>

          {/* Monthly Accordion */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                Month-by-Month Breakdown
              </h2>
              <span className="text-xs text-slate-500">{report.monthlyRows.length} months</span>
            </div>

            {report.monthlyRows.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-sm rounded-2xl bg-slate-900 border border-slate-800">
                No monthly data to display
              </div>
            ) : (
              <div className="space-y-2">
                {report.monthlyRows.slice().reverse().map((row) => (
                  <MonthAccordion key={row.monthKey} row={row} />
                ))}
              </div>
            )}
          </div>

          {/* GST Information Box */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-700/50 space-y-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <h3 className="text-sm font-bold text-slate-300">GST Filing Notes</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-400">
              <div className="space-y-1.5">
                <p>• <span className="text-slate-300 font-semibold">GSTR-1</span>: File by 11th of following month (outward supplies)</p>
                <p>• <span className="text-slate-300 font-semibold">GSTR-3B</span>: File by 20th of following month (net liability)</p>
                <p>• <span className="text-slate-300 font-semibold">GSTR-2B</span>: Auto-populated ITC statement from GST portal</p>
              </div>
              <div className="space-y-1.5">
                <p>• All amounts shown are <span className="text-slate-300 font-semibold">CGST + SGST</span> (intra-state transactions)</p>
                <p>• Inter-state transactions use <span className="text-slate-300 font-semibold">IGST</span> at full rate</p>
                <p>• This report is <span className="text-slate-300 font-semibold">informational only</span> — consult your CA for filing</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
