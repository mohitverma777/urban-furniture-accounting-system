/**
 * src/db/schema/audit.ts
 *
 * Audit Trail & Change Log Schema:
 * Tracks timestamped creations, updates, status changes, and deletions
 * across system entities (Orders, Budgets, Journal Entries, Products, Contacts).
 */

import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const changeLogs = sqliteTable(
  "change_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    /** System entity type: "ORDER", "BUDGET", "JOURNAL_ENTRY", "CONTACT", "PRODUCT", "PAYMENT" */
    entityType: text("entity_type").notNull(),

    /** ID of the target entity */
    entityId: text("entity_id").notNull(),

    /** Action type: "CREATE", "UPDATE", "STATUS_CHANGE", "DELETE" */
    action: text("action").notNull(),

    /** Who performed the change (e.g. "admin", "system", user email) */
    changedBy: text("changed_by").notNull().default("System"),

    /** JSON stringified previous state (null for CREATE) */
    oldValue: text("old_value"),

    /** JSON stringified new state */
    newValue: text("new_value"),

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("change_logs_entity_idx").on(table.entityType, table.entityId),
    index("change_logs_action_idx").on(table.action),
    index("change_logs_created_at_idx").on(table.createdAt),
  ]
);

export type ChangeLog = typeof changeLogs.$inferSelect;
export type NewChangeLog = typeof changeLogs.$inferInsert;
