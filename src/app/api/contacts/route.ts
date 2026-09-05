import { NextResponse } from "next/server";
import { getContacts } from "@/services/contacts";

export async function GET() {
  try {
    // Return all contacts (both active and archived)
    const contacts = await getContacts({ isArchived: undefined });
    return NextResponse.json(contacts);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch contacts" },
      { status: 500 }
    );
  }
}
