import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";

/**
 * Returns an AI model instance.
 * Defaults to local Ollama with gemma3:4b model.
 * If AI_PROVIDER=google is set, uses Google Gemini.
 */
export function getAiModel(modelOverride?: string) {
  const provider = process.env.AI_PROVIDER || "ollama";

  if (provider === "google" || provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "[AI] GEMINI_API_KEY is not set. Add it to .env.local as GEMINI_API_KEY=<your-key>"
      );
    }
    const google = createGoogleGenerativeAI({ apiKey });
    return google(modelOverride || "gemini-1.5-flash");
  }

  // Default to local Ollama running gemma3:4b
  const baseURL = process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1";
  const modelName = modelOverride || process.env.OLLAMA_MODEL || "gemma3:4b";

  const ollama = createOpenAI({
    baseURL,
    apiKey: "ollama",
  });

  return ollama(modelName);
}

/**
 * Alias for backward compatibility with existing imports.
 */
export function getGeminiModel(model?: string) {
  return getAiModel(model);
}

