import { streamText, convertToModelMessages } from "ai";
import { NextRequest } from "next/server";
import { getAiModel } from "@/ai/gemini";
import { financialTools } from "@/ai/tools";
import { getSystemPrompt, getLiveLedgerContextPrompt } from "@/ai/system-prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Clean UI messages into simple text-only role/content objects for Ollama compatibility.
 * Prevents Vercel AI SDK v5 "item_reference" or tool payload errors on Ollama multi-turn chats.
 */
function sanitizeMessagesForOllama(messages: any[]) {
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages array is required and must not be empty." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const provider = process.env.AI_PROVIDER || "ollama";
    const todayDate = new Date().toISOString().split("T")[0];
    const baseSystemPrompt = getSystemPrompt(todayDate);

    if (provider === "google" || provider === "gemini") {
      const modelMessages = await convertToModelMessages(messages, {
        tools: financialTools,
      });

      const result = streamText({
        model: getAiModel(),
        system: baseSystemPrompt,
        messages: modelMessages,
        tools: financialTools,
        stopWhen: ({ steps }) => steps.length >= 5,
      });

      return result.toUIMessageStreamResponse();
    } else {
      // Default: Local Ollama (gemma3:4b)
      // 1. Inject live financial snapshot context directly into system prompt
      const liveContext = await getLiveLedgerContextPrompt();
      const fullSystemPrompt = `${baseSystemPrompt}\n${liveContext}`;

      // 2. Sanitize multi-turn history to eliminate "item_reference" or tool-part errors in Ollama
      const sanitizedMessages = sanitizeMessagesForOllama(messages);

      const result = streamText({
        model: getAiModel("gemma3:4b"),
        system: fullSystemPrompt,
        messages: sanitizedMessages as any,
      });

      return result.toUIMessageStreamResponse();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[AI Chat Route Error]", err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}


