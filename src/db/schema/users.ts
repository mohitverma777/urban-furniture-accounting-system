/**
 * src/db/schema/users.ts
 *
 * Users table — authentication and role-based access control.
 *
 * Roles:
 *   ADMIN      — Full access, can manage users
 *   ACCOUNTANT — Full accounting access, cannot manage users
 *   USER       — Portal access only, sees own invoices/bills/payments
 *
 * Password is stored as a bcrypt hash. Never exposed to the client.
 */

import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { contacts } from "./contacts";

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export const users = sqliteTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    /** Display name */
    name: text("name").notNull(),

    /** Login identifier — unique, 6-12 characters */
    loginId: text("login_id").notNull(),

    /** Email address — unique, validated format */
    email: text("email").notNull(),

    /** Bcrypt password hash — NEVER sent to client */
    passwordHash: text("password_hash").notNull(),

    /** User role: ADMIN | ACCOUNTANT | USER */
    role: text("role", { enum: ["ADMIN", "ACCOUNTANT", "USER"] })
      .notNull()
      .default("USER"),

    /**
     * Optional link to a contact record.
     * For USER role: links the user to a customer/vendor contact so we can
     * scope invoice/bill/payment queries to their own data.
     */
    contactId: text("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),

    /** Soft-disable flag */
    active: integer("active", { mode: "boolean" }).notNull().default(true),

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),

    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("users_login_id_uidx").on(table.loginId),
    uniqueIndex("users_email_uidx").on(table.email),
    index("users_role_idx").on(table.role),
    index("users_contact_id_idx").on(table.contactId),
  ]
);

// ---------------------------------------------------------------------------
// Inferred TypeScript types
// ---------------------------------------------------------------------------

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserRoleEnum = User["role"];
