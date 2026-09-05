/**
 * src/services/contacts/__tests__/contacts.test.ts
 *
 * Unit tests for Contacts business service layer.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";
import { contacts } from "@/db/schema/contacts";
import {
  createContact,
  updateContact,
  getContacts,
  getContactById,
  archiveContact,
  unarchiveContact,
  contactFormSchema,
} from "../index";
import { eq } from "drizzle-orm";

describe("Contacts Service Layer", () => {
  beforeEach(async () => {
    // Cleanup contacts created during tests (keep seeded ones or test cleanly)
    await db.delete(contacts).where(eq(contacts.name, "Test Customer Unit"));
    await db.delete(contacts).where(eq(contacts.name, "Test Vendor Unit"));
  });

  it("validates form schema correctly", () => {
    // Valid input
    const valid = contactFormSchema.safeParse({
      name: "Acme Corp",
      type: "CUSTOMER",
      email: "acme@example.com",
      mobile: "9876543210",
    });
    expect(valid.success).toBe(true);

    // Invalid input: empty name
    const invalidName = contactFormSchema.safeParse({
      name: "",
      type: "CUSTOMER",
    });
    expect(invalidName.success).toBe(false);

    // Invalid input: bad email
    const invalidEmail = contactFormSchema.safeParse({
      name: "Acme Corp",
      type: "CUSTOMER",
      email: "not-an-email",
    });
    expect(invalidEmail.success).toBe(false);

    // Invalid input: bad mobile
    const invalidMobile = contactFormSchema.safeParse({
      name: "Acme Corp",
      type: "CUSTOMER",
      mobile: "123",
    });
    expect(invalidMobile.success).toBe(false);
  });

  it("creates a customer contact successfully", async () => {
    const created = await createContact({
      name: "Test Customer Unit",
      type: "CUSTOMER",
      email: "test.customer@unit.demo",
      mobile: "9998887770",
      city: "Mumbai",
      state: "Maharashtra",
    });

    expect(created.id).toBeDefined();
    expect(created.name).toBe("Test Customer Unit");
    expect(created.type).toBe("CUSTOMER");
    expect(created.isArchived).toBe(false);

    const fetched = await getContactById(created.id);
    expect(fetched?.name).toBe("Test Customer Unit");
  });

  it("creates a vendor contact successfully", async () => {
    const created = await createContact({
      name: "Test Vendor Unit",
      type: "VENDOR",
      email: "test.vendor@unit.demo",
      mobile: "8887776660",
      city: "Ahmedabad",
    });

    expect(created.id).toBeDefined();
    expect(created.type).toBe("VENDOR");
  });

  it("edits an existing contact", async () => {
    const created = await createContact({
      name: "Test Customer Unit",
      type: "CUSTOMER",
      email: "old.email@unit.demo",
    });

    const updated = await updateContact(created.id, {
      email: "new.email@unit.demo",
      city: "Pune",
    });

    expect(updated.email).toBe("new.email@unit.demo");
    expect(updated.city).toBe("Pune");
  });

  it("filters contacts by search term and type", async () => {
    await createContact({
      name: "Test Customer Unit",
      type: "CUSTOMER",
      city: "Jaipur",
    });

    const searchResults = await getContacts({ search: "Test Customer" });
    expect(searchResults.length).toBeGreaterThanOrEqual(1);
    expect(searchResults.some((c) => c.name === "Test Customer Unit")).toBe(true);

    const vendorOnly = await getContacts({ type: "VENDOR" });
    expect(vendorOnly.every((c) => c.type === "VENDOR")).toBe(true);
  });

  it("archives and unarchives a contact", async () => {
    const created = await createContact({
      name: "Test Customer Unit",
      type: "CUSTOMER",
    });

    // Archive
    const archived = await archiveContact(created.id);
    expect(archived.isArchived).toBe(true);

    // Active list should not include archived contact
    const activeList = await getContacts({ isArchived: false });
    expect(activeList.some((c) => c.id === created.id)).toBe(false);

    // Unarchive
    const restored = await unarchiveContact(created.id);
    expect(restored.isArchived).toBe(false);
  });
});
