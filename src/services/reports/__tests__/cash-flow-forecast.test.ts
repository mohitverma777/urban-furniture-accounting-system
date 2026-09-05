import { describe, it, expect, beforeAll } from "vitest";
import { getCashFlowForecast, getCashAccounts } from "../cash-flow-forecast";

describe("AI Cash Flow Forecasting Service", () => {
  it("fetches available cash/bank accounts", async () => {
    const accountsList = await getCashAccounts();
    expect(accountsList.length).toBeGreaterThan(0);
    expect(accountsList[0]).toHaveProperty("code");
    expect(accountsList[0]).toHaveProperty("name");
  });

  it("calculates linear regression and 3-month cash flow forecast", async () => {
    const forecast = await getCashFlowForecast({ forecastMonths: 3 });

    expect(forecast).toBeDefined();
    expect(forecast.account).toHaveProperty("code");
    expect(forecast.historicalData.length).toBeGreaterThan(0);
    expect(forecast.forecastData.length).toBe(3);

    // Verify 95% confidence bounds
    forecast.forecastData.forEach((point) => {
      expect(point.isForecast).toBe(true);
      expect(point.upperBand).toBeDefined();
      expect(point.lowerBand).toBeDefined();
      expect(point.upperBand!).toBeGreaterThanOrEqual(point.forecastedBalance!);
      expect(point.lowerBand!).toBeLessThanOrEqual(point.forecastedBalance!);
    });

    // Verify model metrics
    expect(forecast.rSquared).toBeGreaterThanOrEqual(0);
    expect(forecast.rSquared).toBeLessThanOrEqual(1);
    expect(["GROWTH", "STABLE", "DECLINE"]).toContain(forecast.trendDirection);
    expect(forecast.aiNarrative.length).toBeGreaterThan(20);
  });

  it("handles custom account selection for forecasting", async () => {
    const accountsList = await getCashAccounts();
    if (accountsList.length > 0) {
      const selectedId = accountsList[0].id;
      const forecast = await getCashFlowForecast({ accountId: selectedId, forecastMonths: 3 });
      expect(forecast.account.id).toBe(selectedId);
    }
  });
});
