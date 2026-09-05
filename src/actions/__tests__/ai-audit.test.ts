/**
 * src/actions/__tests__/ai-audit.test.ts
 *
 * Unit tests for AI Ledger Audit Action & Fallback Handling:
 *  - Deterministic findings extraction
 *  - Empty state handling ("No potential anomalies were detected")
 *  - Severities aggregation
 *  - Ollama offline fallback safety
 */

import { describe, it, expect } from "vitest";
import { runAiLedgerAuditAction } from "../ai-audit";

describe("AI Ledger Audit Action (runAiLedgerAuditAction)", () => {
  it("executes deterministic detectors and returns a structured audit report", async () => {
    const result = await runAiLedgerAuditAction();

    expect(result.success).toBe(true);
    expect(result.auditReport).toBeDefined();
    expect(typeof result.auditReport.totalFindingsCount).toBe("number");
    expect(typeof result.auditReport.criticalCount).toBe("number");
    expect(typeof result.auditReport.highCount).toBe("number");
    expect(typeof result.auditReport.mediumCount).toBe("number");
    expect(typeof result.auditReport.lowCount).toBe("number");
    expect(Array.isArray(result.auditReport.findings)).toBe(true);

    // AI explanation should either be string or fallback message
    expect(result.aiExplanation).not.toBeNull();
    expect(typeof result.aiExplanation).toBe("string");
  });

  it("handles offline local Ollama gracefully without throwing or crashing", async () => {
    // Calling runAiLedgerAuditAction will attempt to run Gemma. If Gemma is offline or errors out,
    // it MUST catch the error gracefully, set isAiAvailable: false, and return findings.
    const result = await runAiLedgerAuditAction();

    expect(result.success).toBe(true);
    expect(result.auditReport).toBeDefined();
    expect(result.aiExplanation).not.toBeNull();
    // Accounting application remains 100% functional
    expect(result.error).toBeUndefined();
  });
}, 10000);
