import { PageHeader } from "@/components/common/page-header";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { EmptyState } from "@/components/common/empty-state";
import { Users, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const contactList = await db.select().from(contacts);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        description="Manage customers, vendors, and external partners."
        actions={
          <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-sm transition-colors shadow-md">
            <Plus className="w-4 h-4" />
            <span>Add Contact</span>
          </button>
        }
      />

      {contactList.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Contacts Found"
          description="Get started by adding your first customer or vendor."
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Type</th>
                <th className="p-4">Email</th>
                <th className="p-4">Mobile</th>
                <th className="p-4">City</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {contactList.map((contact) => (
                <tr key={contact.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-4 font-semibold text-white">{contact.name}</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${
                        contact.type === "CUSTOMER"
                          ? "bg-blue-950 text-blue-400 border border-blue-900"
                          : contact.type === "VENDOR"
                          ? "bg-purple-950 text-purple-400 border border-purple-900"
                          : "bg-amber-950 text-amber-400 border border-amber-900"
                      }`}
                    >
                      {contact.type}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-xs">{contact.email || "—"}</td>
                  <td className="p-4 font-mono text-xs">{contact.mobile || "—"}</td>
                  <td className="p-4">{contact.city || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
