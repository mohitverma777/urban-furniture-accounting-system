import {
  getProfitAndLossReport,
  getVendorSpendingReport,
  getCustomerRevenueReport,
  getLedgerAnomaliesReport,
} from "@/services/reports";
import { getBudgetReportItems } from "@/services/budgets";
import { formatINR } from "@/ai/tools";

export function getSystemPrompt(currentDate?: string): string {
  const todayStr = currentDate ?? new Date().toISOString().split("T")[0];

  return `You are "FinBot", the official AI Financial Assistant for Urban Furniture Accounting.

## System Instructions & Safety Rules
1. You are a financial assistant for this double-entry accounting application.
2. Database / application data is your single source of truth.
3. Never invent, hallucinate, or guess financial figures.
4. If requested information is unavailable or tools return no data, state clearly that no data was found.
5. Never provide a financial number unless it comes directly from database tools or live financial ledger data context.
6. Explain calculations and variances clearly when useful.
7. Use Indian Rupee formatting (e.g. ₹1,25,000.00) for all monetary values.
8. Do not claim to have performed actions (such as posting entries or paying bills) that you did not perform.
9. You are strictly READ-ONLY.
10. You cannot create, modify, post, or delete accounting records, invoices, payments, or orders.

## Relative Date Handling (Current Date: ${todayStr})
Convert relative time expressions into explicit date range parameters:
- **today**: ${todayStr}
- **this month**: current month of ${todayStr}
- **this year**: ${todayStr.substring(0, 4)}

## Optional Structured Chart Formatting
When returning numerical comparisons (e.g., top 5 vendors, top expenses, customer revenue, budget utilization), you MAY include a structured chart specification block at the VERY END of your response inside a \`\`\`json:chart codeblock.

STRICT CHART SCHEMA:
\`\`\`json:chart
{
  "type": "bar_chart",
  "title": "Top Vendors by Spend",
  "data": [
    { "name": "Wood Craft Inc", "value": 150000 },
    { "name": "Steel Corp", "value": 85000 }
  ]
}
\`\`\`
Allowed chart types: "bar_chart" or "pie_chart". Data must be an array of objects with "name" (string) and "value" (number in ₹ rupees). Do NOT return arbitrary React components or HTML in the chart codeblock.`;
}

export async function getLiveLedgerContextPrompt(): Promise<string> {
  try {
    const [pnl, vendors, customers, budgets, anomalies] = await Promise.all([
      getProfitAndLossReport({}).catch(() => null),
      getVendorSpendingReport({ limit: 10 }).catch(() => null),
      getCustomerRevenueReport({ limit: 10 }).catch(() => null),
      getBudgetReportItems().catch(() => []),
      getLedgerAnomaliesReport({}).catch(() => null),
    ]);

    let contextStr = "\n\n## LIVE FINANCIAL LEDGER DATA SNAPSHOT (SINGLE SOURCE OF TRUTH):\n";

    if (pnl) {
      contextStr += `### PROFIT & LOSS SUMMARY:
- Total Revenue: ${formatINR(pnl.totalRevenue)}
- Total Expenses: ${formatINR(pnl.totalExpenses)}
- Net Profit: ${formatINR(pnl.netProfit)} (Margin: ${pnl.profitMarginPercentage}%)
- Sales Income Items: ${pnl.salesIncomeRows.map((r) => `${r.accountName} (${r.accountCode}): ${formatINR(r.netAmount)}`).join(", ") || "None"}
- Operating Expenses: ${pnl.operatingExpenseRows.map((r) => `${r.accountName} (${r.accountCode}): ${formatINR(r.netAmount)}`).join(", ") || "None"}
- Purchase Expenses (COGS): ${pnl.purchaseExpenseRows.map((r) => `${r.accountName} (${r.accountCode}): ${formatINR(r.netAmount)}`).join(", ") || "None"}\n\n`;
    }

    if (vendors && vendors.vendors.length > 0) {
      contextStr += `### VENDOR SPENDING BREAKDOWN:
- Total Vendors: ${vendors.totalVendorsCount}, Total Spent: ${formatINR(vendors.totalSpentPaise)}
- Top Vendors:
${vendors.vendors.map((v) => `  * ${v.vendorName}: Total Spent = ${formatINR(v.totalSpentPaise)}, Bill Count = ${v.billCount}, Outstanding = ${formatINR(v.outstandingBalancePaise)}`).join("\n")}\n\n`;
    } else {
      contextStr += `### VENDOR SPENDING BREAKDOWN: No vendor spending recorded yet.\n\n`;
    }

    if (customers && customers.customers.length > 0) {
      contextStr += `### CUSTOMER REVENUE BREAKDOWN:
- Total Customers: ${customers.totalCustomersCount}, Total Revenue: ${formatINR(customers.totalRevenuePaise)}
- Top Customers:
${customers.customers.map((c) => `  * ${c.customerName}: Total Revenue = ${formatINR(c.totalRevenuePaise)}, Invoice Count = ${c.invoiceCount}, Outstanding = ${formatINR(c.outstandingBalancePaise)}`).join("\n")}\n\n`;
    } else {
      contextStr += `### CUSTOMER REVENUE BREAKDOWN: No customer revenue recorded yet.\n\n`;
    }

    if (budgets && budgets.length > 0) {
      contextStr += `### BUDGETS STATUS:
${budgets.map((b) => `  * Budget '${b.name}' (${b.analyticName}): Planned = ${formatINR(b.plannedAmount)}, Actual = ${formatINR(b.actualAmount)}, Utilization = ${b.utilizationPercentage}%, Status = ${b.status}`).join("\n")}\n\n`;
    }

    if (anomalies) {
      contextStr += `### LEDGER ANOMALIES & AUDIT FINDINGS:
- Total Findings: ${anomalies.totalAnomaliesCount} (Critical: ${anomalies.criticalCount}, Warning: ${anomalies.warningCount}, Info: ${anomalies.infoCount})
${anomalies.findings.map((f) => `  * [${f.severity.toUpperCase()}] ${f.title}: ${f.description}`).join("\n")}\n\n`;
    }

    return contextStr;
  } catch (err) {
    console.error("[Context Prompt Error]", err);
    return "";
  }
}

export const SYSTEM_PROMPT = getSystemPrompt();

