/**
 * src/db/schema/relations.ts
 *
 * Drizzle ORM relation definitions.
 *
 * Relations are used by the Drizzle relational query API (`db.query.*`).
 * They are NOT database-level constraints — those live in the FK definitions
 * on the individual table files.  These are purely TypeScript-level graph
 * declarations that enable `with:` clause joins in queries.
 *
 * Convention:
 *   - `one(X, { fields: [...], references: [...] })` = FK side
 *   - `many(X)` = the referenced side
 */

import { relations } from "drizzle-orm";
import { accounts, journals } from "./accounts";
import { analyticAccounts, budgets } from "./analytics";
import { contacts } from "./contacts";
import { journalEntries, journalItems } from "./journal-entries";
import { orderItems, orders } from "./orders";
import { payments } from "./payments";
import { products } from "./products";
import { stockMovements } from "./stock";
import { users } from "./users";

// ---------------------------------------------------------------------------
// contacts
// ---------------------------------------------------------------------------

export const contactsRelations = relations(contacts, ({ many }) => ({
  orders: many(orders),
  users: many(users),
}));

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ one }) => ({
  contact: one(contacts, {
    fields: [users.contactId],
    references: [contacts.id],
  }),
}));

// ---------------------------------------------------------------------------
// products
// ---------------------------------------------------------------------------

export const productsRelations = relations(products, ({ many }) => ({
  orderItems: many(orderItems),
  stockMovements: many(stockMovements),
}));

// ---------------------------------------------------------------------------
// accounts
// ---------------------------------------------------------------------------

export const accountsRelations = relations(accounts, ({ many }) => ({
  journals: many(journals),
  journalItems: many(journalItems),
}));

// ---------------------------------------------------------------------------
// journals
// ---------------------------------------------------------------------------

export const journalsRelations = relations(journals, ({ one, many }) => ({
  defaultAccount: one(accounts, {
    fields: [journals.defaultAccountId],
    references: [accounts.id],
  }),
  journalEntries: many(journalEntries),
}));

// ---------------------------------------------------------------------------
// analytic_accounts
// ---------------------------------------------------------------------------

export const analyticAccountsRelations = relations(
  analyticAccounts,
  ({ many }) => ({
    budgets: many(budgets),
    journalItems: many(journalItems),
  })
);

// ---------------------------------------------------------------------------
// budgets
// ---------------------------------------------------------------------------

export const budgetsRelations = relations(budgets, ({ one }) => ({
  analyticAccount: one(analyticAccounts, {
    fields: [budgets.analyticAccountId],
    references: [analyticAccounts.id],
  }),
}));

// ---------------------------------------------------------------------------
// journal_entries
// ---------------------------------------------------------------------------

export const journalEntriesRelations = relations(
  journalEntries,
  ({ one, many }) => ({
    journal: one(journals, {
      fields: [journalEntries.journalId],
      references: [journals.id],
    }),
    items: many(journalItems),
    payment: many(payments),
  })
);

// ---------------------------------------------------------------------------
// journal_items
// ---------------------------------------------------------------------------

export const journalItemsRelations = relations(journalItems, ({ one }) => ({
  entry: one(journalEntries, {
    fields: [journalItems.entryId],
    references: [journalEntries.id],
  }),
  account: one(accounts, {
    fields: [journalItems.accountId],
    references: [accounts.id],
  }),
  analyticAccount: one(analyticAccounts, {
    fields: [journalItems.analyticAccountId],
    references: [analyticAccounts.id],
  }),
}));

// ---------------------------------------------------------------------------
// orders
// ---------------------------------------------------------------------------

export const ordersRelations = relations(orders, ({ one, many }) => ({
  contact: one(contacts, {
    fields: [orders.contactId],
    references: [contacts.id],
  }),
  items: many(orderItems),
  payments: many(payments),
}));

// ---------------------------------------------------------------------------
// order_items
// ---------------------------------------------------------------------------

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

// ---------------------------------------------------------------------------
// payments
// ---------------------------------------------------------------------------

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
  journalEntry: one(journalEntries, {
    fields: [payments.journalEntryId],
    references: [journalEntries.id],
  }),
}));

// ---------------------------------------------------------------------------
// stock_movements
// ---------------------------------------------------------------------------

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, {
    fields: [stockMovements.productId],
    references: [products.id],
  }),
}));
