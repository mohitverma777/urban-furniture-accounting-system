import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const ollamaOpenAI = createOpenAI({
  baseURL: "http://localhost:11434/v1",
  apiKey: "ollama",
});

async function main() {
  console.log("Testing streamText with gemma3:4b...");
  try {
    const result = streamText({
      model: ollamaOpenAI("gemma3:4b"),
      prompt: "Who are you and what model are you running?",
    });

    for await (const chunk of result.textStream) {
      process.stdout.write(chunk);
    }
    console.log("\nDone!");
  } catch (err) {
    console.error("Stream Text Error:", err);
  }
}

main();
