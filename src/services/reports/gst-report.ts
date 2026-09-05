/**
 * src/services/reports/gst-report.ts
 *
 * GST Tax Summary Report Service — Indian GST Compliance.
 *
 * Derives GST data strictly from order_items (taxRate, taxAmount),
 * joined through orders for date, type, and contact information.
 *
 * Indian GST Rules Applied:
 *   - Output Tax = GST collected on Sales Orders (SO)
 *   - Input Tax Credit (ITC) = GST paid on Purchase Orders (PO)
 *   - Net GST Liability = Output Tax − ITC
 *
 *   For tax rate splits:
 *   - 18% GST → CGST 9% + SGST 9% (intra-state, default)
 *   - 12% GST → CGST 6% + SGST 6%
 *   - 5%  GST → CGST 2.5% + SGST 2.5%
 *   - 28% GST → CGST 14% + SGST 14%
 *   (IGST applies for inter-state — flagged via contact.state vs business state)
 *
 *  All amounts in INTEGER PAISE. Displayed as INR by UI layer.
 */

import { db } from "@/db";
import {
  orders,
  orderItems,
  contacts,
  products,
} from "@/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GSTRateSlab {
  /** Tax rate in integer percent (e.g. 18, 12, 5, 28, 0) */
  rate: number;
  /** CGST = rate / 2 (intra-state) */
  cgstRate: number;
  /** SGST = rate / 2 (intra-state) */
  sgstRate: number;
  /** Total taxable value (subtotal) for this slab — paise */
  taxableValue: number;
  /** Total CGST collected — paise */
  cgstAmount: number;
  /** Total SGST collected — paise */
  sgstAmount: number;
  /** Total IGST collected (inter-state, for future) — paise */
  igstAmount: number;
  /** Total tax (CGST + SGST + IGST) — paise */
  totalTax: number;
  /** Number of transactions in this slab */
  transactionCount: number;
}

export interface GSTMonthlyRow {
  /** e.g. "2026-01" */
  monthKey: string;
  /** e.g. "January 2026" */
  monthLabel: string;
  /** Output Tax Slabs (from Sales Orders) */
  outputSlabs: GSTRateSlab[];
  /** Input Tax Credit Slabs (from Purchase Orders) */
  inputSlabs: GSTRateSlab[];
  /** Total output tax collected this month — paise */
  totalOutputTax: number;
  /** Total input tax credit this month — paise */
  totalInputTax: number;
  /** Net GST liability this month — paise */
  netGSTLiability: number;
  /** Total taxable sales value — paise */
  totalSalesTaxableValue: number;
  /** Total taxable purchase value — paise */
  totalPurchaseTaxableValue: number;
}

export interface GSTSummaryReport {
  /** Applied filters */
  financialYear: string;
  startDate: string | null;
  endDate: string | null;

  /** Month-by-month breakdown */
  monthlyRows: GSTMonthlyRow[];

  /** Aggregate totals */
  totalOutputTax: number;     // paise
  totalInputTaxCredit: number; // paise
  netGSTPayable: number;       // paise (positive = owe, negative = refund due)

  /** Total taxable turnovers */
  totalSalesTurnover: number;   // paise
  totalPurchaseTurnover: number; // paise

  /** Slab-level aggregates across all months */
  outputSlabTotals: GSTRateSlab[];
  inputSlabTotals: GSTRateSlab[];

  /** Metadata */
  hasData: boolean;
  generatedAt: string;
}

export interface GSTReportFilter {
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  financialYear?: string; // e.g. "2026-27"
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert taxRate stored as hundredths of a percent (1800 → 18) to integer percent */
function toIntPercent(storedRate: number): number {
  return Math.round(storedRate / 100);
}

/** Split total GST into CGST + SGST (50/50 split for intra-state) */
function splitGST(totalTaxPaise: number, taxRatePercent: number): {
  cgst: number;
  sgst: number;
  igst: number;
} {
  // For this implementation we use CGST+SGST split (intra-state default)
  // In a full implementation, inter-state transactions would use IGST
  const half = Math.round(totalTaxPaise / 2);
  return {
    cgst: half,
    sgst: totalTaxPaise - half, // remainder avoids rounding issues
    igst: 0,
  };
}

function emptyRateSlab(rate: number): GSTRateSlab {
  const cgstRate = rate / 2;
  return {
    rate,
    cgstRate,
    sgstRate: cgstRate,
    taxableValue: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
    totalTax: 0,
    transactionCount: 0,
  };
}

const KNOWN_SLABS = [0, 5, 12, 18, 28];

function getMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function buildSlabMap(): Map<number, GSTRateSlab> {
  const map = new Map<number, GSTRateSlab>();
  for (const rate of KNOWN_SLABS) {
    map.set(rate, emptyRateSlab(rate));
  }
  return map;
}

// ---------------------------------------------------------------------------
// Main Service
// ---------------------------------------------------------------------------

export async function getGSTSummaryReport(
  filter: GSTReportFilter = {}
): Promise<GSTSummaryReport> {
  const conditions: ReturnType<typeof gte>[] = [];

  // Date filter
  if (filter.startDate) {
    conditions.push(gte(orders.invoiceDate, new Date(filter.startDate)));
  }
  if (filter.endDate) {
    const end = new Date(filter.endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(orders.invoiceDate, end));
  }

  // Fetch all order items with their parent order + contact info
  const rawRows = await db
    .select({
      orderId: orders.id,
      orderType: orders.type,
      invoiceDate: orders.invoiceDate,
      taxRate: orderItems.taxRate,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      taxAmount: orderItems.taxAmount,
      lineSubtotal: sql<number>`(${orderItems.unitPrice} * ${orderItems.quantity})`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(
      conditions.length > 0
        ? and(...(conditions as Parameters<typeof and>))
        : undefined
    )
    .orderBy(orders.invoiceDate);

  if (rawRows.length === 0) {
    return {
      financialYear: filter.financialYear ?? getCurrentFY(),
      startDate: filter.startDate ?? null,
      endDate: filter.endDate ?? null,
      monthlyRows: [],
      totalOutputTax: 0,
      totalInputTaxCredit: 0,
      netGSTPayable: 0,
      totalSalesTurnover: 0,
      totalPurchaseTurnover: 0,
      outputSlabTotals: KNOWN_SLABS.map(emptyRateSlab),
      inputSlabTotals: KNOWN_SLABS.map(emptyRateSlab),
      hasData: false,
      generatedAt: new Date().toISOString(),
    };
  }

  // Group by month × order type × rate slab
  const monthlyMap = new Map<string, {
    output: Map<number, GSTRateSlab>;
    input: Map<number, GSTRateSlab>;
  }>();

  for (const row of rawRows) {
    if (!row.invoiceDate) continue;

    const date = new Date(row.invoiceDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, {
        output: buildSlabMap(),
        input: buildSlabMap(),
      });
    }

    const monthData = monthlyMap.get(monthKey)!;
    const ratePercent = toIntPercent(row.taxRate);
    const slabMap = row.orderType === "SO" ? monthData.output : monthData.input;

    // Ensure slab exists (for unusual rates not in KNOWN_SLABS)
    if (!slabMap.has(ratePercent)) {
      slabMap.set(ratePercent, emptyRateSlab(ratePercent));
    }

    const slab = slabMap.get(ratePercent)!;
    const { cgst, sgst, igst } = splitGST(row.taxAmount, ratePercent);

    slab.taxableValue += row.lineSubtotal;
    slab.cgstAmount += cgst;
    slab.sgstAmount += sgst;
    slab.igstAmount += igst;
    slab.totalTax += row.taxAmount;
    slab.transactionCount += 1;
  }

  // Build aggregated slab totals
  const aggOutputSlabs = new Map<number, GSTRateSlab>(
    KNOWN_SLABS.map(r => [r, emptyRateSlab(r)])
  );
  const aggInputSlabs = new Map<number, GSTRateSlab>(
    KNOWN_SLABS.map(r => [r, emptyRateSlab(r)])
  );

  // Assemble monthly rows (sorted chronologically)
  const monthlyRows: GSTMonthlyRow[] = [];
  let totalOutputTax = 0;
  let totalInputTax = 0;
  let totalSalesTurnover = 0;
  let totalPurchaseTurnover = 0;

  const sortedMonths = Array.from(monthlyMap.keys()).sort();

  for (const monthKey of sortedMonths) {
    const { output, input } = monthlyMap.get(monthKey)!;

    const outputSlabs = Array.from(output.values()).filter(s => s.taxableValue > 0 || s.totalTax > 0);
    const inputSlabs = Array.from(input.values()).filter(s => s.taxableValue > 0 || s.totalTax > 0);

    const monthOutputTax = outputSlabs.reduce((sum, s) => sum + s.totalTax, 0);
    const monthInputTax = inputSlabs.reduce((sum, s) => sum + s.totalTax, 0);
    const monthSalesValue = outputSlabs.reduce((sum, s) => sum + s.taxableValue, 0);
    const monthPurchaseValue = inputSlabs.reduce((sum, s) => sum + s.taxableValue, 0);

    totalOutputTax += monthOutputTax;
    totalInputTax += monthInputTax;
    totalSalesTurnover += monthSalesValue;
    totalPurchaseTurnover += monthPurchaseValue;

    // Aggregate into global slab totals
    for (const slab of outputSlabs) {
      if (!aggOutputSlabs.has(slab.rate)) aggOutputSlabs.set(slab.rate, emptyRateSlab(slab.rate));
      const agg = aggOutputSlabs.get(slab.rate)!;
      agg.taxableValue += slab.taxableValue;
      agg.cgstAmount += slab.cgstAmount;
      agg.sgstAmount += slab.sgstAmount;
      agg.igstAmount += slab.igstAmount;
      agg.totalTax += slab.totalTax;
      agg.transactionCount += slab.transactionCount;
    }
    for (const slab of inputSlabs) {
      if (!aggInputSlabs.has(slab.rate)) aggInputSlabs.set(slab.rate, emptyRateSlab(slab.rate));
      const agg = aggInputSlabs.get(slab.rate)!;
      agg.taxableValue += slab.taxableValue;
      agg.cgstAmount += slab.cgstAmount;
      agg.sgstAmount += slab.sgstAmount;
      agg.igstAmount += slab.igstAmount;
      agg.totalTax += slab.totalTax;
      agg.transactionCount += slab.transactionCount;
    }

    monthlyRows.push({
      monthKey,
      monthLabel: getMonthLabel(monthKey),
      outputSlabs,
      inputSlabs,
      totalOutputTax: monthOutputTax,
      totalInputTax: monthInputTax,
      netGSTLiability: monthOutputTax - monthInputTax,
      totalSalesTaxableValue: monthSalesValue,
      totalPurchaseTaxableValue: monthPurchaseValue,
    });
  }

  const netGSTPayable = totalOutputTax - totalInputTax;

  return {
    financialYear: filter.financialYear ?? getCurrentFY(),
    startDate: filter.startDate ?? null,
    endDate: filter.endDate ?? null,
    monthlyRows,
    totalOutputTax,
    totalInputTaxCredit: totalInputTax,
    netGSTPayable,
    totalSalesTurnover,
    totalPurchaseTurnover,
    outputSlabTotals: Array.from(aggOutputSlabs.values()),
    inputSlabTotals: Array.from(aggInputSlabs.values()),
    hasData: rawRows.length > 0,
    generatedAt: new Date().toISOString(),
  };
}

/** Get current Indian Financial Year string (e.g. "2026-27") */
function getCurrentFY(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-indexed
  // Indian FY runs April to March
  if (month >= 4) {
    return `${year}-${String(year + 1).slice(2)}`;
  } else {
    return `${year - 1}-${String(year).slice(2)}`;
  }
}

/** Get start and end dates for a given Indian Financial Year */
export function getFYDateRange(fy: string): { startDate: string; endDate: string } {
  const [startYearStr] = fy.split("-");
  const startYear = parseInt(startYearStr);
  return {
    startDate: `${startYear}-04-01`,
    endDate: `${startYear + 1}-03-31`,
  };
}
