import { getProfitAndLossReport } from "@/services/reports";
import { ProfitLossClientShell } from "@/components/reports/profit-loss-client-shell";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function ProfitLossReportPage({ searchParams }: PageProps) {
  const { startDate, endDate } = await searchParams;

  const report = await getProfitAndLossReport({
    startDate,
    endDate,
  });

  return <ProfitLossClientShell report={report} />;
}
