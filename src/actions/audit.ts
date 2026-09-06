"use server";

import { getAuditLogs, getAuditStats, type AuditLogFilter } from "@/services/audit";

export async function getAuditLogsAction(filter?: AuditLogFilter) {
  try {
    const logs = await getAuditLogs(filter);
    const stats = await getAuditStats();
    return { success: true, logs, stats };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load audit logs",
      logs: [],
      stats: { totalLogs: 0, todayCount: 0, entityCounts: {} },
    };
  }
}
