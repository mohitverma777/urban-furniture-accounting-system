/**
 * src/services/contacts/schema.ts
 *
 * Client-safe validation schemas and types for Contacts.
 * Does NOT import database drivers. Safe for use in Client Components.
 */

import { z } from "zod";
import type { ContactType } from "@/db/schema/contacts";

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
  gstin: z
    .string()
    .trim()
    .regex(
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/,
      "Invalid GSTIN format (15 alphanumeric characters, e.g. 27AAPCU0123M1ZV)"
    )
    .or(z.literal(""))
    .optional(),
  profileImage: z.string().trim().optional(),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

export interface GetContactsFilter {
  search?: string;
  type?: ContactType | "ALL";
  isArchived?: boolean;
}
