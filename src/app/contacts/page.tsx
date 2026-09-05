import { PageHeader } from "@/components/common/page-header";
import { getContacts } from "@/services/contacts";
import { ContactTable } from "@/components/contacts/contact-table";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const initialActive = await getContacts({ isArchived: false });
  const initialArchived = await getContacts({ isArchived: true });
  const allContacts = [...initialActive, ...initialArchived];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts & Counterparties"
        description="Master data for customers, vendors, and suppliers."
      />

      <ContactTable initialContacts={allContacts} />
    </div>
  );
}
