import { PageHeader } from "@/components/common/page-header";
import {
  getChartOfAccounts,
  getJournalsList,
  getJournalEntries,
} from "@/services/accounting/query";
import { getContacts } from "@/services/contacts";
import { AccountingClientShell } from "@/components/accounting/accounting-client-shell";

export const dynamic = "force-dynamic";

export default async function AccountingPage() {
  const [initialAccounts, initialJournals, initialEntries, contactsList] = await Promise.all([
    getChartOfAccounts(),
    getJournalsList(),
    getJournalEntries(),
    getContacts(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounting Engine"
        description="Double-entry Chart of Accounts, Journals, Posted Entries, and General Ledger."
      />

      <AccountingClientShell
        initialAccounts={initialAccounts}
        initialJournals={initialJournals}
        initialEntries={initialEntries}
        contactsList={contactsList}
      />
    </div>
  );
}
