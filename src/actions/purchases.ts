"use server";

import { revalidatePath } from "next/cache";
import {
  createPurchaseOrder,
  convertOrderToVendorBill,
  type CreatePurchaseOrderInput,
} from "@/services/purchases";
import { recordVendorPayment } from "@/services/accounting";

export async function createPurchaseOrderAction(data: CreatePurchaseOrderInput) {
  try {
    const order = await createPurchaseOrder(data);
    revalidatePath("/purchases");
    revalidatePath("/dashboard");
    return { success: true, order };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create Purchase Order",
    };
  }
}

export async function convertOrderToVendorBillAction(orderId: string) {
  try {
    const order = await convertOrderToVendorBill(orderId);
    revalidatePath("/purchases");
    revalidatePath(`/purchases/${orderId}`);
    revalidatePath("/dashboard");
    revalidatePath("/accounting");
    revalidatePath("/reports");
    return { success: true, order };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to convert to Vendor Bill",
    };
  }
}

export async function recordVendorPaymentAction(params: {
  orderId: string;
  amount: number; // in INR rupees
  paymentMethod: "CASH" | "BANK";
  reference?: string;
}) {
  try {
    const payment = await recordVendorPayment({
      orderId: params.orderId,
      amount: Math.round(params.amount * 100), // convert to paise
      paymentMethod: params.paymentMethod,
      reference: params.reference,
    });

    revalidatePath("/purchases");
    revalidatePath(`/purchases/${params.orderId}`);
    revalidatePath("/payments");
    revalidatePath("/dashboard");
    revalidatePath("/accounting");
    revalidatePath("/reports");
    return { success: true, payment };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to record vendor payment",
    };
  }
}
