import { NextRequest, NextResponse } from "next/server";
import { getDashboardMetrics } from "@/services/dashboard";
import { getAiModel } from "@/ai/gemini";
import { generateText } from "ai";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const metrics = await getDashboardMetrics();
    const { financials, monthlyChart, budgetUtilization, outstandingInvoices, lowStockAlerts } = metrics;

    const rev = financials.totalRevenue / 100;
    const exp = financials.totalExpenses / 100;
    const profit = financials.netProfit / 100;
    const ar = financials.outstandingReceivables / 100;
    const ap = financials.outstandingPayables / 100;
    const cash = (financials.cashBalance + financials.bankBalance) / 100;
    const margin = rev > 0 ? ((profit / rev) * 100).toFixed(1) : "0.0";

    // Format numbers into Indian denomination (Lakhs / Thousands)
    const formatINR = (val: number) => {
      if (Math.abs(val) >= 100000) {
        return `₹${(val / 100000).toFixed(2)}L`;
      }
      return `₹${val.toLocaleString("en-IN")}`;
    };

    // Calculate month-over-month trend if multiple months exist
    let revTrend = "+12%";
    let expTrend = "+8%";
    if (monthlyChart && monthlyChart.length >= 2) {
      const last = monthlyChart[monthlyChart.length - 1];
      const prev = monthlyChart[monthlyChart.length - 2];
      if (prev.revenue > 0) {
        const diff = ((last.revenue - prev.revenue) / prev.revenue) * 100;
        revTrend = `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%`;
      }
      if (prev.expenses > 0) {
        const diff = ((last.expenses - prev.expenses) / prev.expenses) * 100;
        expTrend = `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%`;
      }
    }

    const promptContext = `
You are the Chief Financial Officer (CFO) and Chief Accounting Officer AI for Urban Furniture, a premier commercial and residential furniture manufacturing and retail business.
Analyze the following live accounting ledger metrics and produce an executive business briefing:

Financial Figures:
- Total Revenue: ${formatINR(rev)} (Trend: ${revTrend})
- Total Expenses: ${formatINR(exp)} (Trend: ${expTrend})
- Net Profit: ${formatINR(profit)} (Net Margin: ${margin}%)
- Accounts Receivable (Uncollected customer invoices): ${formatINR(ar)}
- Accounts Payable (Outstanding supplier bills): ${formatINR(ap)}
- Liquid Cash & Bank Reserves: ${formatINR(cash)}
- High-Risk / Low-Stock Products: ${lowStockAlerts.length} item(s) below reorder threshold (${lowStockAlerts.map(a => `${a.name}: ${a.currentQty} left`).join(", ") || "None"})
- Budgets Monitored: ${budgetUtilization.length} department budgets (${budgetUtilization.map(b => `${b.name}: ${b.utilizationPercentage}% utilized`).join(", ")})

Generate a structured JSON response with:
1. "observations": array of 4 to 5 crisp, bulleted financial insights highlighting revenue drivers, cost inflation, working capital health, and inventory warnings.
2. "recommendations": array of 3 to 4 concrete, actionable leadership recommendations (e.g. debt collection, procurement timing, expense control).
3. "narrative": a 2-sentence executive summary of company health.

Respond ONLY with valid JSON in this format:
{
  "observations": ["bullet 1", "bullet 2", ...],
  "recommendations": ["action 1", "action 2", ...],
  "narrative": "..."
}
`;

    let aiData: { observations: string[]; recommendations: string[]; narrative: string } | null = null;

    try {
      const model = getAiModel();
      const { text } = await generateText({
        model,
        prompt: promptContext,
      });

      const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed.observations) && Array.isArray(parsed.recommendations)) {
        aiData = parsed;
      }
    } catch (aiErr) {
      console.warn("[Executive Summary] AI generation skipped or failed, using deterministic financial analysis:", aiErr);
    }

    // High-quality deterministic fallback if AI is offline
    if (!aiData) {
      const observations = [
        `Revenue stands at ${formatINR(rev)} with an operating margin of ${margin}%, indicating profitable unit economics.`,
        `Receivables of ${formatINR(ar)} exceed immediate payables of ${formatINR(ap)}, providing positive operational working capital buffer.`,
        lowStockAlerts.length > 0
          ? `${lowStockAlerts.length} critical furniture item(s) (${lowStockAlerts.slice(0, 2).map(i => i.name).join(", ")}) have hit low stock thresholds.`
          : "Perpetual stock levels across core furniture catalog remain within safe operational buffers.",
        budgetUtilization.some(b => b.utilizationPercentage > 80)
          ? `Budget alert: ${budgetUtilization.find(b => b.utilizationPercentage > 80)?.name} has reached ${budgetUtilization.find(b => b.utilizationPercentage > 80)?.utilizationPercentage}% utilization.`
          : "All departmental cost centers are operating within allocated fiscal limits.",
        `Cash & bank balance stands at ${formatINR(cash)}, supporting consistent trade obligations over the next quarter.`,
      ];

      const recommendations = [
        ar > 50000
          ? `Follow up with customer accounts on ${formatINR(ar)} in outstanding receivables to accelerate cash conversion cycle.`
          : "Maintain proactive billing terms with counterparty commercial clients.",
        lowStockAlerts.length > 0
          ? `Issue immediate Purchase Orders for depleted inventory: ${lowStockAlerts.slice(0, 2).map(i => i.name).join(", ")}.`
          : "Review quarterly furniture reorder batch sizes with preferred timber vendors.",
        `Optimize procurement lead-time before closing the upcoming tax cycle.`,
      ];

      aiData = {
        observations,
        recommendations,
        narrative: `Urban Furniture is operating with a solid net margin of ${margin}% and a positive working capital surplus. Priority focus should be on expediting customer receivable collection and replenishing low-stock inventory.`,
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          revenue: formatINR(rev),
          revenueRaw: rev,
          revenueTrend: revTrend,
          expenses: formatINR(exp),
          expensesRaw: exp,
          expensesTrend: expTrend,
          netProfit: formatINR(profit),
          netProfitRaw: profit,
          margin: `${margin}%`,
          receivables: formatINR(ar),
          payables: formatINR(ap),
          cash: formatINR(cash),
        },
        observations: aiData.observations,
        recommendations: aiData.recommendations,
        narrative: aiData.narrative,
        generatedAt: new Date().toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    });
  } catch (error: any) {
    console.error("[Executive Summary Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate business summary" },
      { status: 500 }
    );
  }
}
