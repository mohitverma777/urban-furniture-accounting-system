/**
 * src/services/reports/analytics-tools-service.ts
 *
 * Reusable database-derived reporting functions for AI tools and financial analytics:
 *  - Vendor Spending Analysis
 *  - Customer Revenue Analysis
 *  - Deterministic Ledger Anomaly & Audit Checks
 */

import { db } from "@/db";
import { orders, contacts, payments } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { runFullLedgerAudit } from "@/services/accounting/anomaly-detector";

// ---------------------------------------------------------------------------
// 1. Vendor Spending Report
// ---------------------------------------------------------------------------

export interface VendorSpendingFilter {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  limit?: number; // max 50
}

export interface VendorSpendingItem {
  vendorId: string;
  vendorName: string;
  vendorEmail: string | null;
  billCount: number;
  totalSpentPaise: number;
  totalPaidPaise: number;
  outstandingBalancePaise: number;
}

export interface VendorSpendingReport {
  startDate: string | null;
  endDate: string | null;
  totalVendorsCount: number;
  totalSpentPaise: number;
  vendors: VendorSpendingItem[];
}

export async function getVendorSpendingReport(
  filter: VendorSpendingFilter = {}
): Promise<VendorSpendingReport> {
  const safeLimit = Math.min(Math.max(filter.limit ?? 10, 1), 50);

  const conditions = [eq(orders.type, "PO")];

  if (filter.startDate) {
    conditions.push(gte(orders.invoiceDate, new Date(filter.startDate)));
  }

  if (filter.endDate) {
    const end = new Date(filter.endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(orders.invoiceDate, end));
  }

  // Fetch all POs matching filter
  const poList = await db
    .select({
      id: orders.id,
      contactId: orders.contactId,
      contactName: contacts.name,
      contactEmail: contacts.email,
      totalAmount: orders.totalAmount,
      status: orders.status,
    })
    .from(orders)
    .innerJoin(contacts, eq(orders.contactId, contacts.id))
    .where(and(...conditions));

  const vendorMap = new Map<string, VendorSpendingItem>();

  for (const po of poList) {
    const existing = vendorMap.get(po.contactId) ?? {
      vendorId: po.contactId,
      vendorName: po.contactName,
      vendorEmail: po.contactEmail,
      billCount: 0,
      totalSpentPaise: 0,
      totalPaidPaise: 0,
      outstandingBalancePaise: 0,
    };

    existing.billCount += 1;
    existing.totalSpentPaise += po.totalAmount;

    // Fetch payments for this order
    const orderPayments = await db
      .select({ amount: payments.amount })
      .from(payments)
      .where(eq(payments.orderId, po.id));

    const paidForPo = orderPayments.reduce((acc, p) => acc + p.amount, 0);
    existing.totalPaidPaise += paidForPo;
    existing.outstandingBalancePaise += Math.max(0, po.totalAmount - paidForPo);

    vendorMap.set(po.contactId, existing);
  }

  const vendorsList = Array.from(vendorMap.values());
  vendorsList.sort((a, b) => b.totalSpentPaise - a.totalSpentPaise);

  const limitedVendors = vendorsList.slice(0, safeLimit);
  const totalSpentPaise = vendorsList.reduce((acc, v) => acc + v.totalSpentPaise, 0);

  return {
    startDate: filter.startDate ?? null,
    endDate: filter.endDate ?? null,
    totalVendorsCount: vendorsList.length,
    totalSpentPaise,
    vendors: limitedVendors,
  };
}

// ---------------------------------------------------------------------------
// 2. Customer Revenue Report
// ---------------------------------------------------------------------------

export interface CustomerRevenueFilter {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  limit?: number; // max 50
}

export interface CustomerRevenueItem {
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  invoiceCount: number;
  totalRevenuePaise: number;
  totalPaidPaise: number;
  outstandingBalancePaise: number;
}

export interface CustomerRevenueReport {
  startDate: string | null;
  endDate: string | null;
  totalCustomersCount: number;
  totalRevenuePaise: number;
  customers: CustomerRevenueItem[];
}

export async function getCustomerRevenueReport(
  filter: CustomerRevenueFilter = {}
): Promise<CustomerRevenueReport> {
  const safeLimit = Math.min(Math.max(filter.limit ?? 10, 1), 50);

  const conditions = [eq(orders.type, "SO")];

  if (filter.startDate) {
    conditions.push(gte(orders.invoiceDate, new Date(filter.startDate)));
  }

  if (filter.endDate) {
    const end = new Date(filter.endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(orders.invoiceDate, end));
  }

  // Fetch all SOs matching filter
  const soList = await db
    .select({
      id: orders.id,
      contactId: orders.contactId,
      contactName: contacts.name,
      contactEmail: contacts.email,
      totalAmount: orders.totalAmount,
      status: orders.status,
    })
    .from(orders)
    .innerJoin(contacts, eq(orders.contactId, contacts.id))
    .where(and(...conditions));

  const customerMap = new Map<string, CustomerRevenueItem>();

  for (const so of soList) {
    const existing = customerMap.get(so.contactId) ?? {
      customerId: so.contactId,
      customerName: so.contactName,
      customerEmail: so.contactEmail,
      invoiceCount: 0,
      totalRevenuePaise: 0,
      totalPaidPaise: 0,
      outstandingBalancePaise: 0,
    };

    existing.invoiceCount += 1;
    existing.totalRevenuePaise += so.totalAmount;

    // Fetch payments for this order
    const orderPayments = await db
      .select({ amount: payments.amount })
      .from(payments)
      .where(eq(payments.orderId, so.id));

    const paidForSo = orderPayments.reduce((acc, p) => acc + p.amount, 0);
    existing.totalPaidPaise += paidForSo;
    existing.outstandingBalancePaise += Math.max(0, so.totalAmount - paidForSo);

    customerMap.set(so.contactId, existing);
  }

  const customersList = Array.from(customerMap.values());
  customersList.sort((a, b) => b.totalRevenuePaise - a.totalRevenuePaise);

  const limitedCustomers = customersList.slice(0, safeLimit);
  const totalRevenuePaise = customersList.reduce((acc, c) => acc + c.totalRevenuePaise, 0);

  return {
    startDate: filter.startDate ?? null,
    endDate: filter.endDate ?? null,
    totalCustomersCount: customersList.length,
    totalRevenuePaise,
    customers: limitedCustomers,
  };
}

// ---------------------------------------------------------------------------
// 3. Deterministic Ledger Anomalies Audit Service
// ---------------------------------------------------------------------------

export interface LedgerAnomalyFilter {
  startDate?: string;
  endDate?: string;
}

export async function getLedgerAnomaliesReport(
  filter: LedgerAnomalyFilter = {}
) {
  const audit = await runFullLedgerAudit(filter);

  return {
    totalAnomaliesCount: audit.totalFindingsCount,
    criticalCount: audit.criticalCount,
    warningCount: audit.highCount,
    infoCount: audit.lowCount + audit.mediumCount,
    findings: audit.findings,
  };
}
