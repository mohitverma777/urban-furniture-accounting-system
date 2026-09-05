/**
 * src/services/accounting/query.ts
 *
 * Database-derived query service for the Accounting Module:
 *   - Chart of Accounts
 *   - Journals Summary
 *   - Journal Entries & Entry Detail View
 *   - General Ledger with Running Balance
 */

import { db } from "@/db";
import {
  accounts,
  journals,
  journalEntries,
  journalItems,
  analyticAccounts,
  type Account,
  type AccountType,
  type JournalType,
} from "@/db/schema";
import { eq, and, gte, lte, like, or, sql, desc, asc } from "drizzle-orm";

// ---------------------------------------------------------------------------
// 1. Chart of Accounts Query
// ---------------------------------------------------------------------------

export interface GetAccountsFilter {
  search?: string;
  type?: AccountType | "ALL";
  status?: "ALL" | "ACTIVE" | "INACTIVE";
}

export async function getChartOfAccounts(filter: GetAccountsFilter = {}): Promise<Account[]> {
  const conditions = [];

  if (filter.status === "ACTIVE") {
    conditions.push(eq(accounts.isActive, true));
  } else if (filter.status === "INACTIVE") {
    conditions.push(eq(accounts.isActive, false));
  }

  if (filter.type && filter.type !== "ALL") {
    conditions.push(eq(accounts.type, filter.type));
  }

  if (filter.search && filter.search.trim() !== "") {
    const q = `%${filter.search.trim()}%`;
    conditions.push(or(like(accounts.code, q), like(accounts.name, q))!);
  }

  return await db
    .select()
    .from(accounts)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(accounts.code));
}

// ---------------------------------------------------------------------------
// 2. Journals List Query
// ---------------------------------------------------------------------------

export interface JournalSummaryItem {
  id: string;
  name: string;
  type: JournalType;
  defaultAccountId: string | null;
  defaultAccountCode: string | null;
  defaultAccountName: string | null;
  totalEntriesCount: number;
  lastPostingDate: Date | null;
}

export async function getJournalsList(): Promise<JournalSummaryItem[]> {
  const allJournals = await db
    .select({
      id: journals.id,
      name: journals.name,
      type: journals.type,
      defaultAccountId: journals.defaultAccountId,
      defaultAccountCode: accounts.code,
      defaultAccountName: accounts.name,
    })
    .from(journals)
    .leftJoin(accounts, eq(journals.defaultAccountId, accounts.id))
    .orderBy(journals.name);

  const result: JournalSummaryItem[] = [];

  for (const j of allJournals) {
    const [countRes] = await db
      .select({ total: sql<number>`count(*)` })
      .from(journalEntries)
      .where(eq(journalEntries.journalId, j.id));

    const [latestRes] = await db
      .select({ maxDate: journalEntries.date })
      .from(journalEntries)
      .where(eq(journalEntries.journalId, j.id))
      .orderBy(desc(journalEntries.date))
      .limit(1);

    result.push({
      id: j.id,
      name: j.name,
      type: j.type,
      defaultAccountId: j.defaultAccountId,
      defaultAccountCode: j.defaultAccountCode,
      defaultAccountName: j.defaultAccountName,
      totalEntriesCount: Number(countRes?.total ?? 0),
      lastPostingDate: latestRes?.maxDate ? new Date(latestRes.maxDate) : null,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// 3. Journal Entries Query
// ---------------------------------------------------------------------------

export interface GetJournalEntriesFilter {
  journalId?: string | "ALL";
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  reference?: string;
}

export interface JournalEntryListItem {
  id: string;
  journalId: string;
  journalName: string;
  journalType: JournalType;
  date: Date;
  reference: string | null;
  description: string | null;
  totalDebit: number; // in Paise
  totalCredit: number; // in Paise
  isBalanced: boolean;
  itemCount: number;
}

export async function getJournalEntries(
  filter: GetJournalEntriesFilter = {}
): Promise<JournalEntryListItem[]> {
  const conditions = [];

  if (filter.journalId && filter.journalId !== "ALL") {
    conditions.push(eq(journalEntries.journalId, filter.journalId));
  }

  if (filter.startDate) {
    conditions.push(gte(journalEntries.date, new Date(filter.startDate)));
  }

  if (filter.endDate) {
    // End of day (23:59:59)
    const end = new Date(filter.endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(journalEntries.date, end));
  }

  if (filter.reference && filter.reference.trim() !== "") {
    const q = `%${filter.reference.trim()}%`;
    conditions.push(
      or(
        like(journalEntries.reference, q),
        like(journalEntries.description, q)
      )!
    );
  }

  const entries = await db
    .select({
      id: journalEntries.id,
      journalId: journalEntries.journalId,
      journalName: journals.name,
      journalType: journals.type,
      date: journalEntries.date,
      reference: journalEntries.reference,
      description: journalEntries.description,
    })
    .from(journalEntries)
    .innerJoin(journals, eq(journalEntries.journalId, journals.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(journalEntries.date), desc(journalEntries.createdAt));

  const result: JournalEntryListItem[] = [];

  for (const entry of entries) {
    const items = await db
      .select({
        debit: journalItems.debit,
        credit: journalItems.credit,
      })
      .from(journalItems)
      .where(eq(journalItems.entryId, entry.id));

    let totalDebit = 0;
    let totalCredit = 0;
    for (const i of items) {
      totalDebit += i.debit;
      totalCredit += i.credit;
    }

    result.push({
      ...entry,
      date: new Date(entry.date),
      totalDebit,
      totalCredit,
      isBalanced: totalDebit === totalCredit && totalDebit > 0,
      itemCount: items.length,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// 4. Journal Entry Detail View Query
// ---------------------------------------------------------------------------

export interface JournalItemDetail {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  analyticAccountId: string | null;
  analyticAccountName: string | null;
  debit: number; // in Paise
  credit: number; // in Paise
}

export interface JournalEntryDetail {
  id: string;
  journalId: string;
  journalName: string;
  journalType: JournalType;
  date: Date;
  reference: string | null;
  description: string | null;
  items: JournalItemDetail[];
  totalDebit: number;
  totalCredit: number;
  difference: number;
  isBalanced: boolean;
}

export async function getJournalEntryById(id: string): Promise<JournalEntryDetail | null> {
  const [entry] = await db
    .select({
      id: journalEntries.id,
      journalId: journalEntries.journalId,
      journalName: journals.name,
      journalType: journals.type,
      date: journalEntries.date,
      reference: journalEntries.reference,
      description: journalEntries.description,
    })
    .from(journalEntries)
    .innerJoin(journals, eq(journalEntries.journalId, journals.id))
    .where(eq(journalEntries.id, id));

  if (!entry) return null;

  const rawItems = await db
    .select({
      id: journalItems.id,
      accountId: journalItems.accountId,
      accountCode: accounts.code,
      accountName: accounts.name,
      accountType: accounts.type,
      analyticAccountId: journalItems.analyticAccountId,
      debit: journalItems.debit,
      credit: journalItems.credit,
    })
    .from(journalItems)
    .innerJoin(accounts, eq(journalItems.accountId, accounts.id))
    .where(eq(journalItems.entryId, id));

  const items: JournalItemDetail[] = await Promise.all(
    rawItems.map(async (i) => {
      let analyticAccountName: string | null = null;

      if (i.analyticAccountId) {
        const [an] = await db
          .select()
          .from(analyticAccounts)
          .where(eq(analyticAccounts.id, i.analyticAccountId));
        if (an) {
          analyticAccountName = an.name;
        }
      }

      return {
        ...i,
        analyticAccountName,
      };
    })
  );

  let totalDebit = 0;
  let totalCredit = 0;
  for (const i of items) {
    totalDebit += i.debit;
    totalCredit += i.credit;
  }

  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  return {
    ...entry,
    date: new Date(entry.date),
    items,
    totalDebit,
    totalCredit,
    difference,
    isBalanced,
  };
}

// ---------------------------------------------------------------------------
// 5. General Ledger Query with Running Balance
// ---------------------------------------------------------------------------

export interface LedgerFilter {
  accountId: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

export interface LedgerTransactionRow {
  itemId: string;
  entryId: string;
  date: Date;
  reference: string | null;
  description: string | null;
  journalName: string;
  debit: number; // in Paise
  credit: number; // in Paise
  runningBalance: number; // in Paise
}

export interface GeneralLedgerReport {
  account: Account;
  startDate: string | null;
  endDate: string | null;
  openingBalance: number; // in Paise
  periodDebit: number; // in Paise
  periodCredit: number; // in Paise
  closingBalance: number; // in Paise
  transactions: LedgerTransactionRow[];
}

export async function getGeneralLedger(filter: LedgerFilter): Promise<GeneralLedgerReport | null> {
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, filter.accountId));

  if (!account) return null;

  const isDebitNormal = account.type === "ASSET" || account.type === "EXPENSE";

  // 1. Compute Opening Balance (prior to startDate)
  let openingBalance = 0;

  if (filter.startDate) {
    const start = new Date(filter.startDate);
    const priorItems = await db
      .select({
        debit: journalItems.debit,
        credit: journalItems.credit,
      })
      .from(journalItems)
      .innerJoin(journalEntries, eq(journalItems.entryId, journalEntries.id))
      .where(
        and(
          eq(journalItems.accountId, filter.accountId),
          lte(journalEntries.date, new Date(start.getTime() - 1))
        )
      );

    for (const pi of priorItems) {
      if (isDebitNormal) {
        openingBalance += pi.debit - pi.credit;
      } else {
        openingBalance += pi.credit - pi.debit;
      }
    }
  }

  // 2. Fetch Period Transactions
  const periodConditions = [eq(journalItems.accountId, filter.accountId)];

  if (filter.startDate) {
    periodConditions.push(gte(journalEntries.date, new Date(filter.startDate)));
  }

  if (filter.endDate) {
    const end = new Date(filter.endDate);
    end.setHours(23, 59, 59, 999);
    periodConditions.push(lte(journalEntries.date, end));
  }

  const rawTransactions = await db
    .select({
      itemId: journalItems.id,
      entryId: journalEntries.id,
      date: journalEntries.date,
      reference: journalEntries.reference,
      description: journalEntries.description,
      journalName: journals.name,
      debit: journalItems.debit,
      credit: journalItems.credit,
    })
    .from(journalItems)
    .innerJoin(journalEntries, eq(journalItems.entryId, journalEntries.id))
    .innerJoin(journals, eq(journalEntries.journalId, journals.id))
    .where(and(...periodConditions))
    .orderBy(asc(journalEntries.date), asc(journalEntries.createdAt));

  // 3. Compute Period Totals & Row-by-Row Running Balance
  let periodDebit = 0;
  let periodCredit = 0;
  let currentRunningBalance = openingBalance;

  const transactions: LedgerTransactionRow[] = [];

  for (const tx of rawTransactions) {
    periodDebit += tx.debit;
    periodCredit += tx.credit;

    if (isDebitNormal) {
      currentRunningBalance += tx.debit - tx.credit;
    } else {
      currentRunningBalance += tx.credit - tx.debit;
    }

    transactions.push({
      itemId: tx.itemId,
      entryId: tx.entryId,
      date: new Date(tx.date),
      reference: tx.reference,
      description: tx.description,
      journalName: tx.journalName,
      debit: tx.debit,
      credit: tx.credit,
      runningBalance: currentRunningBalance,
    });
  }

  return {
    account,
    startDate: filter.startDate ?? null,
    endDate: filter.endDate ?? null,
    openingBalance,
    periodDebit,
    periodCredit,
    closingBalance: currentRunningBalance,
    transactions,
  };
}
