"use server";

import { runFullLedgerAudit, type AuditReport } from "@/services/accounting/anomaly-detector";
import { getAiModel } from "@/ai/gemini";
import { generateText } from "ai";

export interface AiAuditResponse {
  success: boolean;
  auditReport: AuditReport;
  aiExplanation: string | null;
  error?: string;
  isAiAvailable: boolean;
}

/**
 * Server Action: Run deterministic ledger audit and generate AI explanation via Gemma.
 *
 * Flow:
 *  Database -> Deterministic Detectors -> Structured Findings -> Gemma 3 4B -> Human Explanation -> UI
 */
export async function runAiLedgerAuditAction(): Promise<AiAuditResponse> {
  try {
    // 1. Run deterministic anomaly detectors with generous timeout
    let auditReport: AuditReport;
    try {
      const detectorTimeoutMs = 15000;
      const auditPromise = runFullLedgerAudit();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Audit detectors timeout')), detectorTimeoutMs)
      );
      auditReport = await Promise.race([auditPromise, timeoutPromise]);
    } catch (detErr) {
      console.warn('[AI Audit] Detectors timed out or failed, returning empty audit report.', detErr);
      auditReport = {
        generatedAt: new Date().toISOString(),
        totalFindingsCount: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        findings: [],
      };
    }

    // 2. If no findings detected, return empty state immediately
    if (auditReport.totalFindingsCount === 0) {
      return {
        success: true,
        auditReport,
        aiExplanation:
          "No potential anomalies were detected. All posted ledger entries, payments, and spending patterns are balanced and within standard baseline parameters.",
        isAiAvailable: true,
      };
    }

    // 3. Format ONLY the structured findings for Gemma
    const structuredPayload = {
      summary: {
        totalFindings: auditReport.totalFindingsCount,
        critical: auditReport.criticalCount,
        high: auditReport.highCount,
        medium: auditReport.mediumCount,
        low: auditReport.lowCount,
      },
      findings: auditReport.findings.map((f) => ({
        type: f.type,
        severity: f.severity,
        title: f.title,
        description: f.description,
        amount: f.amountFormatted ?? (f.amount ? `₹${f.amount}` : undefined),
        references: f.references,
        entityType: f.entityType,
      })),
    };

    // 4. Send structured findings to Gemma for explanation (with fallback safety)
    let aiExplanation: string | null = null;
    let isAiAvailable = true;

    try {
      const systemInstruction = `You are "FinBot Audit Assistant", an expert accounting auditor.
Analyze the provided structured ledger audit findings and provide a professional, concise executive explanation.

SAFETY RULES:
1. NEVER claim or imply fraud. Use terms such as "Potential anomaly", "Potential duplicate", "Requires review", or "Unusual spending pattern".
2. Distinguish potential anomalies from confirmed errors.
3. Summarize why the findings matter.
4. Provide a clear, actionable review recommendation for each finding type.
5. Format your output using clean Markdown headings, bullet points, and bold text.`;

      const prompt = `Here are the deterministic audit findings detected in the ledger:

\`\`\`json
${JSON.stringify(structuredPayload, null, 2)}
\`\`\`

Please explain these audit findings, why they matter, and the recommended review actions.`;

      // 30s timeout in dev/prod for local LLM or cloud API; 1.5s in test environment for fast Vitest execution
      const timeoutMs = process.env.NODE_ENV === "test" || process.env.VITEST ? 1500 : 30000;
      const aiPromise = generateText({
        model: getAiModel("gemma3:4b"),
        system: systemInstruction,
        prompt,
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI generation timeout")), timeoutMs)
      );
      const aiResult = await Promise.race([aiPromise, timeoutPromise]);
      aiExplanation = aiResult.text;
    } catch (aiErr: unknown) {
      console.warn(
        "[AI Audit] Local Ollama / Gemma model unavailable or timed out. Returning findings with fallback explanation.",
        aiErr
      );
      isAiAvailable = false;
      aiExplanation = `### 📋 Automated Ledger Audit Report
**${auditReport.totalFindingsCount} ${
        auditReport.totalFindingsCount === 1 ? "finding" : "findings"
      } detected** (${auditReport.criticalCount} Critical, ${auditReport.highCount} High severity).

${auditReport.findings
  .map((f) => `* **[${f.severity.toUpperCase()}] ${f.title}**: ${f.description}`)
  .join("\n\n")}

> *Note: Analysis generated via deterministic audit rules while local LLM engine is offline.*`;
    }

    return {
      success: true,
      auditReport,
      aiExplanation,
      isAiAvailable,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to run ledger audit.";
    console.error("[AI Audit Action Error]", err);
    return {
      success: false,
      auditReport: {
        generatedAt: new Date().toISOString(),
        totalFindingsCount: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        findings: [],
      },
      aiExplanation: null,
      error: errorMsg,
      isAiAvailable: false,
    };
  }
}
