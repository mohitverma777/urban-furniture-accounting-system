import { NextResponse } from "next/server";
import { getCurrentUser } from "@/auth/session";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.contactId) {
      return NextResponse.json({ invoices: [] });
    }

    // Query customer sales orders/invoices linked to this user's contact ID
    const customerInvoices = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.contactId, user.contactId),
          eq(orders.type, "SO")
        )
      );

    return NextResponse.json({ invoices: customerInvoices });
  } catch (err) {
    console.error("[Portal Invoices Route Error]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
