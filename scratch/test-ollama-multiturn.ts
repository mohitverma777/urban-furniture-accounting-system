import { createOpenAI } from "@ai-sdk/openai";
import { streamText, convertToModelMessages } from "ai";

const ollamaOpenAI = createOpenAI({
  baseURL: "http://localhost:11434/v1",
  apiKey: "ollama",
});

/**
 * Clean UI messages into standard text-only ModelMessage objects for Ollama compatibility.
 */
export function sanitizeMessagesForOllama(messages: any[]) {
  const cleaned: { role: "user" | "assistant"; content: string }[] = [];

  for (const msg of messages) {
    if (!msg || typeof msg !== "object") continue;

    let textContent = "";

    if (typeof msg.content === "string" && msg.content.trim() !== "") {
      textContent = msg.content;
    } else if (Array.isArray(msg.parts)) {
      const textParts = msg.parts
        .filter((p: any) => p && p.type === "text" && typeof p.text === "string")
        .map((p: any) => p.text);
      textContent = textParts.join("\n").trim();
    }

    if (!textContent) continue;

    const role = msg.role === "assistant" ? "assistant" : "user";
    cleaned.push({ role, content: textContent });
  }

  return cleaned;
}

async function main() {
  console.log("Testing message sanitizer with item_reference payload...");

  // Simulated payload containing item_reference parts that SDK v5 creates
  const badMessages: any[] = [
    {
      id: "msg-1",
      role: "user",
      content: "Which vendor did we spend the most with?",
      parts: [{ type: "text", text: "Which vendor did we spend the most with?" }],
    },
    {
      id: "msg-2",
      role: "assistant",
      content: "Top vendor is Wood Craft Inc.",
      parts: [
        { type: "text", text: "Top vendor is Wood Craft Inc." },
        { type: "item_reference", id: "item_123" }, // problematic v5 item_reference!
      ],
    },
    {
      id: "msg-3",
      role: "user",
      content: "What about customer revenue?",
      parts: [{ type: "text", text: "What about customer revenue?" }],
    },
  ];

  try {
    const modelMessages = sanitizeMessagesForOllama(badMessages);
    console.log("Cleaned modelMessages:", JSON.stringify(modelMessages, null, 2));

    const result = streamText({
      model: ollamaOpenAI("gemma3:4b"),
      system: "You are a financial assistant.",
      messages: modelMessages as any,
    });

    for await (const chunk of result.textStream) {
      process.stdout.write(chunk);
    }
    console.log("\nSuccess!");
  } catch (err: any) {
    console.error("Sanitizer Error:", err);
  }
}

main();
