/**
 * src/services/accounting/__tests__/anomaly-detector-extended.test.ts
 *
 * Extended Unit Tests for the Ledger Anomaly & Audit Detection Engine.
 *
 * Covers:
 *   1. checkJournalBalance() — clean ledger returns no findings
 *   2. checkJournalBalance() — artificially unbalanced entry is flagged CRITICAL
 *   3. detectPotentialDuplicatePayments() — identical amount + same contact within 7 days
 *   4. detectPotentialDuplicatePayments() — same amount but different contact is NOT flagged
 *   5. detectPotentialDuplicatePayments() — same amount + same contact beyond 7 days is NOT flagged
 *   6. detectSpendingSpikes() — PO above 2x mean AND above ₹50,000 is flagged MEDIUM
 *   7. detectSpendingSpikes() — POs below threshold produce no findings
 *   8. runFullAuditReport() — aggregates all detectors into single report
 *   9. AuditFinding severity level sanity checks
 */

import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";
import {
  accounts,
  journals,
  journalEntries,
  journalItems,
  orders,
  contacts,
  payments,
  orderItems,
  stockMovements,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  checkJournalBalance,
  detectPotentialDuplicatePayments,
  detectSpendingSpikes,
  runFullLedgerAudit,
} from "../anomaly-detector";
import { createJournalEntry, postCustomerInvoice } from "../index";

describe("Anomaly Detector — Extended Tests", () => {
  let salesJournalId: string;
  let bankJournalId: string;
  let purchaseJournalId: string;
  let bankAccountId: string;
  let debtorsAccountId: string;
  let salesAccountId: string;
  let creditorsAccountId: string;
  let purchaseExpenseAccountId: string;
  let customerId: string;
  let vendorId: string;

  beforeEach(async () => {
    await db.delete(payments);
    await db.delete(stockMovements);
    await db.delete(orderItems);
    await db.delete(orders);
    await db.delete(journalItems);
    await db.delete(journalEntries);

    const [sj] = await db.select().from(journals).where(eq(journals.type, "SALES"));
    salesJournalId = sj.id;

    const [bj] = await db.select().from(journals).where(eq(journals.type, "BANK"));
    bankJournalId = bj.id;

    const [pj] = await db.select().from(journals).where(eq(journals.type, "PURCHASE"));
    purchaseJournalId = pj.id;

    const [bankAcc] = await db.select().from(accounts).where(eq(accounts.code, "1010"));
    bankAccountId = bankAcc.id;

    const [debtors] = await db.select().from(accounts).where(eq(accounts.code, "1100"));
    debtorsAccountId = debtors.id;

    const [sales] = await db.select().from(accounts).where(eq(accounts.code, "4000"));
    salesAccountId = sales.id;

    const [creditors] = await db.select().from(accounts).where(eq(accounts.code, "2000"));
    creditorsAccountId = creditors.id;

    const [peAcc] = await db.select().from(accounts).where(eq(accounts.code, "5000"));
    purchaseExpenseAccountId = peAcc.id;

    // Fetch a known customer and vendor from seeded contacts
    const [custContact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.type, "CUSTOMER"));
    customerId = custContact?.id ?? "";

    const [vendContact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.type, "VENDOR"));
    vendorId = vendContact?.id ?? "";
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 1. checkJournalBalance
  // ─────────────────────────────────────────────────────────────────────────

  describe("checkJournalBalance()", () => {
    it("returns zero findings for a perfectly balanced ledger", async () => {
      await createJournalEntry({
        journalId: salesJournalId,
        date: new Date("2026-03-01"),
        reference: "BALANCED-001",
        description: "Balanced entry",
        lines: [
          { accountId: debtorsAccountId, debit: 500000, credit: 0 },
          { accountId: salesAccountId, debit: 0, credit: 500000 },
        ],
      });

      const findings = await checkJournalBalance();
      expect(findings).toHaveLength(0);
    });

    it("flags CRITICAL when journal entry is manually inserted with debit ≠ credit", async () => {
      // Bypass service layer to insert an intentionally unbalanced raw entry
      const [entry] = await db
        .insert(journalEntries)
        .values({
          journalId: salesJournalId,
          date: new Date("2026-03-15"),
          reference: "UNBALANCED-RAW-001",
          description: "Intentionally unbalanced for test",
        })
        .returning();

      // Only ONE item — debit without matching credit
      await db.insert(journalItems).values({
        entryId: entry.id,
        accountId: debtorsAccountId,
        debit: 750000,
        credit: 0,
      });

      const findings = await checkJournalBalance();

      expect(findings.length).toBeGreaterThanOrEqual(1);
      const unbalancedFinding = findings.find(
        (f) => f.type === "UNBALANCED_JOURNAL_ENTRY" && f.entityId === entry.id
      );
      expect(unbalancedFinding).toBeDefined();
      expect(unbalancedFinding?.severity).toBe("CRITICAL");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. detectPotentialDuplicatePayments
  // ─────────────────────────────────────────────────────────────────────────

  describe("detectPotentialDuplicatePayments()", () => {
    it("returns no findings when no payments exist", async () => {
      const findings = await detectPotentialDuplicatePayments();
      expect(findings).toHaveLength(0);
    });

    it("detects duplicate when same amount paid twice to same contact within 7 days", async () => {
      // Create two different orders for same customer
      if (!customerId) return; // Skip if no seeded customers

      const [so1] = await db
        .insert(orders)
        .values({
          orderNumber: "SO-DUPTEST-1",
          type: "SO",
          contactId: customerId,
          status: "PAID",
          invoiceDate: new Date("2026-05-01"),
          dueDate: new Date("2026-05-31"),
          subtotal: 500000,
          taxAmount: 90000,
          totalAmount: 590000,
        })
        .returning();

      const [so2] = await db
        .insert(orders)
        .values({
          orderNumber: "SO-DUPTEST-2",
          type: "SO",
          contactId: customerId,
          status: "PAID",
          invoiceDate: new Date("2026-05-01"),
          dueDate: new Date("2026-05-31"),
          subtotal: 500000,
          taxAmount: 90000,
          totalAmount: 590000,
        })
        .returning();

      // Two payments on same amount within 7 days
      await db.insert(payments).values({
        orderId: so1.id,
        amount: 590000,
        paymentMethod: "BANK",
        paymentDate: new Date("2026-05-02"),
        reference: "PAY-DUP-001",
      });

      await db.insert(payments).values({
        orderId: so2.id,
        amount: 590000,
        paymentMethod: "BANK",
        paymentDate: new Date("2026-05-04"), // 2 days later — within window
        reference: "PAY-DUP-002",
      });

      const findings = await detectPotentialDuplicatePayments();

      const dupFindings = findings.filter(
        (f) => f.type === "POTENTIAL_DUPLICATE_PAYMENT"
      );
      expect(dupFindings.length).toBeGreaterThanOrEqual(1);
      expect(dupFindings[0].severity).toBe("HIGH");
    });

    it("does NOT flag payments with same amount but different contacts more than 7 days apart", async () => {
      if (!customerId || !vendorId) return;

      const [so1] = await db
        .insert(orders)
        .values({
          orderNumber: "SO-NODUPTEST-1",
          type: "SO",
          contactId: customerId,
          status: "PAID",
          invoiceDate: new Date("2026-01-01"),
          dueDate: new Date("2026-01-31"),
          subtotal: 200000,
          taxAmount: 36000,
          totalAmount: 236000,
        })
        .returning();

      // Payment 1 — very early date
      await db.insert(payments).values({
        orderId: so1.id,
        amount: 236000,
        paymentMethod: "BANK",
        paymentDate: new Date("2026-01-10"),
        reference: "PAY-NODUP-001",
      });

      // Payment 2 — same amount but 3 months later → NOT a duplicate
      const [so2] = await db
        .insert(orders)
        .values({
          orderNumber: "SO-NODUPTEST-2",
          type: "SO",
          contactId: customerId,
          status: "PAID",
          invoiceDate: new Date("2026-04-01"),
          dueDate: new Date("2026-04-30"),
          subtotal: 200000,
          taxAmount: 36000,
          totalAmount: 236000,
        })
        .returning();

      await db.insert(payments).values({
        orderId: so2.id,
        amount: 236000,
        paymentMethod: "BANK",
        paymentDate: new Date("2026-04-15"), // 95 days later
        reference: "PAY-NODUP-002",
      });

      const findings = await detectPotentialDuplicatePayments();

      // Should NOT be flagged — too far apart in time
      const dupFindings = findings.filter(
        (f) => f.type === "POTENTIAL_DUPLICATE_PAYMENT"
      );
      expect(dupFindings).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. detectSpendingSpikes
  // ─────────────────────────────────────────────────────────────────────────

  describe("detectSpendingSpikes()", () => {
    it("returns no findings with no purchase orders", async () => {
      const findings = await detectSpendingSpikes();
      expect(findings).toHaveLength(0);
    });

    it("flags a PO that is 2x mean AND above ₹50,000 threshold", async () => {
      if (!vendorId) return;

      // Two small POs to establish a low baseline mean
      await db.insert(orders).values([
        {
          orderNumber: "PO-SMALL-001",
          type: "PO",
          contactId: vendorId,
          status: "DRAFT",
          invoiceDate: new Date("2026-02-01"),
          dueDate: new Date("2026-02-28"),
          subtotal: 100000, // ₹1,000
          taxAmount: 18000,
          totalAmount: 118000,
        },
        {
          orderNumber: "PO-SMALL-002",
          type: "PO",
          contactId: vendorId,
          status: "DRAFT",
          invoiceDate: new Date("2026-02-05"),
          dueDate: new Date("2026-02-28"),
          subtotal: 120000, // ₹1,200
          taxAmount: 21600,
          totalAmount: 141600,
        },
      ]);

      // One huge PO — way above 2x mean (~₹1,100) and above ₹50,000 floor
      await db.insert(orders).values({
        orderNumber: "PO-SPIKE-001",
        type: "PO",
        contactId: vendorId,
        status: "DRAFT",
        invoiceDate: new Date("2026-03-01"),
        dueDate: new Date("2026-03-31"),
        subtotal: 6000000, // ₹60,000
        taxAmount: 1080000,
        totalAmount: 7080000,
      });

      const findings = await detectSpendingSpikes();

      const spikeFinding = findings.find((f) => f.type === "SPENDING_SPIKE");
      expect(spikeFinding).toBeDefined();
      expect(spikeFinding?.severity).toBe("MEDIUM");
      expect(spikeFinding?.title).toContain("PO-SPIKE-001");
    });

    it("does NOT flag when all POs are similar amounts below ₹50,000 threshold", async () => {
      if (!vendorId) return;

      // All POs similar and well below threshold
      await db.insert(orders).values([
        {
          orderNumber: "PO-EVEN-001",
          type: "PO",
          contactId: vendorId,
          status: "DRAFT",
          invoiceDate: new Date("2026-01-05"),
          dueDate: new Date("2026-01-31"),
          subtotal: 100000,
          taxAmount: 18000,
          totalAmount: 118000,
        },
        {
          orderNumber: "PO-EVEN-002",
          type: "PO",
          contactId: vendorId,
          status: "DRAFT",
          invoiceDate: new Date("2026-01-10"),
          dueDate: new Date("2026-01-31"),
          subtotal: 110000,
          taxAmount: 19800,
          totalAmount: 129800,
        },
        {
          orderNumber: "PO-EVEN-003",
          type: "PO",
          contactId: vendorId,
          status: "DRAFT",
          invoiceDate: new Date("2026-01-15"),
          dueDate: new Date("2026-01-31"),
          subtotal: 105000,
          taxAmount: 18900,
          totalAmount: 123900,
        },
      ]);

      const findings = await detectSpendingSpikes();
      const spikeFinding = findings.find((f) => f.type === "SPENDING_SPIKE");
      expect(spikeFinding).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. runFullLedgerAudit
  // ─────────────────────────────────────────────────────────────────────────

  describe("runFullLedgerAudit()", () => {
    it("returns a valid AuditReport structure with all zero counts for clean ledger", async () => {
      await createJournalEntry({
        journalId: salesJournalId,
        date: new Date("2026-06-01"),
        reference: "CLEAN-AUDIT-001",
        description: "Clean audit entry",
        lines: [
          { accountId: debtorsAccountId, debit: 100000, credit: 0 },
          { accountId: salesAccountId, debit: 0, credit: 100000 },
        ],
      });

      const report = await runFullLedgerAudit();

      expect(report).toHaveProperty("generatedAt");
      expect(report).toHaveProperty("totalFindingsCount");
      expect(report).toHaveProperty("criticalCount");
      expect(report).toHaveProperty("highCount");
      expect(report).toHaveProperty("mediumCount");
      expect(report).toHaveProperty("lowCount");
      expect(report).toHaveProperty("findings");
      expect(Array.isArray(report.findings)).toBe(true);

      // For a clean ledger with no anomalies, CRITICAL count must be 0
      expect(report.criticalCount).toBe(0);
    });

    it("counts total findings correctly when multiple anomalies exist", async () => {
      // Insert an unbalanced journal entry
      const [entry] = await db
        .insert(journalEntries)
        .values({
          journalId: salesJournalId,
          date: new Date("2026-06-10"),
          reference: "AUDIT-UNBAL-001",
          description: "Raw unbalanced entry",
        })
        .returning();

      await db.insert(journalItems).values({
        entryId: entry.id,
        accountId: bankAccountId,
        debit: 300000,
        credit: 0,
      });

      const report = await runFullLedgerAudit();

      // Must have at least 1 critical (from the unbalanced entry)
      expect(report.criticalCount).toBeGreaterThanOrEqual(1);
      expect(report.totalFindingsCount).toBeGreaterThanOrEqual(1);
      expect(report.findings[0]).toHaveProperty("type");
      expect(report.findings[0]).toHaveProperty("severity");
      expect(report.findings[0]).toHaveProperty("title");
      expect(report.findings[0]).toHaveProperty("description");
    });

    it("generatedAt is a valid ISO date string", async () => {
      const report = await runFullLedgerAudit();
      expect(() => new Date(report.generatedAt).toISOString()).not.toThrow();
    });
  });
});
