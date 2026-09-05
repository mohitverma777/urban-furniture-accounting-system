import { describe, it, expect } from "vitest";
import { getDashboardMetrics } from "../index";

describe("Low Stock Reorder Alerts Service", () => {
  it("computes low stock alerts for inventory products", async () => {
    const metrics = await getDashboardMetrics();

    expect(metrics).toBeDefined();
    expect(metrics.lowStockAlerts).toBeDefined();
    expect(typeof metrics.lowStockCount).toBe("number");

    metrics.lowStockAlerts.forEach((alert) => {
      expect(alert.currentQty).toBeLessThanOrEqual(alert.reorderThreshold);
      expect(alert.recommendedReorderQty).toBeGreaterThan(0);
      expect(alert.estimatedReorderCost).toBeGreaterThanOrEqual(0);
      expect(["CRITICAL_OUT_OF_STOCK", "LOW_STOCK_WARNING"]).toContain(alert.status);
    });
  });
});
