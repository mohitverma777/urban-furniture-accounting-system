import { NextResponse } from "next/server";
import { getCurrentUser } from "@/auth/session";
import { db } from "@/db";
import { payments, orders } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.contactId) {
      return NextResponse.json({ payments: [] });
    }

    // Join payments with orders to get payments for user's contactId
    const userPayments = await db
      .select({
        id: payments.id,
        amount: payments.amount,
        paymentMethod: payments.paymentMethod,
        paymentDate: payments.paymentDate,
        reference: payments.reference,
        orderId: payments.orderId,
      })
      .from(payments)
      .innerJoin(orders, eq(payments.orderId, orders.id))
      .where(eq(orders.contactId, user.contactId));

    return NextResponse.json({ payments: userPayments });
  } catch (err) {
    console.error("[Portal Payments Route Error]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
