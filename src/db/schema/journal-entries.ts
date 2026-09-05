/**
 * src/db/schema/journal-entries.ts
 *
 * Journal Entries + Journal Line Items.
 *
 * The double-entry bookkeeping core of the system:
 *
 *   journal_entries  = the header / document (date, reference, description)
 *   journal_items    = the individual debit / credit lines
 *
 * INVARIANT:  For every posted journal entry:
 *   SUM(debit) === SUM(credit)
 *
 * This invariant is enforced by the accounting service — NOT by a DB
 * constraint — because the business service layer is the authoritative guard.
 *
 * Money convention: debit and credit are INTEGER PAISE. Never REAL/FLOAT.
 */

import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { accounts, journals } from "./accounts";
import { analyticAccounts } from "./analytics";

// ---------------------------------------------------------------------------
// journal_entries — the transaction header
// ---------------------------------------------------------------------------

export const journalEntries = sqliteTable(
  "journal_entries",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    /** Journal this entry belongs to (SALES / PURCHASE / BANK / CASH) */
    journalId: text("journal_id")
      .notNull()
      .references(() => journals.id, { onDelete: "restrict" }),

    /** The accounting date of this entry (Unix timestamp) */
    date: integer("date", { mode: "timestamp" }).notNull(),

    /** External reference number (invoice no, cheque no, bank ref, etc.) */
    reference: text("reference"),

    /** Human-readable description of the transaction */
    description: text("description"),

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("journal_entries_journal_idx").on(table.journalId),
    index("journal_entries_date_idx").on(table.date),
    index("journal_entries_reference_idx").on(table.reference),
  ]
);

// ---------------------------------------------------------------------------
// journal_items — the individual debit / credit lines
// ---------------------------------------------------------------------------

export const journalItems = sqliteTable(
  "journal_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    /** Parent journal entry */
    entryId: text("entry_id")
      .notNull()
      .references(() => journalEntries.id, { onDelete: "cascade" }),

    /** Account being debited or credited */
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),

    /** Optional analytic tag for cost/profit centre tracking.
     *  Nullable — not every line needs an analytic dimension. */
    analyticAccountId: text("analytic_account_id").references(
      () => analyticAccounts.id,
      { onDelete: "set null" }
    ),

    /**
     * Debit amount in PAISE (integer).
     * Exactly one of debit/credit should be non-zero per line item.
     * Both default to 0; setting both non-zero is a service-layer error.
     */
    debit: integer("debit").notNull().default(0),

    /**
     * Credit amount in PAISE (integer).
     */
    credit: integer("credit").notNull().default(0),
  },
  (table) => [
    index("journal_items_entry_idx").on(table.entryId),
    index("journal_items_account_idx").on(table.accountId),
    index("journal_items_analytic_idx").on(table.analyticAccountId),
    // Composite index for ledger queries (account + date range via entry)
    index("journal_items_account_entry_idx").on(table.accountId, table.entryId),
  ]
);

// ---------------------------------------------------------------------------
// Inferred TypeScript types
// ---------------------------------------------------------------------------

export type JournalEntry = typeof journalEntries.$inferSelect;
export type NewJournalEntry = typeof journalEntries.$inferInsert;

export type JournalItem = typeof journalItems.$inferSelect;
export type NewJournalItem = typeof journalItems.$inferInsert;
