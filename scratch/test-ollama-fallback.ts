import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { getVendorSpendingTool } from "@/ai/tools";

const ollamaOpenAI = createOpenAI({
  baseURL: "http://localhost:11434/v1",
  apiKey: "ollama",
});

async function main() {
  console.log("Testing streamText error catching...");
  const model = ollamaOpenAI("gemma3:4b");

  try {
    const result = streamText({
      model,
      prompt: "Which vendor did we spend the most with this month?",
      tools: {
        getVendorSpending: getVendorSpendingTool,
      },
    });

    for await (const chunk of result.textStream) {
      process.stdout.write(chunk);
    }
  } catch (err: any) {
    console.log("Caught error:", err.message);
    if (err.message?.includes("does not support tools")) {
      console.log("Retrying without tools parameter...");
      const resultNoTools = streamText({
        model,
        prompt: "Which vendor did we spend the most with this month?",
      });
      for await (const chunk of resultNoTools.textStream) {
        process.stdout.write(chunk);
      }
      console.log("\nDone fallback!");
    }
  }
}

main();
