"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  recordCustomerPayment,
  recordVendorPayment,
} from "@/services/accounting";
import {
  getPaymentById,
  getUnpaidDocuments,
} from "@/services/payments";

export async function recordCentralPaymentAction(params: {
  orderId: string;
  amount: number; // in INR rupees
  paymentMethod: "CASH" | "BANK";
  reference?: string;
}) {
  try {
    // 1. Fetch order to verify type and status
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, params.orderId));

    if (!order) {
      return { success: false, error: `Document not found with ID '${params.orderId}'` };
    }

    if (order.status !== "BILLED" && order.status !== "PARTIAL") {
      return {
        success: false,
        error: `Cannot post payment to document '${order.orderNumber}' with status '${order.status}'. Must be BILLED or PARTIAL.`,
      };
    }

    const amountPaise = Math.round(params.amount * 100);
    if (isNaN(amountPaise) || amountPaise <= 0) {
      return { success: false, error: "Payment amount must be greater than ₹0." };
    }

    let paymentResult;

    if (order.type === "SO") {
      paymentResult = await recordCustomerPayment({
        orderId: params.orderId,
        amount: amountPaise,
        paymentMethod: params.paymentMethod,
        paymentReference: params.reference,
      });
    } else if (order.type === "PO") {
      paymentResult = await recordVendorPayment({
        orderId: params.orderId,
        amount: amountPaise,
        paymentMethod: params.paymentMethod,
        paymentReference: params.reference,
      });
    } else {
      return { success: false, error: `Invalid document type '${order.type}'` };
    }

    revalidatePath("/payments");
    revalidatePath("/sales");
    revalidatePath("/purchases");
    revalidatePath("/accounting");
    revalidatePath("/reports");
    revalidatePath("/dashboard");

    return { success: true, payment: paymentResult };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to record payment",
    };
  }
}

export async function getPaymentByIdAction(paymentId: string) {
  return await getPaymentById(paymentId);
}

export async function getUnpaidDocumentsAction() {
  return await getUnpaidDocuments();
}
