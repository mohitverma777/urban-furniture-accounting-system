"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { TrendingUp, Activity, Layers, DollarSign, Zap } from "lucide-react";
import type { JournalEntryListItem } from "@/services/accounting/query";

interface JournalTrendSparklineProps {
  entries: JournalEntryListItem[];
}

export interface DailyDebitPoint {
  dateKey: string;
  dateLabel: string;
  dailyDebit: number; // in INR Rupees
  entryCount: number;
}

export function aggregateDailyDebitVolume(
  entries: JournalEntryListItem[]
): DailyDebitPoint[] {
  const dailyMap = new Map<string, { totalDebitPaise: number; count: number; dateObj: Date }>();

  for (const entry of entries) {
    const d = entry.date instanceof Date ? entry.date : new Date(entry.date);
    if (isNaN(d.getTime())) continue;

    const dateKey = d.toISOString().split("T")[0];
    const cur = dailyMap.get(dateKey) || {
      totalDebitPaise: 0,
      count: 0,
      dateObj: d,
    };

    cur.totalDebitPaise += entry.totalDebit || 0;
    cur.count += 1;
    dailyMap.set(dateKey, cur);
  }

  const sortedKeys = Array.from(dailyMap.keys()).sort();

  return sortedKeys.map((key) => {
    const item = dailyMap.get(key)!;
    const dateLabel = item.dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
    });

    return {
      dateKey: key,
      dateLabel,
      dailyDebit: Math.round(item.totalDebitPaise / 100),
      entryCount: item.count,
    };
  });
}

export function JournalTrendSparkline({ entries }: JournalTrendSparklineProps) {
  const chartData = useMemo(() => aggregateDailyDebitVolume(entries), [entries]);

  const { totalEntriesCount, totalDebitVolume, avgDailyDebit, peakDailyDebit } =
    useMemo(() => {
      const count = entries.length;
      const sumPaise = entries.reduce((acc, e) => acc + (e.totalDebit || 0), 0);
      const sumRupees = Math.round(sumPaise / 100);
      const daysCount = Math.max(1, chartData.length);
      const avg = Math.round(sumRupees / daysCount);
      const peak =
        chartData.length > 0
          ? Math.max(...chartData.map((d) => d.dailyDebit))
          : 0;

      return {
        totalEntriesCount: count,
        totalDebitVolume: sumRupees,
        avgDailyDebit: avg,
        peakDailyDebit: peak,
      };
    }, [entries, chartData]);

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl space-y-1 text-xs font-mono">
          <p className="font-bold text-slate-200 border-b border-slate-800 pb-1 flex items-center justify-between gap-3">
            <span>{data.dateKey} ({data.dateLabel})</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800 uppercase">
              {data.entryCount} {data.entryCount === 1 ? "Voucher" : "Vouchers"}
            </span>
          </p>

          <p className="text-cyan-400 flex justify-between gap-4 pt-1">
            <span>Daily Posting Volume:</span>
            <span className="font-bold">
              ₹{data.dailyDebit.toLocaleString("en-IN")}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (entries.length === 0) return null;

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
      {/* Header & Stats Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            <span>Daily Journal Posting Velocity &amp; Debit Volume</span>
          </h3>
          <p className="text-xs text-slate-400">
            Real-time daily transaction debit volume derived from posted journal vouchers
          </p>
        </div>

        {/* 4 Stat Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block font-semibold">
              Postings Count
            </span>
            <span className="font-mono font-bold text-white text-sm">
              {totalEntriesCount}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block font-semibold">
              Total Volume
            </span>
            <span className="font-mono font-bold text-cyan-400 text-sm">
              ₹{totalDebitVolume.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block font-semibold">
              Avg Daily Debit
            </span>
            <span className="font-mono font-bold text-amber-400 text-sm">
              ₹{avgDailyDebit.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block font-semibold">
              Peak Day Volume
            </span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              ₹{peakDailyDebit.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      {/* Sparkline AreaChart */}
      <div className="h-44 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="debitSparklineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
            <XAxis
              dataKey="dateLabel"
              stroke="#94a3b8"
              fontSize={10}
              tickLine={false}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={10}
              tickLine={false}
              tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />

            <Area
              type="monotone"
              dataKey="dailyDebit"
              stroke="#38bdf8"
              strokeWidth={2.5}
              fill="url(#debitSparklineGradient)"
              activeDot={{ r: 6, fill: "#38bdf8", stroke: "#0f172a", strokeWidth: 2 }}
              name="Daily Debit Volume"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
