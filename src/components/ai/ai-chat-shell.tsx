"use client";

/**
 * src/components/ai/ai-chat-shell.tsx
 *
 * Full-page AI Financial Assistant chat interface.
 * Uses Vercel AI SDK v5 useChat hook (new API) to stream responses from /api/ai/chat.
 *
 * API Changes in SDK v5:
 * - useChat returns: { messages, sendMessage, stop, status, error, clearError }
 * - status: 'submitted' | 'streaming' | 'ready' | 'error'
 * - sendMessage({ text: string }) — no more handleSubmit/handleInputChange
 * - transport via DefaultChatTransport
 */

import React, { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Send, Bot, Sparkles, AlertTriangle, RefreshCw, Square, Trash2 } from "lucide-react";
import { ChatMessage } from "./chat-message";
import { SuggestionChips } from "./suggestion-chips";

export function AiChatShell() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");

  const { messages, sendMessage, stop, status, error, clearError, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/ai/chat" }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  function handleSend() {
    const text = input.trim();
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

  function handleChipSelect(prompt: string) {
    setInput(prompt);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  }

  const CHAT_STORAGE_KEY = "urban_furniture_ai_chat_history";

  // Load chat memory from localStorage on initial mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch (e) {
      console.error("[Chat Memory] Failed to load chat history", e);
    }
  }, [setMessages]);

  // Save chat memory to localStorage whenever messages update
  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
      } else {
        localStorage.removeItem(CHAT_STORAGE_KEY);
      }
    } catch (e) {
      console.error("[Chat Memory] Failed to save chat history", e);
    }
  }, [messages]);

  const handleClear = () => {
    setMessages([]);
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch (e) {
      console.error("[Chat Memory] Failed to clear chat history", e);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur shrink-0">
        <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-white">Talk to Your Ledger</h1>
          <p className="text-xs text-slate-400">AI Financial Assistant · Powered by Ollama Gemma 3:4B</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {!isEmpty && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              title="Clear conversation memory"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isLoading ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
              }`}
            />
            <span className="text-xs text-slate-400">
              {isLoading ? "Thinking…" : "Live DB"}
            </span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5 scroll-smooth">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center pt-8">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Bot className="w-8 h-8 text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Financial Intelligence</h2>
              <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
                Ask me anything about your financials — P&amp;L, Balance Sheet, cash position,
                outstanding invoices, or budget performance. All answers come from live accounting
                data.
              </p>
            </div>
            <div className="w-full max-w-md">
              <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wider">
                Quick Questions
              </p>
              <SuggestionChips onSelect={handleChipSelect} />
            </div>
          </div>
        )}

        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {/* Typing indicator (shown while waiting for first token) */}
        {status === "submitted" && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0 mt-1">
              <Bot className="w-4 h-4 text-violet-400" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-slate-800/80 border border-slate-700/50">
              <div className="flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-300">{error.message ?? "Something went wrong."}</p>
              <button
                onClick={() => clearError()}
                className="mt-1.5 flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="shrink-0 px-4 py-4 border-t border-slate-800 bg-slate-950/80 backdrop-blur">
        <div
          className="flex items-end gap-2 bg-slate-900 border border-slate-700/60 rounded-2xl px-4 py-3
                     focus-within:border-violet-500/50 transition-colors"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about P&L, balance sheet, cash position…"
            rows={1}
            disabled={isLoading}
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-500
                       resize-none outline-none leading-relaxed max-h-40 py-0.5 disabled:opacity-50"
          />
          <div className="flex items-center gap-1 shrink-0">
            {isLoading ? (
              <button
                type="button"
                onClick={() => stop()}
                className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center
                           hover:bg-red-500/30 transition-colors"
                title="Stop generation"
              >
                <Square className="w-3.5 h-3.5 text-red-400 fill-red-400" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim()}
                className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center
                           hover:bg-violet-500/30 transition-colors
                           disabled:opacity-30 disabled:cursor-not-allowed"
                title="Send message (Enter)"
              >
                <Send className="w-3.5 h-3.5 text-violet-400" />
              </button>
            )}
          </div>
        </div>
        <p className="text-center text-[10px] text-slate-600 mt-2">
          All answers derived from live accounting data · Read-only · Local Ollama Gemma 3:4B
        </p>
      </div>
    </div>
  );
}
