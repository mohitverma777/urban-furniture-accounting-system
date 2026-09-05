/**
 * src/db/schema/contacts.ts
 *
 * Contacts — customers, vendors, or both.
 * Used as the counter-party on every Order, Invoice, Bill, and Payment.
 */

import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export const contacts = sqliteTable(
  "contacts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    name: text("name").notNull(),

    /** CUSTOMER = sells to us / we invoice them
     *  VENDOR   = we buy from them / they bill us
     *  BOTH     = acts as both customer and vendor */
    type: text("type", { enum: ["CUSTOMER", "VENDOR", "BOTH"] }).notNull(),

    email: text("email"),
    mobile: text("mobile"),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    pincode: text("pincode"),

    /** URL or relative path to profile image */
    profileImage: text("profile_image"),

    /** Soft archive flag */
    isArchived: integer("is_archived", { mode: "boolean" })
      .notNull()
      .default(false),

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),

    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("contacts_type_idx").on(table.type),
    index("contacts_email_idx").on(table.email),
    index("contacts_name_idx").on(table.name),
  ]
);

// ---------------------------------------------------------------------------
// Inferred TypeScript types
// ---------------------------------------------------------------------------

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type ContactType = Contact["type"];
