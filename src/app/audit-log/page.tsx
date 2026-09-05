import React from "react";
import { PageHeader } from "@/components/common/page-header";
import { getAuditLogs, getAuditStats } from "@/services/audit";
import { AuditLogClient } from "@/components/audit/audit-log-client";
import { History, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ entityType?: string; search?: string }>;
}) {
  const params = await searchParams;
  const initialLogs = await getAuditLogs({
    entityType: params.entityType,
    search: params.search,
  });
  const stats = await getAuditStats();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Trail & Change Log"
        description="Immutable system change logs for compliance readiness, non-repudiation, and state diff inspection."
        badge={
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase bg-emerald-950 text-emerald-400 border border-emerald-900">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Audit Trail Active</span>
          </span>
        }
      />

      <AuditLogClient initialLogs={initialLogs} stats={stats} />
    </div>
  );
}
