/**
 * src/db/schema/payments.ts
 *
 * Payments — customer receipts and vendor disbursements.
 *
 * Each payment:
 *  - Is linked to an order (the invoice / bill being settled)
 *  - Records the payment method and date
 *  - References the auto-created journal entry that posts the double-entry
 *
 * Money convention: amount is INTEGER PAISE. Never REAL/FLOAT.
 */

import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { journalEntries } from "./journal-entries";
import { orders } from "./orders";

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export const payments = sqliteTable(
  "payments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    /** The order (SO or PO) this payment is applied against */
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),

    /** Payment amount — INTEGER PAISE */
    amount: integer("amount").notNull(),

    /** CASH = physical cash
     *  BANK = bank transfer, cheque, UPI, card, etc. */
    paymentMethod: text("payment_method", {
      enum: ["CASH", "BANK"],
    }).notNull(),

    /** Date the payment was received / made */
    paymentDate: integer("payment_date", { mode: "timestamp" }).notNull(),

    /** External reference: cheque number, UTR, transaction ID, etc. */
    reference: text("reference"),

    /** The journal entry automatically created when this payment is posted.
     *  Nullable until the payment is posted (draft payments have no entry). */
    journalEntryId: text("journal_entry_id").references(
      () => journalEntries.id,
      { onDelete: "set null" }
    ),
  },
  (table) => [
    index("payments_order_idx").on(table.orderId),
    index("payments_payment_date_idx").on(table.paymentDate),
    index("payments_journal_entry_idx").on(table.journalEntryId),
    index("payments_method_idx").on(table.paymentMethod),
  ]
);

// ---------------------------------------------------------------------------
// Inferred TypeScript types
// ---------------------------------------------------------------------------

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type PaymentMethod = Payment["paymentMethod"];
