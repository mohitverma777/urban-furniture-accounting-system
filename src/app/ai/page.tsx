import type { Metadata } from "next";
import { AiChatShell } from "@/components/ai/ai-chat-shell";

export const metadata: Metadata = {
  title: "AI Assistant",
  description: "AI-powered financial assistant for Urban Furniture Accounting — ask questions about P&L, Balance Sheet, cash position, and more.",
};

/**
 * /ai page — AI Financial Assistant
 *
 * This is a thin server component page. All AI interaction happens
 * through the client-side AiChatShell which calls /api/ai/chat.
 * The GEMINI_API_KEY is never sent to the browser.
 */
export default function AiPage() {
  return (
    <div className="h-full flex flex-col">
      <AiChatShell />
    </div>
  );
}
