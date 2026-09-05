/**
 * src/services/contacts/index.ts
 *
 * Contacts Service — business logic for managing customers, vendors, and partners.
 */

import { db } from "@/db";
import { contacts, type Contact, type ContactType } from "@/db/schema/contacts";
import { eq, and, like, or } from "drizzle-orm";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Zod Validation Schema
// ---------------------------------------------------------------------------

export const contactFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  type: z.enum(["CUSTOMER", "VENDOR", "BOTH"]),
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .or(z.literal(""))
    .optional(),
  mobile: z
    .string()
    .trim()
    .regex(/^[0-9+\s-]{10,15}$/, "Invalid mobile number format (10-15 digits)")
    .or(z.literal(""))
    .optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  pincode: z.string().trim().optional(),
  profileImage: z.string().trim().optional(),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

export interface GetContactsFilter {
  search?: string;
  type?: ContactType | "ALL";
  isArchived?: boolean;
}

// ---------------------------------------------------------------------------
// Service Functions
// ---------------------------------------------------------------------------

/**
 * Query contacts with optional search, type filter, and archived status.
 */
export async function getContacts(filter: GetContactsFilter = {}): Promise<Contact[]> {
  const conditions = [];

  if (filter.isArchived !== undefined) {
    conditions.push(eq(contacts.isArchived, filter.isArchived));
  } else {
    // Default to non-archived contacts
    conditions.push(eq(contacts.isArchived, false));
  }

  if (filter.type && filter.type !== "ALL") {
    conditions.push(eq(contacts.type, filter.type));
  }

  if (filter.search && filter.search.trim() !== "") {
    const q = `%${filter.search.trim()}%`;
    conditions.push(
      or(
        like(contacts.name, q),
        like(contacts.email, q),
        like(contacts.mobile, q),
        like(contacts.city, q)
      )!
    );
  }

  return await db
    .select()
    .from(contacts)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(contacts.name);
}

/**
 * Fetch a contact by primary key ID.
 */
export async function getContactById(id: string): Promise<Contact | null> {
  const [result] = await db.select().from(contacts).where(eq(contacts.id, id));
  return result ?? null;
}

/**
 * Create a new contact record.
 */
export async function createContact(input: ContactFormValues): Promise<Contact> {
  const validated = contactFormSchema.parse(input);

  const [newContact] = await db
    .insert(contacts)
    .values({
      name: validated.name,
      type: validated.type,
      email: validated.email || null,
      mobile: validated.mobile || null,
      address: validated.address || null,
      city: validated.city || null,
      state: validated.state || null,
      pincode: validated.pincode || null,
      profileImage: validated.profileImage || null,
      isArchived: false,
    })
    .returning();

  return newContact;
}

/**
 * Update an existing contact record.
 */
export async function updateContact(
  id: string,
  input: Partial<ContactFormValues>
): Promise<Contact> {
  const existing = await getContactById(id);
  if (!existing) {
    throw new Error(`Contact with ID '${id}' not found`);
  }

  const validated = contactFormSchema.partial().parse(input);

  const [updated] = await db
    .update(contacts)
    .set({
      ...validated,
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, id))
    .returning();

  return updated;
}

/**
 * Soft-archive a contact.
 */
export async function archiveContact(id: string): Promise<Contact> {
  const existing = await getContactById(id);
  if (!existing) {
    throw new Error(`Contact with ID '${id}' not found`);
  }

  const [archived] = await db
    .update(contacts)
    .set({
      isArchived: true,
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, id))
    .returning();

  return archived;
}

/**
 * Unarchive a soft-archived contact.
 */
export async function unarchiveContact(id: string): Promise<Contact> {
  const existing = await getContactById(id);
  if (!existing) {
    throw new Error(`Contact with ID '${id}' not found`);
  }

  const [restored] = await db
    .update(contacts)
    .set({
      isArchived: false,
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, id))
    .returning();

  return restored;
}
