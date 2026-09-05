import { getBalanceSheetReport } from "@/services/reports";
import { BalanceSheetClientShell } from "@/components/reports/balance-sheet-client-shell";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    asOfDate?: string;
  }>;
}

export default async function BalanceSheetReportPage({ searchParams }: PageProps) {
  const { asOfDate } = await searchParams;

  const report = await getBalanceSheetReport({
    asOfDate,
  });

  return <BalanceSheetClientShell report={report} />;
}
