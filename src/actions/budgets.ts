"use server";

import { revalidatePath } from "next/cache";
import {
  createAnalyticAccount,
  createBudget,
  type AnalyticAccountType,
} from "@/services/budgets";

export interface CreateAnalyticAccountActionInput {
  name: string;
  type: AnalyticAccountType;
}

export async function createAnalyticAccountAction(input: CreateAnalyticAccountActionInput) {
  try {
    const created = await createAnalyticAccount({
      name: input.name,
      type: input.type,
    });

    revalidatePath("/budgets");
    revalidatePath("/");
    return { success: true, data: created };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create analytic account.";
    return { success: false, error: message };
  }
}

export interface CreateBudgetActionInput {
  name: string;
  analyticAccountId: string;
  plannedAmountRupees: number; // in Rupees from UI
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export async function createBudgetAction(input: CreateBudgetActionInput) {
  try {
    const plannedAmount = Math.round(input.plannedAmountRupees * 100); // Convert ₹ to Paise

    const created = await createBudget({
      name: input.name,
      analyticAccountId: input.analyticAccountId,
      plannedAmount,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
    });

    revalidatePath("/budgets");
    revalidatePath("/");
    return { success: true, data: created };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create budget.";
    return { success: false, error: message };
  }
}

export async function updateBudgetStatusAction(input: {
  id: string;
  status: "DRAFT" | "CONFIRMED" | "REVISED" | "CANCELLED";
}) {
  try {
    const { updateBudgetWorkflowStatus } = await import("@/services/budgets");
    await updateBudgetWorkflowStatus(input.id, input.status);
    revalidatePath("/budgets");
    revalidatePath("/");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update budget status.";
    return { success: false, error: message };
  }
}

export async function reviseBudgetAction(input: {
  originalId: string;
  plannedAmountRupees: number;
  responsiblePerson?: string;
  newName?: string;
}) {
  try {
    const { reviseBudget } = await import("@/services/budgets");
    const plannedAmount = Math.round(input.plannedAmountRupees * 100);
    const created = await reviseBudget(input.originalId, {
      plannedAmount,
      responsiblePerson: input.responsiblePerson,
      newName: input.newName,
    });
    revalidatePath("/budgets");
    revalidatePath("/");
    return { success: true, data: created };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to revise budget.";
    return { success: false, error: message };
  }
}

