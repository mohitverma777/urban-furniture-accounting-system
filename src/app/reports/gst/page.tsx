/**
 * /reports/gst — GST Tax Summary Report Page
 *
 * Server component: fetches data, passes to client shell.
 * Supports FY (financial year) and custom date range query params.
 */

import { getGSTSummaryReport, getFYDateRange } from "@/services/reports";
import { GSTClientShell } from "@/components/reports/gst-client-shell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "GST Tax Summary Report | Urban Furniture Accounting",
  description:
    "Indian GST compliance report with CGST, SGST, and IGST breakdown per month and rate slab. Compute net GST payable vs Input Tax Credit.",
};

interface PageProps {
  searchParams: Promise<{
    fy?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function GSTReportPage({ searchParams }: PageProps) {
  const { fy, startDate, endDate } = await searchParams;

  let resolvedStart = startDate;
  let resolvedEnd = endDate;
  let financialYear = fy;

  // If FY is provided but no custom date range, derive dates from FY
  if (fy && !startDate && !endDate) {
    const range = getFYDateRange(fy);
    resolvedStart = range.startDate;
    resolvedEnd = range.endDate;
    financialYear = fy;
  }

  // Default to current FY if nothing is provided
  if (!resolvedStart && !resolvedEnd && !fy) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const fyStartYear = month >= 4 ? year : year - 1;
    financialYear = `${fyStartYear}-${String(fyStartYear + 1).slice(2)}`;
    const range = getFYDateRange(financialYear);
    resolvedStart = range.startDate;
    resolvedEnd = range.endDate;
  }

  const report = await getGSTSummaryReport({
    startDate: resolvedStart,
    endDate: resolvedEnd,
    financialYear,
  });

  return <GSTClientShell report={report} />;
}
