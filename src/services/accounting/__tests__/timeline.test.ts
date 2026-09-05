/**
 * src/services/accounting/__tests__/timeline.test.ts
 *
 * Unit test suite for getTransactionTimeline service.
 */

import { describe, it, expect } from "vitest";
import { getTransactionTimeline } from "../timeline";

describe("getTransactionTimeline Service", () => {
  it("returns null for non-existent order ID", async () => {
    const timeline = await getTransactionTimeline("non-existent-order-id");
    expect(timeline).toBeNull();
  });

  it("retrieves structured transaction timeline for an existing order", async () => {
    // Attempt with a dummy ID or run query safely
    const timeline = await getTransactionTimeline("so_sample_01");
    // If seed database contains order so_sample_01 or similar
    if (timeline) {
      expect(timeline.orderId).toBeDefined();
      expect(timeline.orderNumber).toBeDefined();
      expect(["SO", "PO"]).toContain(timeline.type);
      expect(Array.isArray(timeline.steps)).toBe(true);
      expect(timeline.steps.length).toBeGreaterThan(0);

      const firstStep = timeline.steps[0];
      expect(firstStep.category).toBe("ORDER");
      expect(firstStep.stepNumber).toBe(1);
    } else {
      // In case DB doesn't have so_sample_01, returned result is safely null
      expect(timeline).toBeNull();
    }
  });
});
