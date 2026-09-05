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
