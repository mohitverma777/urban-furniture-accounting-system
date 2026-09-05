"use client";

import React, { useState } from "react";
import type { Account } from "@/db/schema/accounts";
import type { Contact } from "@/db/schema/contacts";
import type { JournalSummaryItem, JournalEntryListItem } from "@/services/accounting/query";
import { AccountingTabNav, type AccountingTab } from "./accounting-tab-nav";
import { ChartOfAccountsTable } from "./chart-of-accounts-table";
import { JournalsGrid } from "./journals-grid";
import { JournalEntriesTable } from "./journal-entries-table";
import { GeneralLedgerView } from "./general-ledger-view";

export interface AccountingClientShellProps {
  initialAccounts: Account[];
  initialJournals: JournalSummaryItem[];
  initialEntries: JournalEntryListItem[];
  contactsList?: Contact[];
}

export function AccountingClientShell({
  initialAccounts,
  initialJournals,
  initialEntries,
  contactsList = [],
}: AccountingClientShellProps) {
  const [activeTab, setActiveTab] = useState<AccountingTab>("accounts");

  return (
    <div className="space-y-6">
      {/* Top Tab Bar Navigation */}
      <AccountingTabNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Panels */}
      {activeTab === "accounts" && (
        <ChartOfAccountsTable initialAccounts={initialAccounts} />
      )}

      {activeTab === "journals" && (
        <JournalsGrid journals={initialJournals} accountsList={initialAccounts} />
      )}

      {activeTab === "entries" && (
        <JournalEntriesTable
          initialEntries={initialEntries}
          journalsList={initialJournals}
          accountsList={initialAccounts}
          contactsList={contactsList}
        />
      )}

      {activeTab === "ledger" && (
        <GeneralLedgerView accountsList={initialAccounts} />
      )}
    </div>
  );
}
