/**
 * src/services/dashboard/types.ts
 *
 * Client-safe types for Dashboard UI components.
 * Does NOT import database drivers. Safe for use in Client Components.
 */

export interface DashboardFinancials {
  totalRevenue: number; // in Paise
  totalExpenses: number; // in Paise
  netProfit: number; // in Paise
  outstandingReceivables: number; // Debtors balance in Paise
  outstandingPayables: number; // Creditors balance in Paise
  bankBalance: number; // Bank balance in Paise
  cashBalance: number; // Cash balance in Paise
}

export interface MonthlyChartPoint {
  month: string; // e.g. "Jan", "Feb"
  revenue: number; // in INR rupees
  expenses: number; // in INR rupees
  netProfit: number; // in INR rupees
}

export interface RecentTransactionItem {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  accountName: string;
  journalName: string;
  debit: number;
  credit: number;
}

export interface OutstandingInvoiceItem {
  id: string;
  orderNumber: string;
  type: "SO" | "PO";
  contactName: string;
  status: "DRAFT" | "BILLED" | "PARTIAL" | "PAID";
  totalAmount: number; // in Paise
  invoiceDate: string;
}

export interface BudgetUtilizationItem {
  id: string;
  name: string;
  analyticName: string;
  plannedAmount: number; // in Paise
  practicalAmount: number; // in Paise
  utilizationPercentage: number;
}

export interface StockSnapshotItem {
  id: string;
  name: string;
  category: string;
  type: string;
  salesPrice: number; // in Paise
  costPrice: number; // in Paise
  isArchived: boolean;
}

export interface LowStockAlertItem {
  id: string; // productId
  name: string;
  category: string | null;
  type: "GOODS" | "COMBO";
  currentQty: number;
  reorderThreshold: number; // default 5 units
  recommendedReorderQty: number; // e.g. Math.max(10, 15 - currentQty)
  costPrice: number; // in Paise
  estimatedReorderCost: number; // in Paise (recommendedReorderQty * costPrice)
  status: "CRITICAL_OUT_OF_STOCK" | "LOW_STOCK_WARNING";
}

export interface DashboardMetrics {
  financials: DashboardFinancials;
  monthlyChart: MonthlyChartPoint[];
  recentTransactions: RecentTransactionItem[];
  outstandingInvoices: OutstandingInvoiceItem[];
  budgetUtilization: BudgetUtilizationItem[];
  stockSnapshot: StockSnapshotItem[];
  lowStockAlerts: LowStockAlertItem[];
  lowStockCount: number;
  hasData: boolean;
}
