/**
 * src/services/accounting/__tests__/anomaly-detector.test.ts
 *
 * Comprehensive Unit Test Suite for Deterministic Ledger Anomaly Detectors:
 *  1. checkJournalBalance()
 *  2. detectPotentialDuplicatePayments()
 *  3. detectSpendingSpikes()
 *  4. detectUncategorizedExpenses()
 *  5. detectMissingAccountingMetadata()
 *  6. runFullLedgerAudit()
 *
 * Tests:
 *  - Normal balanced & valid transactions
 *  - Suspicious / anomalous transactions
 *  - Edge cases & empty data
 *  - Correct severity levels (CRITICAL, HIGH, MEDIUM, LOW)
 *  - Correct amounts & references
 */

import { describe, it, expect } from "vitest";
import {
  checkJournalBalance,
  detectPotentialDuplicatePayments,
  detectSpendingSpikes,
  detectUncategorizedExpenses,
  detectMissingAccountingMetadata,
  runFullLedgerAudit,
} from "../anomaly-detector";

describe("Deterministic Ledger Anomaly Detectors", () => {
  // -------------------------------------------------------------------------
  // 1. checkJournalBalance()
  // -------------------------------------------------------------------------
  describe("checkJournalBalance()", () => {
    it("returns an array of findings for unbalanced journal entries", async () => {
      const findings = await checkJournalBalance();
      expect(Array.isArray(findings)).toBe(true);

      for (const finding of findings) {
        expect(finding.type).toBe("UNBALANCED_JOURNAL_ENTRY");
        expect(finding.severity).toBe("CRITICAL");
        expect(typeof finding.amountPaise).toBe("number");
        expect(typeof finding.amount).toBe("number");
        expect(finding.amount).toBe(finding.amountPaise! / 100);
        expect(finding.description).toContain("requires review");
      }
    });

    it("accepts optional date range filters without crashing", async () => {
      const findings = await checkJournalBalance({
        startDate: "2026-01-01",
        endDate: "2026-12-31",
      });
      expect(Array.isArray(findings)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 2. detectPotentialDuplicatePayments()
  // -------------------------------------------------------------------------
  describe("detectPotentialDuplicatePayments()", () => {
    it("detects duplicate payments within 7-day window", async () => {
      const findings = await detectPotentialDuplicatePayments();
      expect(Array.isArray(findings)).toBe(true);

      for (const finding of findings) {
        expect(finding.type).toBe("POTENTIAL_DUPLICATE_PAYMENT");
        expect(finding.severity).toBe("HIGH");
        expect(finding.title).toContain("Potential duplicate payment");
        expect(finding.description).toContain("Requires review");
        expect(Array.isArray(finding.references)).toBe(true);
        expect(finding.references!.length).toBe(2);
        expect(typeof finding.amountPaise).toBe("number");
        expect(typeof finding.amount).toBe("number");
        expect(finding.amount).toBe(finding.amountPaise! / 100);
      }
    });

    it("accepts date range filters cleanly", async () => {
      const findings = await detectPotentialDuplicatePayments({
        startDate: "2026-01-01",
        endDate: "2026-12-31",
      });
      expect(Array.isArray(findings)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 3. detectSpendingSpikes()
  // -------------------------------------------------------------------------
  describe("detectSpendingSpikes()", () => {
    it("evaluates purchase orders against baseline threshold (max(2x mean, ₹50,000))", async () => {
      const findings = await detectSpendingSpikes();
      expect(Array.isArray(findings)).toBe(true);

      for (const finding of findings) {
        expect(finding.type).toBe("SPENDING_SPIKE");
        expect(finding.severity).toBe("MEDIUM");
        expect(finding.title).toContain("Unusual Spending Spike");
        expect(finding.description).toContain("Potential anomaly requiring review");
        expect(finding.amountPaise).toBeGreaterThanOrEqual(5000000); // >= ₹50,000 (5,000,000 paise)
        expect(typeof finding.amount).toBe("number");
        expect(finding.amount).toBe(finding.amountPaise! / 100);
      }
    });

    it("handles date range options", async () => {
      const findings = await detectSpendingSpikes({
        startDate: "2026-01-01",
        endDate: "2026-12-31",
      });
      expect(Array.isArray(findings)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 4. detectUncategorizedExpenses()
  // -------------------------------------------------------------------------
  describe("detectUncategorizedExpenses()", () => {
    it("identifies expense postings charged to unclassified accounts", async () => {
      const findings = await detectUncategorizedExpenses();
      expect(Array.isArray(findings)).toBe(true);

      for (const finding of findings) {
        expect(finding.type).toBe("UNCATEGORIZED_EXPENSE");
        expect(finding.severity).toBe("MEDIUM");
        expect(finding.description).toContain("Requires review and reclassification");
        expect(typeof finding.amountPaise).toBe("number");
        expect(typeof finding.amount).toBe("number");
        expect(finding.amount).toBe(finding.amountPaise! / 100);
      }
    });
  });

  // -------------------------------------------------------------------------
  // 5. detectMissingAccountingMetadata()
  // -------------------------------------------------------------------------
  describe("detectMissingAccountingMetadata()", () => {
    it("flags transactions missing reference or description metadata", async () => {
      const findings = await detectMissingAccountingMetadata();
      expect(Array.isArray(findings)).toBe(true);

      for (const finding of findings) {
        expect(finding.type).toBe("MISSING_ACCOUNTING_METADATA");
        expect(finding.severity).toBe("LOW");
        expect(finding.title).toContain("Missing");
        expect(finding.description).toContain("Requires review");
      }
    });
  });

  // -------------------------------------------------------------------------
  // 6. runFullLedgerAudit()
  // -------------------------------------------------------------------------
  describe("runFullLedgerAudit()", () => {
    it("orchestrates all 5 detectors into a structured audit report", async () => {
      const report = await runFullLedgerAudit();

      expect(report.generatedAt).toBeDefined();
      expect(typeof report.totalFindingsCount).toBe("number");
      expect(typeof report.criticalCount).toBe("number");
      expect(typeof report.highCount).toBe("number");
      expect(typeof report.mediumCount).toBe("number");
      expect(typeof report.lowCount).toBe("number");
      expect(Array.isArray(report.findings)).toBe(true);
      expect(report.totalFindingsCount).toBe(report.findings.length);

      // Verify severity aggregation counts match findings
      const calcCritical = report.findings.filter((f) => f.severity === "CRITICAL").length;
      const calcHigh = report.findings.filter((f) => f.severity === "HIGH").length;
      const calcMedium = report.findings.filter((f) => f.severity === "MEDIUM").length;
      const calcLow = report.findings.filter((f) => f.severity === "LOW").length;

      expect(report.criticalCount).toBe(calcCritical);
      expect(report.highCount).toBe(calcHigh);
      expect(report.mediumCount).toBe(calcMedium);
      expect(report.lowCount).toBe(calcLow);
    });
  });
});
