import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { getVendorSpendingReport, getProfitAndLossReport } from "@/services/reports";
import { formatINR } from "@/ai/tools";

const ollamaOpenAI = createOpenAI({
  baseURL: "http://localhost:11434/v1",
  apiKey: "ollama",
});

async function main() {
  console.log("Testing Ollama gemma3:4b with live ledger context...");

  // Pre-fetch financial context from database via reporting services
  const vendorReport = await getVendorSpendingReport({ limit: 5 });
  const pnlReport = await getProfitAndLossReport({});

  const contextPrompt = `
[LIVE FINANCIAL LEDGER DATA]
- P&L Summary: Total Revenue = ${formatINR(pnlReport.totalRevenue)}, Total Expenses = ${formatINR(pnlReport.totalExpenses)}, Net Profit = ${formatINR(pnlReport.netProfit)}.
- Top Vendors:
${vendorReport.vendors.map(v => `  * ${v.vendorName}: Total Spent = ${formatINR(v.totalSpentPaise)}, Outstanding = ${formatINR(v.outstandingBalancePaise)}`).join("\n")}
`;

  const model = ollamaOpenAI("gemma3:4b");

  const result = streamText({
    model,
    system: `You are an expert AI Financial Assistant for Urban Furniture Accounting. Answer accurately using the financial context provided below in Indian Rupees (₹).\n${contextPrompt}`,
    prompt: "Which vendor did we spend the most with this month?",
  });

  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }
  console.log("\nDone!");
}

main();
