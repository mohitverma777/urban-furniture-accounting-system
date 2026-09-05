"use server";

import { revalidatePath } from "next/cache";
import {
  createSalesOrder,
  convertOrderToInvoice,
  type CreateSalesOrderInput,
} from "@/services/sales";
import { recordCustomerPayment } from "@/services/accounting";

export async function createSalesOrderAction(data: CreateSalesOrderInput) {
  try {
    const order = await createSalesOrder(data);
    revalidatePath("/sales");
    revalidatePath("/dashboard");
    return { success: true, order };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create Sales Order",
    };
  }
}

export async function convertOrderToInvoiceAction(orderId: string) {
  try {
    const order = await convertOrderToInvoice(orderId);
    revalidatePath("/sales");
    revalidatePath(`/sales/${orderId}`);
    revalidatePath("/dashboard");
    revalidatePath("/accounting");
    revalidatePath("/reports");
    return { success: true, order };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to convert to invoice",
    };
  }
}

export async function recordCustomerPaymentAction(params: {
  orderId: string;
  amount: number; // in INR rupees
  paymentMethod: "CASH" | "BANK";
  reference?: string;
}) {
  try {
    const payment = await recordCustomerPayment({
      orderId: params.orderId,
      amount: Math.round(params.amount * 100), // convert to paise
      paymentMethod: params.paymentMethod,
      reference: params.reference,
    });

    revalidatePath("/sales");
    revalidatePath(`/sales/${params.orderId}`);
    revalidatePath("/payments");
    revalidatePath("/dashboard");
    revalidatePath("/accounting");
    revalidatePath("/reports");
    return { success: true, payment };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to record payment",
    };
  }
}
