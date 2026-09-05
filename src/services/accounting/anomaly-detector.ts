/**
 * src/services/accounting/anomaly-detector.ts
 *
 * Deterministic Ledger Anomaly & Audit Detection Engine.
 *
 * Rules:
 *  - 100% deterministic TypeScript/Database logic — no AI calls inside detectors.
 *  - Reusable by Dashboard, AI Tools, Audit UI, and Unit Tests.
 *  - Strict financial types with Severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL".
 */

import { db } from "@/db";
import {
  journalEntries,
  journalItems,
  payments,
  orders,
  contacts,
  accounts,
} from "@/db/schema";
import { eq, and, gte, lte, asc, desc } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Types & Schema
// ---------------------------------------------------------------------------

export type AnomalySeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AuditFinding {
  type:
    | "UNBALANCED_JOURNAL_ENTRY"
    | "POTENTIAL_DUPLICATE_PAYMENT"
    | "SPENDING_SPIKE"
    | "UNCATEGORIZED_EXPENSE"
    | "MISSING_ACCOUNTING_METADATA";
  severity: AnomalySeverity;
  title: string;
  description: string;
  amount?: number;
  amountPaise?: number;
  amountFormatted?: string;
  references?: string[];
  entityId?: string;
  entityType?: "JOURNAL_ENTRY" | "PAYMENT" | "ORDER" | "ACCOUNT";
  createdAt?: string;
}

export interface AuditReportOptions {
  startDate?: string;
  endDate?: string;
}

export interface AuditReport {
  generatedAt: string;
  totalFindingsCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  findings: AuditFinding[];
}

/** Format paise integer to human-readable INR string (₹). */
function formatINR(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(rupees);
}

// ---------------------------------------------------------------------------
// 1. Detector: checkJournalBalance()
// ---------------------------------------------------------------------------

export async function checkJournalBalance(
  options: AuditReportOptions = {}
): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];
  const conditions = [];

  if (options.startDate) {
    conditions.push(gte(journalEntries.date, new Date(options.startDate)));
  }
  if (options.endDate) {
    const end = new Date(options.endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(journalEntries.date, end));
  }

  const entries = await db
    .select({
      id: journalEntries.id,
      date: journalEntries.date,
      reference: journalEntries.reference,
      description: journalEntries.description,
    })
    .from(journalEntries)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(journalEntries.date));

  for (const entry of entries) {
    const items = await db
      .select({ debit: journalItems.debit, credit: journalItems.credit })
      .from(journalItems)
      .where(eq(journalItems.entryId, entry.id));

    let totalDebit = 0;
    let totalCredit = 0;
    for (const item of items) {
      totalDebit += item.debit;
      totalCredit += item.credit;
    }

    const diff = Math.abs(totalDebit - totalCredit);
    const dateStr = new Date(entry.date).toISOString().split("T")[0];
    const refStr = entry.reference ? `Ref: ${entry.reference}` : `ID: ${entry.id.substring(0, 8)}`;

    if (diff !== 0) {
      findings.push({
        type: "UNBALANCED_JOURNAL_ENTRY",
        severity: "CRITICAL",
        title: `Unbalanced Journal Entry (${refStr})`,
        description: `Journal entry on ${dateStr} requires review. Total Debit: ${formatINR(
          totalDebit
        )}, Total Credit: ${formatINR(totalCredit)}. Imbalance difference: ${formatINR(diff)}.`,
        amount: diff / 100,
        amountPaise: diff,
        amountFormatted: formatINR(diff),
        entityId: entry.id,
        entityType: "JOURNAL_ENTRY",
        createdAt: dateStr,
      });
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// 2. Detector: detectPotentialDuplicatePayments()
// ---------------------------------------------------------------------------

export async function detectPotentialDuplicatePayments(
  options: AuditReportOptions = {}
): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];
  const conditions = [];

  if (options.startDate) {
    conditions.push(gte(payments.paymentDate, new Date(options.startDate)));
  }
  if (options.endDate) {
    const end = new Date(options.endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(payments.paymentDate, end));
  }

  const allPayments = await db
    .select({
      id: payments.id,
      orderId: payments.orderId,
      amount: payments.amount,
      paymentMethod: payments.paymentMethod,
      paymentDate: payments.paymentDate,
      reference: payments.reference,
      contactId: orders.contactId,
      contactName: contacts.name,
      orderNumber: orders.orderNumber,
    })
    .from(payments)
    .innerJoin(orders, eq(payments.orderId, orders.id))
    .leftJoin(contacts, eq(orders.contactId, contacts.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(payments.paymentDate));

  const windowMs = 7 * 24 * 60 * 60 * 1000; // 7 days window
  const flaggedPairs = new Set<string>();

  for (let i = 0; i < allPayments.length; i++) {
    for (let j = i + 1; j < allPayments.length; j++) {
      const p1 = allPayments[i];
      const p2 = allPayments[j];

      // Match conditions: same amount, same party / order, close date (within 7 days)
      const sameAmount = p1.amount === p2.amount && p1.amount > 0;
      const samePartyOrOrder = p1.contactId === p2.contactId || p1.orderId === p2.orderId;
      const timeDiff = Math.abs(new Date(p1.paymentDate).getTime() - new Date(p2.paymentDate).getTime());
      const closeInTime = timeDiff <= windowMs;

      if (sameAmount && samePartyOrOrder && closeInTime) {
        const pairKey = [p1.id, p2.id].sort().join("-");
        if (!flaggedPairs.has(pairKey)) {
          flaggedPairs.add(pairKey);

          const date1 = new Date(p1.paymentDate).toISOString().split("T")[0];
          const date2 = new Date(p2.paymentDate).toISOString().split("T")[0];
          const partyName = p1.contactName ?? p1.orderNumber;

          findings.push({
            type: "POTENTIAL_DUPLICATE_PAYMENT",
            severity: "HIGH",
            title: `Potential duplicate payment detected (${partyName})`,
            description: `Potential duplicate payment of ${formatINR(
              p1.amount
            )} recorded for '${partyName}' on ${date1} and ${date2} (within ${Math.round(
              timeDiff / (1000 * 60 * 60 * 24)
            )} days). Requires review.`,
            amount: p1.amount / 100,
            amountPaise: p1.amount,
            amountFormatted: formatINR(p1.amount),
            references: [p1.id, p2.id],
            entityId: p2.id,
            entityType: "PAYMENT",
            createdAt: date2,
          });
        }
      }
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// 3. Detector: detectSpendingSpikes()
// ---------------------------------------------------------------------------

export async function detectSpendingSpikes(
  options: AuditReportOptions = {}
): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];

  // Deterministic rule:
  // 1. Fetch all purchase orders (PO)
  // 2. Compute baseline mean amount
  // 3. Flag purchase orders where amount > max(2.0 * mean, ₹50,000 [5,000,000 paise])
  const allPos = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      totalAmount: orders.totalAmount,
      invoiceDate: orders.invoiceDate,
      contactName: contacts.name,
    })
    .from(orders)
    .leftJoin(contacts, eq(orders.contactId, contacts.id))
    .where(eq(orders.type, "PO"))
    .orderBy(desc(orders.createdAt));

  if (allPos.length === 0) return findings;

  const totalSpentAll = allPos.reduce((sum, po) => sum + po.totalAmount, 0);
  const meanPoAmount = Math.round(totalSpentAll / allPos.length);

  // Threshold: at least 2x mean AND at least ₹50,000 (5,000,000 paise)
  const spikeThresholdPaise = Math.max(meanPoAmount * 2, 5000000);

  for (const po of allPos) {
    if (po.totalAmount >= spikeThresholdPaise) {
      const dateStr = po.invoiceDate
        ? new Date(po.invoiceDate).toISOString().split("T")[0]
        : "N/A";
      const partyName = po.contactName ?? "Vendor";
      const ratio = meanPoAmount > 0 ? (po.totalAmount / meanPoAmount).toFixed(1) : "2.0";

      // Filter by date range if specified
      if (options.startDate && po.invoiceDate && new Date(po.invoiceDate) < new Date(options.startDate)) {
        continue;
      }
      if (options.endDate && po.invoiceDate && new Date(po.invoiceDate) > new Date(options.endDate)) {
        continue;
      }

      findings.push({
        type: "SPENDING_SPIKE",
        severity: "MEDIUM",
        title: `Unusual Spending Spike (${po.orderNumber})`,
        description: `Purchase Order '${po.orderNumber}' to '${partyName}' for ${formatINR(
          po.totalAmount
        )} is ${ratio}x higher than the average purchase order baseline (${formatINR(
          meanPoAmount
        )}). Potential anomaly requiring review.`,
        amount: po.totalAmount / 100,
        amountPaise: po.totalAmount,
        amountFormatted: formatINR(po.totalAmount),
        entityId: po.id,
        entityType: "ORDER",
        createdAt: dateStr,
      });
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// 4. Detector: detectUncategorizedExpenses()
// ---------------------------------------------------------------------------

export async function detectUncategorizedExpenses(
  options: AuditReportOptions = {}
): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];

  const expenseItems = await db
    .select({
      itemId: journalItems.id,
      entryId: journalItems.entryId,
      accountId: journalItems.accountId,
      accountCode: accounts.code,
      accountName: accounts.name,
      debit: journalItems.debit,
      analyticAccountId: journalItems.analyticAccountId,
      date: journalEntries.date,
      reference: journalEntries.reference,
    })
    .from(journalItems)
    .innerJoin(accounts, eq(journalItems.accountId, accounts.id))
    .innerJoin(journalEntries, eq(journalItems.entryId, journalEntries.id))
    .where(eq(accounts.type, "EXPENSE"));

  for (const item of expenseItems) {
    if (item.debit <= 0) continue;

    // Filter by date range if specified
    if (options.startDate && new Date(item.date) < new Date(options.startDate)) continue;
    if (options.endDate && new Date(item.date) > new Date(options.endDate)) continue;

    const lowerName = item.accountName.toLowerCase();
    const isUnclassifiedAccount =
      item.accountCode === "5999" ||
      lowerName.includes("uncategorized") ||
      lowerName.includes("suspense") ||
      lowerName.includes("miscellaneous");

    if (isUnclassifiedAccount) {
      const dateStr = new Date(item.date).toISOString().split("T")[0];

      findings.push({
        type: "UNCATEGORIZED_EXPENSE",
        severity: "MEDIUM",
        title: `Uncategorized Expense Posting (${item.accountCode} - ${item.accountName})`,
        description: `Expense debit of ${formatINR(
          item.debit
        )} on ${dateStr} was charged to generic account '${item.accountCode} - ${
          item.accountName
        }'. Requires review and reclassification.`,
        amount: item.debit / 100,
        amountPaise: item.debit,
        amountFormatted: formatINR(item.debit),
        entityId: item.entryId,
        entityType: "JOURNAL_ENTRY",
        createdAt: dateStr,
      });
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// 5. Detector: detectMissingAccountingMetadata()
// ---------------------------------------------------------------------------

export async function detectMissingAccountingMetadata(
  options: AuditReportOptions = {}
): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];

  const entries = await db
    .select({
      id: journalEntries.id,
      date: journalEntries.date,
      reference: journalEntries.reference,
      description: journalEntries.description,
    })
    .from(journalEntries);

  for (const entry of entries) {
    if (options.startDate && new Date(entry.date) < new Date(options.startDate)) continue;
    if (options.endDate && new Date(entry.date) > new Date(options.endDate)) continue;

    const hasRef = entry.reference && entry.reference.trim().length > 0;
    const hasDesc = entry.description && entry.description.trim().length > 0;

    if (!hasRef || !hasDesc) {
      const dateStr = new Date(entry.date).toISOString().split("T")[0];
      const missingFields = [];
      if (!hasRef) missingFields.push("Reference Number");
      if (!hasDesc) missingFields.push("Transaction Description");

      findings.push({
        type: "MISSING_ACCOUNTING_METADATA",
        severity: "LOW",
        title: `Missing Metadata on Journal Entry (${entry.id.substring(0, 8)})`,
        description: `Journal entry posted on ${dateStr} is missing required audit metadata: ${missingFields.join(
          ", "
        )}. Requires review.`,
        entityId: entry.id,
        entityType: "JOURNAL_ENTRY",
        createdAt: dateStr,
      });
    }
  }

  const allPayments = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      paymentDate: payments.paymentDate,
      reference: payments.reference,
    })
    .from(payments);

  for (const p of allPayments) {
    if (options.startDate && new Date(p.paymentDate) < new Date(options.startDate)) continue;
    if (options.endDate && new Date(p.paymentDate) > new Date(options.endDate)) continue;

    if (!p.reference || p.reference.trim().length === 0) {
      const dateStr = new Date(p.paymentDate).toISOString().split("T")[0];

      findings.push({
        type: "MISSING_ACCOUNTING_METADATA",
        severity: "LOW",
        title: `Missing External Reference on Payment (${formatINR(p.amount)})`,
        description: `Payment of ${formatINR(
          p.amount
        )} posted on ${dateStr} is missing external reference (bank UTR, cheque, or transaction ID). Requires review.`,
        amount: p.amount / 100,
        amountPaise: p.amount,
        amountFormatted: formatINR(p.amount),
        entityId: p.id,
        entityType: "PAYMENT",
        createdAt: dateStr,
      });
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Orchestrator: runFullLedgerAudit()
// ---------------------------------------------------------------------------

export async function runFullLedgerAudit(
  options: AuditReportOptions = {}
): Promise<AuditReport> {
  const [
    unbalancedFindings,
    duplicateFindings,
    spendingSpikeFindings,
    uncategorizedFindings,
    metadataFindings,
  ] = await Promise.all([
    checkJournalBalance(options),
    detectPotentialDuplicatePayments(options),
    detectSpendingSpikes(options),
    detectUncategorizedExpenses(options),
    detectMissingAccountingMetadata(options),
  ]);

  const findings: AuditFinding[] = [
    ...unbalancedFindings,
    ...duplicateFindings,
    ...spendingSpikeFindings,
    ...uncategorizedFindings,
    ...metadataFindings,
  ];

  const criticalCount = findings.filter((f) => f.severity === "CRITICAL").length;
  const highCount = findings.filter((f) => f.severity === "HIGH").length;
  const mediumCount = findings.filter((f) => f.severity === "MEDIUM").length;
  const lowCount = findings.filter((f) => f.severity === "LOW").length;

  return {
    generatedAt: new Date().toISOString(),
    totalFindingsCount: findings.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    findings,
  };
}
