import React from "react";
import { PageHeader } from "@/components/common/page-header";
import {
  getCashFlowForecast,
  getCashAccounts,
} from "@/services/reports/cash-flow-forecast";
import { CashFlowForecastClient } from "@/components/reports/cash-flow-forecast-client";
import { TrendingUp, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CashFlowForecastPage({
  searchParams,
}: {
  searchParams: Promise<{ accountId?: string }>;
}) {
  const params = await searchParams;
  const accounts = await getCashAccounts();
  const initialForecast = await getCashFlowForecast({
    accountId: params.accountId,
    forecastMonths: 3,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI-Powered Cash Flow Forecast"
        description="Linear regression modeling on General Ledger cash postings with 95% confidence intervals."
        badge={
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase bg-amber-950 text-amber-400 border border-amber-900">
            <Sparkles className="w-3.5 h-3.5" />
            <span>3-Month Predictive AI</span>
          </span>
        }
      />

      <CashFlowForecastClient
        initialForecast={initialForecast}
        accounts={accounts}
      />
    </div>
  );
}
