"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Building2,
  ShieldCheck,
  Calendar,
  Zap,
  Info,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import type { CashFlowForecastSummary } from "@/services/reports/cash-flow-forecast";

interface CashFlowForecastClientProps {
  initialForecast: CashFlowForecastSummary;
  accounts: Array<{ id: string; code: string; name: string }>;
}

export function CashFlowForecastClient({
  initialForecast,
  accounts,
}: CashFlowForecastClientProps) {
  const [selectedAccountId, setSelectedAccountId] = useState(
    initialForecast.account.id
  );
  const [showConfidenceBand, setShowConfidenceBand] = useState(true);
  const [forecastMonths, setForecastMonths] = useState<3 | 6>(3);

  const forecast = initialForecast;
  const isPositive = forecast.monthlyBurnGrowthRate >= 0;

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl space-y-1 text-xs font-mono">
          <p className="font-bold text-slate-200 border-b border-slate-800 pb-1 flex items-center justify-between gap-3">
            <span>{label}</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                data.isForecast
                  ? "bg-amber-950 text-amber-400 border border-amber-800"
                  : "bg-emerald-950 text-emerald-400 border border-emerald-800"
              }`}
            >
              {data.isForecast ? "3-Mo AI Forecast" : "GL Historical"}
            </span>
          </p>

          {data.historicalBalance !== undefined && (
            <p className="text-cyan-400 flex justify-between gap-4">
              <span>Historical Balance:</span>
              <span className="font-bold">
                ₹{data.historicalBalance.toLocaleString("en-IN")}
              </span>
            </p>
          )}

          {data.forecastedBalance !== undefined && (
            <p className="text-amber-400 flex justify-between gap-4">
              <span>Projected Balance:</span>
              <span className="font-bold">
                ₹{data.forecastedBalance.toLocaleString("en-IN")}
              </span>
            </p>
          )}

          {data.upperBand !== undefined && showConfidenceBand && (
            <p className="text-slate-400 flex justify-between gap-4 pt-1 border-t border-slate-800 text-[11px]">
              <span>95% Upper Bound:</span>
              <span>₹{data.upperBand.toLocaleString("en-IN")}</span>
            </p>
          )}

          {data.lowerBand !== undefined && showConfidenceBand && (
            <p className="text-slate-400 flex justify-between gap-4 text-[11px]">
              <span>95% Lower Bound:</span>
              <span>₹{data.lowerBand.toLocaleString("en-IN")}</span>
            </p>
          )}

          <div className="pt-1.5 border-t border-slate-800/80 flex justify-between text-slate-400 text-[10px]">
            <span>Monthly Inflow: ₹{data.inflow?.toLocaleString("en-IN")}</span>
            <span>Outflow: ₹{data.outflow?.toLocaleString("en-IN")}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Control Bar & Account Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-amber-400" />
          <div>
            <label className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
              Target Cash / Bank Account
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => {
                setSelectedAccountId(e.target.value);
                window.location.href = `/reports/cash-flow-forecast?accountId=${e.target.value}`;
              }}
              className="bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-sm font-medium focus:outline-none focus:border-amber-400 transition-colors cursor-pointer"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} - {acc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {/* Toggle 95% Confidence Band */}
          <button
            onClick={() => setShowConfidenceBand(!showConfidenceBand)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl font-medium border transition-colors ${
              showConfidenceBand
                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>95% Confidence Band: {showConfidenceBand ? "ON" : "OFF"}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Current Cash Position */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Current Cash Balance
            </span>
            <DollarSign className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white">
            ₹{(forecast.currentBalance / 100).toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-slate-400 font-mono">
            {forecast.account.code} • {forecast.account.name}
          </p>
        </div>

        {/* 2. Projected 3-Month Balance */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Projected 3-Mo Balance
            </span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-amber-400">
            ₹{(forecast.projected3MonthBalance / 100).toLocaleString("en-IN")}
          </p>
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                forecast.projectedNetChange >= 0
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                  : "bg-rose-950 text-rose-400 border border-rose-900"
              }`}
            >
              {forecast.projectedNetChange >= 0 ? "+" : ""}
              ₹{(forecast.projectedNetChange / 100).toLocaleString("en-IN")}
            </span>
            <span className="text-slate-400">next 90 days</span>
          </div>
        </div>

        {/* 3. Monthly Growth / Burn Rate */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Monthly Trend Slope
            </span>
            {isPositive ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <p
            className={`text-2xl font-bold font-mono ${
              isPositive ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {isPositive ? "+" : ""}₹
            {(forecast.monthlyBurnGrowthRate / 100).toLocaleString("en-IN")}/mo
          </p>
          <p className="text-xs text-slate-400">Linear regression slope m</p>
        </div>

        {/* 4. Model R² Reliability */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Model R² Fit Score
            </span>
            <Zap className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-blue-400">
            {(forecast.rSquared * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-slate-400">Statistical reliability index</p>
        </div>
      </div>

      {/* AI Narrative & Liquidity Insights Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-blue-950/40 border border-amber-500/20 shadow-xl space-y-3">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span>AI Liquidity & Cash Trajectory Assessment</span>
        </div>
        <p className="text-sm text-slate-200 leading-relaxed font-sans">
          {forecast.aiNarrative}
        </p>
      </div>

      {/* Main Recharts Chart View */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              <span>Historical vs 3-Month AI Projected Cash Flow Trajectory</span>
            </h3>
            <p className="text-xs text-slate-400">
              General Ledger historical actuals (solid cyan) vs projected linear trend (dashed amber) with 95% confidence interval
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-cyan-400 font-medium">
              <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block" />
              GL Actuals
            </span>
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
              AI Forecast
            </span>
            {showConfidenceBand && (
              <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                <span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40 inline-block" />
                95% Confidence Band
              </span>
            )}
          </div>
        </div>

        <div className="h-80 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={forecast.combinedChartData}
              margin={{ top: 10, right: 30, left: 20, bottom: 20 }}
            >
              <defs>
                <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis
                dataKey="month"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* 95% Confidence Band Shading */}
              {showConfidenceBand && (
                <Area
                  type="monotone"
                  dataKey="upperBand"
                  stroke="none"
                  fill="url(#confidenceGradient)"
                  name="95% Confidence Upper"
                />
              )}

              {/* Historical Cash Balance Line */}
              <Line
                type="monotone"
                dataKey="historicalBalance"
                stroke="#38bdf8"
                strokeWidth={3}
                dot={{ r: 4, fill: "#38bdf8", strokeWidth: 2, stroke: "#0f172a" }}
                activeDot={{ r: 7, fill: "#38bdf8" }}
                name="GL Historical Balance"
              />

              {/* Forecasted Line */}
              <Line
                type="monotone"
                dataKey="forecastedBalance"
                stroke="#f59e0b"
                strokeWidth={3}
                strokeDasharray="5 5"
                dot={{ r: 5, fill: "#f59e0b", strokeWidth: 2, stroke: "#0f172a" }}
                activeDot={{ r: 8, fill: "#f59e0b" }}
                name="AI Forecasted Balance"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Historical & Forecast Breakdown Table */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Info className="w-5 h-5 text-amber-400" />
          <span>Monthly Cash Flow Breakdown & Confidence Intervals</span>
        </h3>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Period</th>
                <th className="p-4">Type</th>
                <th className="p-4 text-right">Inflow (Debits)</th>
                <th className="p-4 text-right">Outflow (Credits)</th>
                <th className="p-4 text-right">Net Flow</th>
                <th className="p-4 text-right">Closing / Projected</th>
                <th className="p-4 text-right">95% Confidence Band</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {/* Historical rows */}
              {forecast.historicalData.map((row) => (
                <tr key={row.month} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-4 font-bold text-white">{row.month}</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-900 uppercase">
                      Historical
                    </span>
                  </td>
                  <td className="p-4 text-right text-emerald-400">
                    ₹{(row.inflow / 100).toLocaleString("en-IN")}
                  </td>
                  <td className="p-4 text-right text-rose-400">
                    ₹{(row.outflow / 100).toLocaleString("en-IN")}
                  </td>
                  <td className="p-4 text-right text-white font-bold">
                    ₹{(row.netCashFlow / 100).toLocaleString("en-IN")}
                  </td>
                  <td className="p-4 text-right text-cyan-400 font-bold">
                    ₹{(row.closingBalance / 100).toLocaleString("en-IN")}
                  </td>
                  <td className="p-4 text-right text-slate-500">—</td>
                </tr>
              ))}

              {/* Forecast rows */}
              {forecast.forecastData.map((row) => (
                <tr
                  key={row.month}
                  className="bg-amber-500/5 hover:bg-amber-500/10 transition-colors"
                >
                  <td className="p-4 font-bold text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{row.month}</span>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950 text-amber-400 border border-amber-900 uppercase">
                      3-Mo Forecast
                    </span>
                  </td>
                  <td className="p-4 text-right text-emerald-400/80">
                    ₹{(row.inflow / 100).toLocaleString("en-IN")}
                  </td>
                  <td className="p-4 text-right text-rose-400/80">
                    ₹{(row.outflow / 100).toLocaleString("en-IN")}
                  </td>
                  <td className="p-4 text-right text-amber-400 font-bold">
                    +₹{(row.netCashFlow / 100).toLocaleString("en-IN")}
                  </td>
                  <td className="p-4 text-right text-amber-400 font-bold">
                    ₹{(row.forecastedBalance! / 100).toLocaleString("en-IN")}
                  </td>
                  <td className="p-4 text-right text-slate-300 font-medium">
                    ₹{(row.lowerBand! / 100).toLocaleString("en-IN")} – ₹
                    {(row.upperBand! / 100).toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
