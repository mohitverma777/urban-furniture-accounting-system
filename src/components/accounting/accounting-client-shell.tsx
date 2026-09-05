"use client";

import React, { useState } from "react";
import type { Account } from "@/db/schema/accounts";
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
}

export function AccountingClientShell({
  initialAccounts,
  initialJournals,
  initialEntries,
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

      {activeTab === "journals" && <JournalsGrid journals={initialJournals} />}

      {activeTab === "entries" && (
        <JournalEntriesTable
          initialEntries={initialEntries}
          journalsList={initialJournals}
        />
      )}

      {activeTab === "ledger" && (
        <GeneralLedgerView accountsList={initialAccounts} />
      )}
    </div>
  );
}
