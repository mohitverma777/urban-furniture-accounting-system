"use client";

/**
 * src/components/ai/structured-chart.tsx
 *
 * Safe, schema-validated structured chart renderer for AI financial assistant responses.
 * Parses strict ```json:chart or ```chart blocks and renders Recharts visualization.
 *
 * Supported Chart Types: "bar_chart" | "pie_chart"
 */

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { BarChart3, PieChart as PieIcon } from "lucide-react";

export interface StructuredChartPayload {
  type: "bar_chart" | "pie_chart";
  title: string;
  data: Array<{ name: string; value: number }>;
}

const COLORS = [
  "#6366f1", // Indigo
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#8b5cf6", // Purple
  "#3b82f6", // Blue
  "#14b8a6", // Teal
];

/** Format rupee number with Indian locale formatting */
function formatCurrency(val: number): string {
  return `₹${val.toLocaleString("en-IN")}`;
}

export function extractStructuredChart(text: string): StructuredChartPayload | null {
  try {
    const match =
      text.match(/```json:chart\s*([\s\S]*?)\s*```/) ||
      text.match(/```chart\s*([\s\S]*?)\s*```/);

    if (!match || !match[1]) return null;

    const parsed = JSON.parse(match[1]);

    if (
      parsed &&
      (parsed.type === "bar_chart" || parsed.type === "pie_chart") &&
      typeof parsed.title === "string" &&
      Array.isArray(parsed.data)
    ) {
      const cleanData = parsed.data
        .filter(
          (d: unknown): d is { name: string; value: number } =>
            typeof d === "object" &&
            d !== null &&
            "name" in d &&
            "value" in d &&
            typeof (d as { name: unknown }).name === "string" &&
            typeof (d as { value: unknown }).value === "number"
        )
        .map((d: { name: string; value: number }) => ({
          name: d.name,
          value: Number(d.value),
        }));

      if (cleanData.length > 0) {
        return {
          type: parsed.type,
          title: parsed.title,
          data: cleanData,
        };
      }
    }
  } catch {
    // Fail silently if chart JSON is malformed
  }

  return null;
}

export function StructuredChartRenderer({ chart }: { chart: StructuredChartPayload }) {
  return (
    <div className="mt-3 p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 shadow-md">
      <div className="flex items-center gap-2 mb-3">
        {chart.type === "bar_chart" ? (
          <BarChart3 className="w-4 h-4 text-violet-400" />
        ) : (
          <PieIcon className="w-4 h-4 text-emerald-400" />
        )}
        <h4 className="text-xs font-semibold text-slate-200 tracking-wide uppercase">
          {chart.title}
        </h4>
      </div>

      <div className="w-full h-56">
        <ResponsiveContainer width="100%" height="100%">
          {chart.type === "bar_chart" ? (
            <BarChart data={chart.data} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="name"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                interval={0}
                angle={-15}
                textAnchor="end"
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "10px",
                  color: "#f8fafc",
                  fontSize: "12px",
                }}
                formatter={(val) => [formatCurrency(Number(val) || 0), "Value"]}
              />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]}>
                {chart.data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <PieChart>
              <Pie
                data={chart.data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="45%"
                outerRadius={75}
                innerRadius={40}
                paddingAngle={4}
                stroke="#0f172a"
                strokeWidth={2}
              >
                {chart.data.map((_, index) => (
                  <Cell key={`cell-pie-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "12px",
                  color: "#f8fafc",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
                formatter={(val) => [formatCurrency(Number(val) || 0), "Value"]}
              />
              <Legend
                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                formatter={(value) => <span className="text-slate-300 font-medium">{value}</span>}
              />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
