import { describe, it, expect } from "vitest";
import { aggregateDailyDebitVolume } from "../journal-trend-sparkline";
import type { JournalEntryListItem } from "@/services/accounting/query";

describe("Journal Trend Sparkline Aggregation", () => {
  it("aggregates daily debit volume correctly from journal entry list items", () => {
    const mockEntries: JournalEntryListItem[] = [
      {
        id: "e1",
        journalId: "j1",
        journalName: "Sales Journal",
        journalType: "SALES",
        date: new Date("2026-03-01T10:00:00Z"),
        reference: "SO-1001",
        description: "Customer Invoice 1",
        totalDebit: 1500000, // ₹15,000
        totalCredit: 1500000,
        isBalanced: true,
        itemCount: 2,
      },
      {
        id: "e2",
        journalId: "j1",
        journalName: "Sales Journal",
        journalType: "SALES",
        date: new Date("2026-03-01T14:30:00Z"),
        reference: "SO-1002",
        description: "Customer Invoice 2",
        totalDebit: 2500000, // ₹25,000
        totalCredit: 2500000,
        isBalanced: true,
        itemCount: 2,
      },
      {
        id: "e3",
        journalId: "j2",
        journalName: "Bank Journal",
        journalType: "BANK",
        date: new Date("2026-03-02T09:00:00Z"),
        reference: "PAY-001",
        description: "Payment receipt",
        totalDebit: 4000000, // ₹40,000
        totalCredit: 4000000,
        isBalanced: true,
        itemCount: 2,
      },
    ];

    const aggregated = aggregateDailyDebitVolume(mockEntries);

    expect(aggregated).toHaveLength(2);

    // Day 1: 2026-03-01 -> ₹15,000 + ₹25,000 = ₹40,000 (40000 rupees)
    const day1 = aggregated.find((d) => d.dateKey === "2026-03-01");
    expect(day1).toBeDefined();
    expect(day1?.dailyDebit).toBe(40000);
    expect(day1?.entryCount).toBe(2);

    // Day 2: 2026-03-02 -> ₹40,000
    const day2 = aggregated.find((d) => d.dateKey === "2026-03-02");
    expect(day2).toBeDefined();
    expect(day2?.dailyDebit).toBe(40000);
    expect(day2?.entryCount).toBe(1);
  });
});
