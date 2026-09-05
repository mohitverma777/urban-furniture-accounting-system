"use client";

/**
 * src/components/dashboard/talk-to-ledger-card.tsx
 *
 * Dedicated "Talk to Your Ledger" Dashboard Card.
 * Allows instant financial queries directly from the main dashboard using Gemini & AI Tools.
 */

import React, { useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Sparkles, Send, Square, Bot, ArrowRight, RefreshCw, AlertTriangle, Trash2 } from "lucide-react";
import Link from "next/link";
import { ChatMessage } from "@/components/ai/chat-message";

const QUICK_PROMPTS = [
  "Which vendor did we spend the most with this month?",
  "What is our profit this month?",
  "Are we over budget this month?",
  "Who is our biggest customer?",
];

export function TalkToLedgerCard() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");

  const { messages, sendMessage, stop, status, error, clearError, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/ai/chat" }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  function handleSend(customText?: string) {
    const text = (customText ?? input).trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage({ text });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-violet-500/20 shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <span>Talk to Your Ledger</span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-950 text-violet-300 border border-violet-800">
                Ollama Gemma 3:4B
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Ask questions about live revenues, expenses, vendor spend, or budget limits.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              title="Clear conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <Link
            href="/ai"
            className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors"
          >
            <span>Full Chat</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Suggested Quick Prompts (shown when message list is empty) */}
      {messages.length === 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Suggested Ledger Questions:
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                disabled={isLoading}
                className="text-xs px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60
                           hover:border-violet-500/40 text-slate-300 hover:text-violet-300 transition-all text-left"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Messages Stream View (Scrollable max height) */}
      {messages.length > 0 && (
        <div className="max-h-72 overflow-y-auto space-y-4 pr-1 scroll-smooth">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {status === "submitted" && (
            <div className="flex gap-2 items-center text-xs text-violet-400 px-3 py-2 rounded-xl bg-violet-950/40 border border-violet-800/40">
              <Bot className="w-4 h-4 animate-bounce" />
              <span>FinBot is querying live ledger data…</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span className="flex-1">{error.message ?? "Failed to complete request"}</span>
              <button onClick={() => clearError()} className="text-red-400 hover:underline">
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Input box */}
      <div className="flex items-end gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2.5 focus-within:border-violet-500/40 transition-colors">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask your ledger (e.g. 'What is our profit this month?')..."
          rows={1}
          disabled={isLoading}
          className="flex-1 bg-transparent text-xs text-slate-200 placeholder:text-slate-500
                     resize-none outline-none leading-relaxed py-1 disabled:opacity-50"
        />
        <div className="shrink-0">
          {isLoading ? (
            <button
              onClick={() => stop()}
              className="p-2 rounded-lg bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 transition-colors"
              title="Stop generation"
            >
              <Square className="w-3.5 h-3.5 text-red-400 fill-red-400" />
            </button>
          ) : (
            <button
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className="p-2 rounded-lg bg-violet-500/20 border border-violet-500/30 hover:bg-violet-500/30 text-violet-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Send question"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
