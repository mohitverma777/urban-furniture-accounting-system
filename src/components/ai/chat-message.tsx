"use client";

/**
 * src/components/ai/chat-message.tsx
 *
 * Renders a single chat message bubble for the AI assistant UI.
 * Handles: user messages, assistant messages, tool-call result cards, and structured charts.
 * Compatible with Vercel AI SDK v5 (UIMessage / UIMessagePart shape).
 */

import React from "react";
import { Bot, User, Wrench, CheckCircle2 } from "lucide-react";
import type { UIMessage } from "@ai-sdk/react";
import { extractStructuredChart, StructuredChartRenderer } from "./structured-chart";

interface ChatMessageProps {
  message: UIMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  // Extract text parts and tool parts from the parts array
  const textParts = message.parts.filter((p) => p.type === "text");
  const toolParts = message.parts.filter(
    (p) => typeof p.type === "string" && p.type.startsWith("tool-")
  );

  // Fallback: if no structured parts, use the raw content if available
  const hasText = textParts.length > 0;

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1 ${
          isUser
            ? "bg-amber-500/20 border border-amber-500/30"
            : "bg-violet-500/20 border border-violet-500/30"
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-amber-700 dark:text-amber-400" />
        ) : (
          <Bot className="w-4 h-4 text-violet-400" />
        )}
      </div>

      {/* Bubble(s) */}
      <div className={`flex flex-col gap-2 max-w-[82%] ${isUser ? "items-end" : "items-start"}`}>
        {/* Tool-call indicator parts (assistant only) */}
        {isAssistant &&
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          toolParts.map((part: any, idx: number) => {
            const toolName: string =
              part.toolName ??
              part.toolInvocation?.toolName ??
              "financial-tool";

            const state: string =
              part.state ??
              part.toolInvocation?.state ??
              "input-streaming";

            const isDone =
              state === "output-available" ||
              state === "result" ||
              state === "output-error";

            return (
              <div
                key={idx}
                className="flex items-start gap-2 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/40 text-xs text-slate-400"
              >
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                ) : (
                  <Wrench className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0 animate-pulse" />
                )}
                <span>
                  <span className="font-mono text-slate-300">{toolName}</span>
                  {isDone ? " — done" : " — fetching…"}
                </span>
              </div>
            );
          })}

        {/* Text parts */}
        {hasText &&
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          textParts.map((part: any, idx: number) => {
            const rawText = part.text ?? "";
            const chartPayload = extractStructuredChart(rawText);
            const cleanText = rawText
              .replace(/```json:chart[\s\S]*?```/g, "")
              .replace(/```chart[\s\S]*?```/g, "")
              .trim();

            return (
              <div key={idx} className="w-full">
                {cleanText && (
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? "bg-amber-500/15 border border-amber-500/30 text-amber-950 dark:text-amber-100 font-medium"
                        : "bg-slate-800/80 border border-slate-700/50 text-slate-200"
                    }`}
                  >
                    <FormattedText text={cleanText} isUser={isUser} />
                  </div>
                )}
                {chartPayload && <StructuredChartRenderer chart={chartPayload} />}
              </div>
            );
          })}

        {/* Fallback for messages without structured parts (older format) */}
        {!hasText && toolParts.length === 0 && (
          <div className="w-full">
            {(() => {
              const rawText = String((message as { content?: string }).content ?? "");
              const chartPayload = extractStructuredChart(rawText);
              const cleanText = rawText
                .replace(/```json:chart[\s\S]*?```/g, "")
                .replace(/```chart[\s\S]*?```/g, "")
                .trim();

              return (
                <>
                  {cleanText && (
                    <div
                      className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? "bg-amber-500/15 border border-amber-500/30 text-amber-950 dark:text-amber-100 font-medium"
                          : "bg-slate-800/80 border border-slate-700/50 text-slate-200"
                      }`}
                    >
                      <FormattedText text={cleanText} isUser={isUser} />
                    </div>
                  )}
                  {chartPayload && <StructuredChartRenderer chart={chartPayload} />}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

/** Very lightweight markdown-ish formatter — bolds **text**, renders line breaks. */
function FormattedText({ text, isUser }: { text: string; isUser?: boolean }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <span key={i}>
            {parts.map((part, j) =>
              j % 2 === 1 ? (
                <strong
                  key={j}
                  className={`font-semibold ${
                    isUser ? "text-amber-950 dark:text-amber-50" : "text-white"
                  }`}
                >
                  {part}
                </strong>
              ) : (
                <span key={j}>{part}</span>
              )
            )}
            {i < lines.length - 1 && <br />}
          </span>
        );
      })}
    </>
  );
}
