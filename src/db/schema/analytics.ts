/**
 * src/db/schema/analytics.ts
 *
 * Analytic Accounts + Budgets.
 *
 * Analytic accounts allow cost/revenue tracking across projects or departments
 * (orthogonal to the standard Chart of Accounts).
 *
 * Budgets set planned spend / income targets against an analytic account
 * for a given period, enabling Budget vs Actual reporting.
 *
 * Money convention: plannedAmount is INTEGER PAISE.
 */

import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// analytic_accounts
// ---------------------------------------------------------------------------

export const analyticAccounts = sqliteTable(
  "analytic_accounts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    name: text("name").notNull(),

    /** INCOME  = tracks revenue streams (e.g. "Online Sales", "Retail Store")
     *  EXPENSE = tracks cost centres (e.g. "Marketing", "Operations") */
    type: text("type", { enum: ["INCOME", "EXPENSE"] }).notNull(),

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("analytic_accounts_type_idx").on(table.type),
    index("analytic_accounts_name_idx").on(table.name),
  ]
);

// ---------------------------------------------------------------------------
// budgets
// ---------------------------------------------------------------------------

export const budgets = sqliteTable(
  "budgets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    name: text("name").notNull(),

    /** The analytic account this budget applies to */
    analyticAccountId: text("analytic_account_id")
      .notNull()
      .references(() => analyticAccounts.id, { onDelete: "restrict" }),

    /** Planned budget amount in PAISE (integer).  Example: ₹5,00,000 → 50000000 */
    plannedAmount: integer("planned_amount").notNull().default(0),

    /** Budget period start (stored as Unix timestamp / seconds) */
    startDate: integer("start_date", { mode: "timestamp" }).notNull(),

    /** Budget period end (stored as Unix timestamp / seconds) */
    endDate: integer("end_date", { mode: "timestamp" }).notNull(),

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("budgets_analytic_account_idx").on(table.analyticAccountId),
    index("budgets_date_range_idx").on(table.startDate, table.endDate),
  ]
);

// ---------------------------------------------------------------------------
// Inferred TypeScript types
// ---------------------------------------------------------------------------

export type AnalyticAccount = typeof analyticAccounts.$inferSelect;
export type NewAnalyticAccount = typeof analyticAccounts.$inferInsert;
export type AnalyticAccountType = AnalyticAccount["type"];

export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
