"use server";

import {
  getGeneralLedger,
  getJournalEntryById,
  type LedgerFilter,
} from "@/services/accounting/query";

export async function getGeneralLedgerAction(filter: LedgerFilter) {
  return await getGeneralLedger(filter);
}

export async function getJournalEntryByIdAction(entryId: string) {
  return await getJournalEntryById(entryId);
}
