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
