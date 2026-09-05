"use server";

import { revalidatePath } from "next/cache";
import {
  createContact,
  updateContact,
  archiveContact,
  unarchiveContact,
  type ContactFormValues,
} from "@/services/contacts";

export async function createContactAction(data: ContactFormValues) {
  try {
    const contact = await createContact(data);
    revalidatePath("/contacts");
    return { success: true, contact };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create contact",
    };
  }
}

export async function updateContactAction(
  id: string,
  data: Partial<ContactFormValues>
) {
  try {
    const contact = await updateContact(id, data);
    revalidatePath("/contacts");
    return { success: true, contact };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update contact",
    };
  }
}

export async function archiveContactAction(id: string) {
  try {
    const contact = await archiveContact(id);
    revalidatePath("/contacts");
    return { success: true, contact };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to archive contact",
    };
  }
}

export async function unarchiveContactAction(id: string) {
  try {
    const contact = await unarchiveContact(id);
    revalidatePath("/contacts");
    return { success: true, contact };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to restore contact",
    };
  }
}
