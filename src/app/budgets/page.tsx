import {
  getBudgetReportItems,
  getAnalyticAccounts,
  getBudgetsList,
} from "@/services/budgets";
import { BudgetsClientShell } from "@/components/budgets/budgets-client-shell";

export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  const reportItems = await getBudgetReportItems();
  const analyticAccounts = await getAnalyticAccounts();
  const budgetsList = await getBudgetsList();

  return (
    <BudgetsClientShell
      reportItems={reportItems}
      analyticAccounts={analyticAccounts}
      budgetsList={budgetsList}
    />
  );
}
