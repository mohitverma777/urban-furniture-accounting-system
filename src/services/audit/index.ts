/**
 * src/services/audit/index.ts
 *
 * Audit Trail & Change Log Service — records immutable timestamped
 * change events for Orders, Budgets, Journal Entries, Products, and Contacts.
 */

import { db } from "@/db";
import { changeLogs, type ChangeLog, type NewChangeLog } from "@/db/schema/audit";
import { eq, and, desc, sql, like, or } from "drizzle-orm";

export interface RecordAuditInput {
  entityType: "ORDER" | "BUDGET" | "JOURNAL_ENTRY" | "CONTACT" | "PRODUCT" | "PAYMENT";
  entityId: string;
  action: "CREATE" | "UPDATE" | "STATUS_CHANGE" | "DELETE";
  changedBy?: string;
  oldValue?: Record<string, any> | string | null;
  newValue?: Record<string, any> | string | null;
}

export interface AuditLogFilter {
  entityType?: string;
  entityId?: string;
  search?: string;
  limit?: number;
}

/**
 * Ensure change_logs table exists in SQLite database.
 */
async function ensureAuditTableExists() {
  try {
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS change_logs (
        id TEXT PRIMARY KEY NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        changed_by TEXT NOT NULL DEFAULT 'System',
        old_value TEXT,
        new_value TEXT,
        created_at INTEGER NOT NULL
      )
    `);
  } catch (err) {
    // Table already exists or handled by driver
  }
}

/**
 * Ensure baseline demonstration audit logs exist for presentation and review.
 */
async function seedInitialAuditLogsIfEmpty() {
  try {
    const existing = await db.select().from(changeLogs).limit(3);
    if (existing.length >= 3) return;

    const sampleAuditEntries: NewChangeLog[] = [
      {
        id: crypto.randomUUID(),
        entityType: "ORDER",
        entityId: "SO-2026-001",
        action: "STATUS_CHANGE",
        changedBy: "Senior Accountant",
        oldValue: JSON.stringify({
          orderNumber: "SO-2026-001",
          status: "DRAFT",
          totalAmount: 141600,
          customer: "ABC Interiors Pvt Ltd",
          approvedBy: null,
        }),
        newValue: JSON.stringify({
          orderNumber: "SO-2026-001",
          status: "CONFIRMED",
          totalAmount: 141600,
          customer: "ABC Interiors Pvt Ltd",
          approvedBy: "Senior Accountant",
          journalVoucher: "JV-2026-003",
          stockDeduction: "8 Units Perpetual Depletion",
        }),
        createdAt: new Date(Date.now() - 3600000 * 4),
      },
      {
        id: crypto.randomUUID(),
        entityType: "PAYMENT",
        entityId: "PAY-2026-001",
        action: "CREATE",
        changedBy: "Chief Cashier",
        oldValue: null,
        newValue: JSON.stringify({
          paymentReference: "PAY-2026-001",
          invoiceNumber: "SO-2026-001",
          amount: 141600,
          method: "NEFT / Bank Transfer",
          bankAccount: "HDFC Bank (Acct 1020)",
          status: "RECONCILED",
        }),
        createdAt: new Date(Date.now() - 3600000 * 2),
      },
      {
        id: crypto.randomUUID(),
        entityType: "PRODUCT",
        entityId: "PRD-SKU-004",
        action: "UPDATE",
        changedBy: "Inventory Manager",
        oldValue: JSON.stringify({
          sku: "FUR-SOFA-004",
          name: "Solid Teak 3-Seater Luxury Sofa",
          sellingPrice: 42000,
          costPrice: 28000,
          stockOnHand: 12,
        }),
        newValue: JSON.stringify({
          sku: "FUR-SOFA-004",
          name: "Solid Teak 3-Seater Luxury Sofa",
          sellingPrice: 45000,
          costPrice: 28000,
          stockOnHand: 11,
          priceAdjustmentReason: "Timber wholesale raw material price revision",
        }),
        createdAt: new Date(Date.now() - 3600000 * 6),
      },
      {
        id: crypto.randomUUID(),
        entityType: "JOURNAL_ENTRY",
        entityId: "JV-2026-008",
        action: "CREATE",
        changedBy: "System (Automated Post)",
        oldValue: null,
        newValue: JSON.stringify({
          voucherNumber: "JV-2026-008",
          type: "SALES",
          debitTotal: 141600,
          creditTotal: 141600,
          variance: 0.0,
          entries: [
            { account: "Accounts Receivable (1050)", debit: 141600, credit: 0 },
            { account: "Furniture Sales Revenue (4000)", debit: 0, credit: 120000 },
            { account: "GST Output Tax 18% (2200)", debit: 0, credit: 21600 },
          ],
        }),
        createdAt: new Date(Date.now() - 3600000 * 8),
      },
      {
        id: crypto.randomUUID(),
        entityType: "CONTACT",
        entityId: "c0000000-0000-4000-8000-000000000004",
        action: "UPDATE",
        changedBy: "Compliance Officer",
        oldValue: JSON.stringify({
          name: "ABC Interiors Pvt Ltd",
          gstin: "27AAPCU9999M1Z5",
          creditLimit: 500000,
          creditRiskScore: "AA",
        }),
        newValue: JSON.stringify({
          name: "ABC Interiors Pvt Ltd",
          gstin: "27AAPCU9999M1Z5",
          creditLimit: 750000,
          creditRiskScore: "AAA (Excellent)",
          approvalNote: "Enhanced credit line approved based on 100% on-time settlement history",
        }),
        createdAt: new Date(Date.now() - 3600000 * 12),
      },
    ];

    for (const entry of sampleAuditEntries) {
      await db.insert(changeLogs).values(entry);
    }
  } catch (err) {
    console.error("[Audit Seed Error]", err);
  }
}

/**
 * Record a timestamped audit log event.
 */
export async function recordAuditLog(input: RecordAuditInput): Promise<ChangeLog> {
  await ensureAuditTableExists();

  const oldValStr =
    input.oldValue == null
      ? null
      : typeof input.oldValue === "string"
      ? input.oldValue
      : JSON.stringify(input.oldValue);

  const newValStr =
    input.newValue == null
      ? null
      : typeof input.newValue === "string"
      ? input.newValue
      : JSON.stringify(input.newValue);

  const newLog: NewChangeLog = {
    id: crypto.randomUUID(),
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    changedBy: input.changedBy || "System Admin",
    oldValue: oldValStr,
    newValue: newValStr,
    createdAt: new Date(),
  };

  const [inserted] = await db.insert(changeLogs).values(newLog).returning();
  return inserted;
}

/**
 * Query audit trail log records with optional filtering.
 */
export async function getAuditLogs(filter: AuditLogFilter = {}): Promise<ChangeLog[]> {
  await ensureAuditTableExists();
  await seedInitialAuditLogsIfEmpty();

  const conditions = [];

  if (filter.entityType && filter.entityType !== "ALL") {
    conditions.push(eq(changeLogs.entityType, filter.entityType));
  }

  if (filter.entityId) {
    conditions.push(eq(changeLogs.entityId, filter.entityId));
  }

  if (filter.search && filter.search.trim() !== "") {
    const q = `%${filter.search.trim()}%`;
    conditions.push(
      or(
        like(changeLogs.entityType, q),
        like(changeLogs.entityId, q),
        like(changeLogs.changedBy, q),
        like(changeLogs.action, q)
      )!
    );
  }

  const query = db
    .select()
    .from(changeLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(changeLogs.createdAt));

  if (filter.limit && filter.limit > 0) {
    return await query.limit(filter.limit);
  }

  return await query;
}

/**
 * Fetch summary metrics for audit dashboard statistics.
 */
export async function getAuditStats() {
  await ensureAuditTableExists();
  await seedInitialAuditLogsIfEmpty();

  const allLogs = await db.select().from(changeLogs);

  const totalLogs = allLogs.length;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const todayCount = allLogs.filter(
    (l) => new Date(l.createdAt).getTime() >= startOfDay
  ).length;

  const entityCounts: Record<string, number> = {};
  allLogs.forEach((l) => {
    entityCounts[l.entityType] = (entityCounts[l.entityType] || 0) + 1;
  });

  return {
    totalLogs,
    todayCount,
    entityCounts,
  };
}
