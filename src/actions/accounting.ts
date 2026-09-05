"use server";

import { revalidatePath } from "next/cache";
import {
  getGeneralLedger,
  getJournalEntryById,
  type LedgerFilter,
} from "@/services/accounting/query";
import { createJournalEntry, createJournal, type JournalLineInput } from "@/services/accounting";

export async function createJournalAction(data: {
  name: string;
  type: "SALES" | "PURCHASE" | "BANK" | "CASH";
  defaultAccountId?: string | null;
}) {
  try {
    const journal = await createJournal(data);
    revalidatePath("/accounting");
    return { success: true, journal };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create journal",
    };
  }
}

export async function getGeneralLedgerAction(filter: LedgerFilter) {
  return await getGeneralLedger(filter);
}

export async function getJournalEntryByIdAction(entryId: string) {
  return await getJournalEntryById(entryId);
}

export interface CreateManualJournalEntryValues {
  journalId: string;
  date: string;
  reference?: string;
  description?: string;
  partnerId?: string;
  lines: {
    accountId: string;
    partnerId?: string;
    debit: number;
    credit: number;
  }[];
}

export async function createManualJournalEntryAction(
  data: CreateManualJournalEntryValues
) {
  try {
    const formattedLines: JournalLineInput[] = data.lines.map((l) => ({
      accountId: l.accountId,
      debit: Math.round(l.debit * 100),
      credit: Math.round(l.credit * 100),
    }));

    const result = await createJournalEntry({
      journalId: data.journalId,
      date: new Date(data.date),
      reference: data.reference,
      description: data.description,
      lines: formattedLines,
    });

    revalidatePath("/accounting");
    return { success: true, entryId: result.entryId };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to post journal entry.",
    };
  }
}
