/**
 * src/services/budgets/index.ts
 *
 * Analytic Accounts & Budgets Service — manages Cost/Revenue Centers (Analytic Accounts),
 * Budget Targets, and Budget vs Actual Variance Reporting derived strictly
 * from double-entry journal items in the database.
 */

import { db } from "@/db";
import {
  analyticAccounts,
  budgets,
  journalEntries,
  journalItems,
  type AnalyticAccount,
  type AnalyticAccountType,
  type Budget,
} from "@/db/schema";
import { eq, and, gte, lte, asc, desc } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

export type { AnalyticAccountType };

export type BudgetStatus = "On Track" | "Near Limit" | "Over Budget";


export interface CreateAnalyticAccountInput {
  name: string;
  type: AnalyticAccountType;
}

export interface CreateBudgetInput {
  name: string;
  analyticAccountId: string;
  plannedAmount: number; // in Paise
  startDate: Date;
  endDate: Date;
  responsiblePerson?: string;
}

export interface BudgetReportItem {
  id: string;
  name: string;
  analyticAccountId: string;
  analyticName: string;
  analyticType: AnalyticAccountType;
  plannedAmount: number; // in Paise
  actualAmount: number; // in Paise
  varianceAmount: number; // in Paise
  utilizationPercentage: number; // e.g. 75.5
  startDate: Date;
  endDate: Date;
  responsiblePerson?: string | null;
  status: BudgetStatus;
}

// ---------------------------------------------------------------------------
// 1. Analytic Accounts CRUD & Service
// ---------------------------------------------------------------------------

export async function createAnalyticAccount(
  input: CreateAnalyticAccountInput
): Promise<AnalyticAccount> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Analytic account name is required.");
  }

  const [existing] = await db
    .select()
    .from(analyticAccounts)
    .where(eq(analyticAccounts.name, name));

  if (existing) {
    throw new Error(`Analytic account with name '${name}' already exists.`);
  }

  const [created] = await db
    .insert(analyticAccounts)
    .values({
      name,
      type: input.type,
    })
    .returning();

  return created;
}

export async function getAnalyticAccounts(): Promise<AnalyticAccount[]> {
  return await db
    .select()
    .from(analyticAccounts)
    .orderBy(asc(analyticAccounts.name));
}

// ---------------------------------------------------------------------------
// 2. Budgets CRUD & Service
// ---------------------------------------------------------------------------

export async function createBudget(input: CreateBudgetInput): Promise<Budget> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Budget name is required.");
  }

  if (input.plannedAmount <= 0) {
    throw new Error("Planned budget amount must be greater than zero.");
  }

  if (input.startDate >= input.endDate) {
    throw new Error("Budget start date must be earlier than end date.");
  }

  const [analyticAcc] = await db
    .select()
    .from(analyticAccounts)
    .where(eq(analyticAccounts.id, input.analyticAccountId));

  if (!analyticAcc) {
    throw new Error(`Analytic account with ID '${input.analyticAccountId}' not found.`);
  }

  const [created] = await db
    .insert(budgets)
    .values({
      name,
      analyticAccountId: input.analyticAccountId,
      plannedAmount: input.plannedAmount,
      startDate: input.startDate,
      endDate: input.endDate,
      responsiblePerson: input.responsiblePerson ?? null,
    })
    .returning();

  return created;
}

export async function getBudgetsList() {
  return await db
    .select({
      id: budgets.id,
      name: budgets.name,
      analyticAccountId: budgets.analyticAccountId,
      plannedAmount: budgets.plannedAmount,
      startDate: budgets.startDate,
      endDate: budgets.endDate,
      responsiblePerson: budgets.responsiblePerson,
      analyticName: analyticAccounts.name,
      analyticType: analyticAccounts.type,
    })
    .from(budgets)
    .innerJoin(analyticAccounts, eq(budgets.analyticAccountId, analyticAccounts.id))
    .orderBy(desc(budgets.createdAt));
}

// ---------------------------------------------------------------------------
// 3. Budget vs Actual Variance Report
// ---------------------------------------------------------------------------

export async function getBudgetReportItems(): Promise<BudgetReportItem[]> {
  const allBudgets = await getBudgetsList();
  const reportItems: BudgetReportItem[] = [];

  for (const b of allBudgets) {
    const endOfPeriod = new Date(b.endDate);
    endOfPeriod.setHours(23, 59, 59, 999);

    // Query posted journal items linked to this analytic account within the budget date range
    const postedItems = await db
      .select({
        debit: journalItems.debit,
        credit: journalItems.credit,
      })
      .from(journalItems)
      .innerJoin(journalEntries, eq(journalItems.entryId, journalEntries.id))
      .where(
        and(
          eq(journalItems.analyticAccountId, b.analyticAccountId),
          gte(journalEntries.date, new Date(b.startDate)),
          lte(journalEntries.date, endOfPeriod)
        )
      );

    let actualAmount = 0;
    for (const item of postedItems) {
      if (b.analyticType === "EXPENSE") {
        actualAmount += item.debit - item.credit;
      } else {
        actualAmount += item.credit - item.debit;
      }
    }

    // Variance:
    // For EXPENSE: Planned - Actual (Positive = remaining budget under spent)
    // For INCOME: Actual - Planned (Positive = target exceeded)
    const varianceAmount =
      b.analyticType === "EXPENSE"
        ? b.plannedAmount - actualAmount
        : actualAmount - b.plannedAmount;

    const utilizationPercentage =
      b.plannedAmount > 0
        ? Number(((actualAmount / b.plannedAmount) * 100).toFixed(1))
        : 0;

    let status: BudgetStatus = "On Track";
    if (utilizationPercentage > 100) {
      status = "Over Budget";
    } else if (utilizationPercentage > 80) {
      status = "Near Limit";
    }

    reportItems.push({
      id: b.id,
      name: b.name,
      analyticAccountId: b.analyticAccountId,
      analyticName: b.analyticName,
      analyticType: b.analyticType as AnalyticAccountType,
      plannedAmount: b.plannedAmount,
      actualAmount,
      varianceAmount,
      utilizationPercentage,
      startDate: new Date(b.startDate),
      endDate: new Date(b.endDate),
      responsiblePerson: b.responsiblePerson,
      status,
    });
  }

  return reportItems;
}
