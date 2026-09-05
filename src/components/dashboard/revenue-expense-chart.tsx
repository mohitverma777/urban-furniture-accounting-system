"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import type { MonthlyChartPoint } from "@/services/dashboard";

export function RevenueExpenseChart({ data }: { data: MonthlyChartPoint[] }) {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} />
          <YAxis
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            tickFormatter={(val) => `₹${val.toLocaleString()}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              borderColor: "#334155",
              borderRadius: "12px",
              color: "#f8fafc",
            }}
            formatter={(value) => [
              `₹${(Number(value) || 0).toLocaleString("en-IN")}`,
              "",
            ]}
          />
          <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }} />
          <Bar dataKey="revenue" name="Revenue (Income)" fill="#34d399" radius={[6, 6, 0, 0]} />
          <Bar dataKey="expenses" name="Expenses (COGS & Opex)" fill="#f87171" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
