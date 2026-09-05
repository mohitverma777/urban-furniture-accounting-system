/**
 * src/services/accounting/__tests__/accounting-module.test.ts
 *
 * Unit tests for Accounting Module query service:
 *   - Chart of Accounts search & filtering
 *   - Journals summary & entry counts
 *   - Journal Entries list & detail view with balance calculation
 *   - General Ledger with Opening Balance & Running Balance per account type
 */

import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";
import {
  accounts,
  journals,
  journalEntries,
  journalItems,
  orders,
  payments,
} from "@/db/schema";
import {
  getChartOfAccounts,
  getJournalsList,
  getJournalEntries,
  getJournalEntryById,
  getGeneralLedger,
} from "../query";
import { createJournalEntry } from "../index";
import { eq } from "drizzle-orm";

describe("Accounting Module Query Services", () => {
  let salesJournalId: string;
  let bankJournalId: string;
  let debtorsAccountId: string;
  let bankAccountId: string;
  let salesIncomeAccountId: string;

  beforeEach(async () => {
    // Clean up accounting test data in FK dependency order
    await db.delete(payments);
    await db.delete(orders);
    await db.delete(journalItems);
    await db.delete(journalEntries);

    // Fetch fixture journal IDs
    const [sj] = await db.select().from(journals).where(eq(journals.type, "SALES"));
    salesJournalId = sj.id;

    const [bj] = await db.select().from(journals).where(eq(journals.type, "BANK"));
    bankJournalId = bj.id;

    // Fetch fixture account IDs
    const [debtors] = await db.select().from(accounts).where(eq(accounts.code, "1100"));
    debtorsAccountId = debtors.id;

    const [bank] = await db.select().from(accounts).where(eq(accounts.code, "1010"));
    bankAccountId = bank.id;

    const [sales] = await db.select().from(accounts).where(eq(accounts.code, "4000"));
    salesIncomeAccountId = sales.id;

    // Create 2 test journal entries
    // Entry 1 (Dated Jan 10, 2026): Customer Invoice ₹10,000 (1000000 paise)
    await createJournalEntry({
      journalId: salesJournalId,
      date: new Date("2026-01-10T10:00:00Z"),
      reference: "INV-SO-TEST-101",
      description: "Sales Invoice #101",
      lines: [
        { accountId: debtorsAccountId, debit: 1000000, credit: 0 },
        { accountId: salesIncomeAccountId, debit: 0, credit: 1000000 },
      ],
    });

    // Entry 2 (Dated Jan 15, 2026): Customer Payment ₹6,000 (600000 paise)
    await createJournalEntry({
      journalId: bankJournalId,
      date: new Date("2026-01-15T10:00:00Z"),
      reference: "PAY-SO-TEST-101",
      description: "Bank receipt from customer #101",
      lines: [
        { accountId: bankAccountId, debit: 600000, credit: 0 },
        { accountId: debtorsAccountId, debit: 0, credit: 600000 },
      ],
    });
  });

  describe("getChartOfAccounts()", () => {
    it("returns all chart of accounts sorted by code", async () => {
      const accList = await getChartOfAccounts();
      expect(accList.length).toBeGreaterThan(0);
      expect(accList[0].code <= accList[accList.length - 1].code).toBe(true);
    });

    it("filters accounts by account type", async () => {
      const assets = await getChartOfAccounts({ type: "ASSET" });
      expect(assets.length).toBeGreaterThan(0);
      expect(assets.every((a) => a.type === "ASSET")).toBe(true);
    });

    it("filters accounts by search query code or name", async () => {
      const searchRes = await getChartOfAccounts({ search: "Debtors" });
      expect(searchRes.length).toBe(1);
      expect(searchRes[0].code).toBe("1100");
    });
  });

  describe("getJournalsList()", () => {
    it("returns summary for all 4 journals with entry counts and latest dates", async () => {
      const summary = await getJournalsList();
      expect(summary.length).toBe(4);

      const salesJ = summary.find((j) => j.type === "SALES");
      expect(salesJ).toBeTruthy();
      expect(salesJ!.totalEntriesCount).toBe(1);
      expect(salesJ!.lastPostingDate).toBeTruthy();

      const bankJ = summary.find((j) => j.type === "BANK");
      expect(bankJ).toBeTruthy();
      expect(bankJ!.totalEntriesCount).toBe(1);
    });
  });

  describe("getJournalEntries() & getJournalEntryById()", () => {
    it("fetches journal entries list with filters", async () => {
      const entries = await getJournalEntries({ reference: "INV-SO-TEST-101" });
      expect(entries.length).toBe(1);
      expect(entries[0].reference).toBe("INV-SO-TEST-101");
      expect(entries[0].totalDebit).toBe(1000000);
      expect(entries[0].totalCredit).toBe(1000000);
      expect(entries[0].isBalanced).toBe(true);
    });

    it("fetches single entry detail view with itemized lines and balance status", async () => {
      const list = await getJournalEntries({ reference: "INV-SO-TEST-101" });
      const detail = await getJournalEntryById(list[0].id);

      expect(detail).toBeTruthy();
      expect(detail?.items.length).toBe(2);
      expect(detail?.totalDebit).toBe(1000000);
      expect(detail?.totalCredit).toBe(1000000);
      expect(detail?.difference).toBe(0);
      expect(detail?.isBalanced).toBe(true);
    });
  });

  describe("getGeneralLedger()", () => {
    it("computes running balance for ASSET account (Debtors)", async () => {
      const ledger = await getGeneralLedger({ accountId: debtorsAccountId });
      expect(ledger).toBeTruthy();
      expect(ledger?.account.code).toBe("1100");
      expect(ledger?.transactions.length).toBe(2);

      // Tx 1: Dr 1,000,000 -> Running Balance = 1,000,000
      expect(ledger?.transactions[0].debit).toBe(1000000);
      expect(ledger?.transactions[0].runningBalance).toBe(1000000);

      // Tx 2: Cr 600,000 -> Running Balance = 400,000 (1000000 - 600000)
      expect(ledger?.transactions[1].credit).toBe(600000);
      expect(ledger?.transactions[1].runningBalance).toBe(400000);

      expect(ledger?.closingBalance).toBe(400000);
    });

    it("computes opening balance correctly when date range filter is applied", async () => {
      // Filter for transactions on or after Jan 12, 2026 (Jan 10 transaction becomes opening balance)
      const ledger = await getGeneralLedger({
        accountId: debtorsAccountId,
        startDate: "2026-01-12",
      });

      expect(ledger).toBeTruthy();
      // Opening Balance = +1,000,000 paise from Jan 10 invoice
      expect(ledger?.openingBalance).toBe(1000000);
      expect(ledger?.transactions.length).toBe(1); // Only Jan 15 receipt in period

      // Tx (Jan 15): Cr 600,000 -> Running Balance = 400,000
      expect(ledger?.transactions[0].runningBalance).toBe(400000);
      expect(ledger?.closingBalance).toBe(400000);
    });
  });
});
