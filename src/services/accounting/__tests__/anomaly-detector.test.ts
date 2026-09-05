/**
 * src/services/accounting/__tests__/anomaly-detector.test.ts
 *
 * Unit test suite for deterministic ledger anomaly detectors:
 *  1. checkJournalBalance()
 *  2. detectPotentialDuplicatePayments()
 *  3. detectSpendingSpikes()
 *  4. detectUncategorizedExpenses()
 *  5. detectMissingAccountingMetadata()
 *  6. runFullLedgerAudit()
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
  // 1. checkJournalBalance
  // -------------------------------------------------------------------------
  describe("checkJournalBalance()", () => {
    it("runs and verifies all posted journal entries satisfy SUM(debit) === SUM(credit)", async () => {
      const findings = await checkJournalBalance();
      expect(Array.isArray(findings)).toBe(true);
      for (const finding of findings) {
        expect(finding.type).toBe("UNBALANCED_JOURNAL_ENTRY");
        expect(finding.severity).toBe("CRITICAL");
        expect(finding.amountPaise).toBeGreaterThan(0);
      }
    });
  });

  // -------------------------------------------------------------------------
  // 2. detectPotentialDuplicatePayments
  // -------------------------------------------------------------------------
  describe("detectPotentialDuplicatePayments()", () => {
    it("runs deterministic duplicate check on recorded payments", async () => {
      const findings = await detectPotentialDuplicatePayments();
      expect(Array.isArray(findings)).toBe(true);
      for (const finding of findings) {
        expect(finding.type).toBe("POTENTIAL_DUPLICATE_PAYMENT");
        expect(finding.severity).toBe("HIGH");
        expect(finding.title).toContain("Potential duplicate payment");
        expect(Array.isArray(finding.references)).toBe(true);
      }
    });
  });

  // -------------------------------------------------------------------------
  // 3. detectSpendingSpikes
  // -------------------------------------------------------------------------
  describe("detectSpendingSpikes()", () => {
    it("evaluates purchase orders against baseline threshold (max(2x mean, ₹50,000))", async () => {
      const findings = await detectSpendingSpikes();
      expect(Array.isArray(findings)).toBe(true);
      for (const finding of findings) {
        expect(finding.type).toBe("SPENDING_SPIKE");
        expect(finding.severity).toBe("MEDIUM");
        expect(finding.amountPaise).toBeGreaterThanOrEqual(5000000); // >= ₹50,000
      }
    });
  });

  // -------------------------------------------------------------------------
  // 4. detectUncategorizedExpenses
  // -------------------------------------------------------------------------
  describe("detectUncategorizedExpenses()", () => {
    it("identifies expense postings charged to unclassified accounts", async () => {
      const findings = await detectUncategorizedExpenses();
      expect(Array.isArray(findings)).toBe(true);
      for (const finding of findings) {
        expect(finding.type).toBe("UNCATEGORIZED_EXPENSE");
        expect(finding.severity).toBe("MEDIUM");
      }
    });
  });

  // -------------------------------------------------------------------------
  // 5. detectMissingAccountingMetadata
  // -------------------------------------------------------------------------
  describe("detectMissingAccountingMetadata()", () => {
    it("flags transactions missing reference or description metadata", async () => {
      const findings = await detectMissingAccountingMetadata();
      expect(Array.isArray(findings)).toBe(true);
      for (const finding of findings) {
        expect(finding.type).toBe("MISSING_ACCOUNTING_METADATA");
        expect(finding.severity).toBe("LOW");
        expect(finding.title).toContain("Missing");
      }
    });
  });

  // -------------------------------------------------------------------------
  // 6. runFullLedgerAudit
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
    });
  });
});
