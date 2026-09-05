"use server";

import { revalidatePath } from "next/cache";
import {
  recordStockMovement,
  getStockMovementHistory,
  type StockHistoryFilter,
} from "@/services/stock";

export async function createStockAdjustmentAction(params: {
  productId: string;
  quantity: number;
  direction: "INCREASE" | "DECREASE";
  reason?: string;
}) {
  try {
    const qty = Math.abs(params.quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      return { success: false, error: "Adjustment quantity must be a positive integer." };
    }

    const signedQuantity = params.direction === "DECREASE" ? -qty : qty;
    const refNote = params.reason?.trim() ? `ADJ: ${params.reason.trim()}` : "Manual Inventory Adjustment";

    const movement = await recordStockMovement({
      productId: params.productId,
      type: "ADJUSTMENT",
      quantity: signedQuantity,
      referenceId: refNote,
    });

    if (!movement) {
      return {
        success: false,
        error: "Failed to record stock adjustment. Verify product is an active GOODS or COMBO product.",
      };
    }

    revalidatePath("/stock");
    revalidatePath("/products");
    revalidatePath("/dashboard");

    return { success: true, movement };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to record stock adjustment",
    };
  }
}

export async function getStockMovementHistoryAction(filter: StockHistoryFilter = {}) {
  return await getStockMovementHistory(filter);
}
