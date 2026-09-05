import { describe, it, expect } from "vitest";
import { recordAuditLog, getAuditLogs, getAuditStats } from "../index";

describe("Audit Trail & Change Log Service", () => {
  it("records an audit log event and retrieves it", async () => {
    const testEntityId = `test-entity-${Date.now()}`;

    const logged = await recordAuditLog({
      entityType: "ORDER",
      entityId: testEntityId,
      action: "CREATE",
      changedBy: "Test Suite",
      oldValue: null,
      newValue: { orderNumber: "SO-TEST-999", totalAmount: 150000 },
    });

    expect(logged).toBeDefined();
    expect(logged.entityType).toBe("ORDER");
    expect(logged.entityId).toBe(testEntityId);
    expect(logged.action).toBe("CREATE");
    expect(logged.changedBy).toBe("Test Suite");

    // Retrieve logs for this entity
    const logs = await getAuditLogs({ entityId: testEntityId });
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].entityId).toBe(testEntityId);
    expect(JSON.parse(logs[0].newValue!)).toEqual({
      orderNumber: "SO-TEST-999",
      totalAmount: 150000,
    });
  });

  it("records status change events with old vs new values", async () => {
    const testEntityId = `test-status-${Date.now()}`;

    await recordAuditLog({
      entityType: "BUDGET",
      entityId: testEntityId,
      action: "STATUS_CHANGE",
      changedBy: "Accountant User",
      oldValue: { status: "DRAFT", plannedAmount: 500000 },
      newValue: { status: "BILLED", plannedAmount: 500000 },
    });

    const logs = await getAuditLogs({ entityType: "BUDGET", entityId: testEntityId });
    expect(logs.length).toBe(1);
    expect(logs[0].action).toBe("STATUS_CHANGE");

    const oldVal = JSON.parse(logs[0].oldValue!);
    const newVal = JSON.parse(logs[0].newValue!);

    expect(oldVal.status).toBe("DRAFT");
    expect(newVal.status).toBe("BILLED");
  });

  it("computes audit trail summary statistics", async () => {
    const stats = await getAuditStats();

    expect(stats).toBeDefined();
    expect(stats.totalLogs).toBeGreaterThan(0);
    expect(typeof stats.todayCount).toBe("number");
    expect(stats.entityCounts).toBeDefined();
  });
});
