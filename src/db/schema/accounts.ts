/**
 * src/db/schema/accounts.ts
 *
 * Chart of Accounts + Journals.
 *
 * These are the two foundational accounting configuration tables.
 * Every financial transaction posts to an Account via a Journal.
 */

import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// accounts — Chart of Accounts
// ---------------------------------------------------------------------------

export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    /** Alphanumeric account code, e.g. "1001", "2001", "4001".  Must be unique. */
    code: text("code").notNull(),

    name: text("name").notNull(),

    /** ASSET    = resources owned by the business (cash, AR, inventory, equipment)
     *  LIABILITY= obligations owed (AP, loans, GST payable)
     *  EXPENSE  = costs incurred (COGS, rent, salaries)
     *  INCOME   = revenues earned (product sales, service fees)
     *  CAPITAL  = owner's equity (share capital, retained earnings) */
    type: text("type", {
      enum: ["ASSET", "LIABILITY", "EXPENSE", "INCOME", "CAPITAL"],
    }).notNull(),

    /** Soft-delete flag — inactive accounts cannot receive new postings */
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),

    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("accounts_code_uidx").on(table.code),
    index("accounts_type_idx").on(table.type),
    index("accounts_is_active_idx").on(table.isActive),
    index("accounts_name_idx").on(table.name),
  ]
);

// ---------------------------------------------------------------------------
// journals — Accounting Journals
// ---------------------------------------------------------------------------

export const journals = sqliteTable(
  "journals",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    name: text("name").notNull(),

    /** SALES    = Customer invoices and credit notes
     *  PURCHASE = Vendor bills and refunds
     *  BANK     = Bank account transactions
     *  CASH     = Cash transactions */
    type: text("type", {
      enum: ["SALES", "PURCHASE", "BANK", "CASH"],
    }).notNull(),

    /** The default account for this journal (e.g. the bank account for a BANK
     *  journal, or Accounts Receivable for a SALES journal). Nullable because
     *  it is configured after journal creation. */
    defaultAccountId: text("default_account_id").references(
      () => accounts.id,
      { onDelete: "set null" }
    ),

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),

    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("journals_type_idx").on(table.type),
    index("journals_default_account_idx").on(table.defaultAccountId),
  ]
);

// ---------------------------------------------------------------------------
// Inferred TypeScript types
// ---------------------------------------------------------------------------

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type AccountType = Account["type"];

export type Journal = typeof journals.$inferSelect;
export type NewJournal = typeof journals.$inferInsert;
export type JournalType = Journal["type"];
