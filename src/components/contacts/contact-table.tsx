"use client";

import React, { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { Search, Filter, Edit, Archive, RotateCcw, UserPlus, Eye } from "lucide-react";
import type { Contact, ContactType } from "@/db/schema/contacts";
import { ContactDialog } from "./contact-dialog";
import { ContactDetailsDialog } from "./contact-details-dialog";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { archiveContactAction, unarchiveContactAction } from "@/actions/contacts";

const columnHelper = createColumnHelper<Contact>();

export interface ContactTableProps {
  initialContacts: Contact[];
}

export function ContactTable({ initialContacts }: ContactTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<Contact[]>(initialContacts);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ContactType | "ALL">("ALL");
  const [showArchived, setShowArchived] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // View Details State
  const [viewingContactId, setViewingContactId] = useState<string | null>(null);

  // Archive Confirm State
  const [archiveTarget, setArchiveTarget] = useState<Contact | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return data.filter((c) => {
      // Archive filter
      if (showArchived ? !c.isArchived : c.isArchived) {
        return false;
      }
      // Type filter
      if (typeFilter !== "ALL" && c.type !== typeFilter) {
        return false;
      }
      // Global search
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = c.name.toLowerCase().includes(q);
        const emailMatch = c.email?.toLowerCase().includes(q) ?? false;
        const mobileMatch = c.mobile?.toLowerCase().includes(q) ?? false;
        const cityMatch = c.city?.toLowerCase().includes(q) ?? false;
        return nameMatch || emailMatch || mobileMatch || cityMatch;
      }
      return true;
    });
  }, [data, searchQuery, typeFilter, showArchived]);

  const handleEdit = (contact: Contact) => {
    setSelectedContact(contact);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedContact(null);
    setDialogOpen(true);
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    setIsArchiving(true);

    const isRestoring = archiveTarget.isArchived;
    const result = isRestoring
      ? await unarchiveContactAction(archiveTarget.id)
      : await archiveContactAction(archiveTarget.id);

    setIsArchiving(false);

    if (result.success && result.contact) {
      toast({
        title: isRestoring ? "Contact Restored" : "Contact Archived",
        description: `Contact '${archiveTarget.name}' has been ${
          isRestoring ? "restored" : "archived"
        }.`,
        variant: "success",
      });
      // Update local state
      setData((prev) =>
        prev.map((c) => (c.id === archiveTarget.id ? result.contact! : c))
      );
      setArchiveTarget(null);
    } else {
      toast({
        title: "Action Failed",
        description: result.error,
        variant: "error",
      });
    }
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Name",
        cell: (info) => {
          const contact = info.row.original;
          const initials = contact.name
            .split(" ")
            .map((part) => part[0])
            .filter(Boolean)
            .slice(0, 2)
            .join("")
            .toUpperCase();

          return (
            <button
              onClick={() => setViewingContactId(contact.id)}
              className="flex items-center gap-3 text-left group cursor-pointer focus:outline-none"
              title="Click to view full details"
            >
              {contact.profileImage ? (
                <img
                  src={contact.profileImage}
                  alt={contact.name}
                  className="w-9 h-9 rounded-full object-cover border border-slate-700 bg-slate-950 shrink-0 group-hover:border-amber-400 transition-colors"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0 group-hover:border-amber-400 transition-colors">
                  {initials || "C"}
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-bold text-white group-hover:text-amber-400 transition-colors">
                  {info.getValue()}
                </span>
                <span className="text-xs text-slate-400">
                  {contact.address
                    ? `${contact.address}, ${contact.city ?? ""}`
                    : contact.city ?? "No address"}
                </span>
              </div>
            </button>
          );
        },
      }),
      columnHelper.accessor("type", {
        header: "Type",
        cell: (info) => {
          const val = info.getValue();
          return (
            <span
              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${
                val === "CUSTOMER"
                  ? "bg-blue-950 text-blue-400 border border-blue-900"
                  : val === "VENDOR"
                  ? "bg-purple-950 text-purple-400 border border-purple-900"
                  : "bg-amber-950 text-amber-400 border border-amber-900"
              }`}
            >
              {val}
            </span>
          );
        },
      }),
      columnHelper.accessor("email", {
        header: "Email",
        cell: (info) => (
          <span className="font-mono text-xs text-slate-300">
            {info.getValue() || "—"}
          </span>
        ),
      }),
      columnHelper.accessor("mobile", {
        header: "Mobile",
        cell: (info) => (
          <span className="font-mono text-xs text-slate-300">
            {info.getValue() || "—"}
          </span>
        ),
      }),
      columnHelper.accessor("city", {
        header: "City",
        cell: (info) => <span>{info.getValue() || "—"}</span>,
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: (info) => {
          const contact = info.row.original;
          return (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setViewingContactId(contact.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                title="View Full Contact Details"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleEdit(contact)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                title="Edit Contact"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => setArchiveTarget(contact)}
                className={`p-1.5 rounded-lg transition-colors ${
                  contact.isArchived
                    ? "text-emerald-400 hover:bg-emerald-950"
                    : "text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                }`}
                title={contact.isArchived ? "Restore Contact" : "Archive Contact"}
              >
                {contact.isArchived ? (
                  <RotateCcw className="w-4 h-4" />
                ) : (
                  <Archive className="w-4 h-4" />
                )}
              </button>
            </div>
          );
        },
      }),
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-4">
      {/* Control Bar: Search, Filters, Add Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="flex flex-1 flex-col sm:flex-row items-center gap-3 w-full">
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, city..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as ContactType | "ALL")}
              className="bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-amber-400 outline-none cursor-pointer"
            >
              <option value="ALL">All Counterparties</option>
              <option value="CUSTOMER">Customers Only</option>
              <option value="VENDOR">Vendors Only</option>
              <option value="BOTH">Both (Cust & Vend)</option>
            </select>
          </div>

          {/* Archived Toggle */}
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              showArchived
                ? "bg-rose-950 text-rose-300 border-rose-800"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
            }`}
          >
            {showArchived ? "Showing Archived" : "Show Archived"}
          </button>
        </div>

        {/* Primary Action Button */}
        <button
          onClick={handleCreate}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-xs transition-colors shadow-md shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Contact</span>
        </button>
      </div>

      {/* TanStack Table Container */}
      {filteredData.length === 0 ? (
        <EmptyState
          title={showArchived ? "No Archived Contacts" : "No Contacts Found"}
          description={
            searchQuery || typeFilter !== "ALL"
              ? "No contacts match your current search/filter criteria."
              : "Click 'Add Contact' to create your first counterpart contact."
          }
          action={
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-xs transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Contact</span>
            </button>
          }
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/90 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="p-4 select-none">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-slate-800/40 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="p-4">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog for Create / Edit */}
      <ContactDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initialData={selectedContact}
        onSuccess={async () => {
          const updated = await fetch("/api/contacts").then((r) => r.json()).catch(() => null);
          if (updated) setData(updated);
          router.refresh();
        }}
      />

      {/* Confirmation Dialog for Archive / Restore */}
      <ConfirmDialog
        isOpen={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchiveConfirm}
        title={
          archiveTarget?.isArchived
            ? `Restore '${archiveTarget?.name}'?`
            : `Archive '${archiveTarget?.name}'?`
        }
        description={
          archiveTarget?.isArchived
            ? "Restoring this contact will make it active again across Sales and Purchase orders."
            : "Archiving hides this contact from active lists while preserving historical accounting records."
        }
        confirmText={archiveTarget?.isArchived ? "Restore Contact" : "Archive Contact"}
        variant={archiveTarget?.isArchived ? "info" : "danger"}
        isLoading={isArchiving}
      />

      {/* Full Contact Profile & Transaction Details Modal */}
      <ContactDetailsDialog
        contactId={viewingContactId}
        isOpen={Boolean(viewingContactId)}
        onClose={() => setViewingContactId(null)}
        onEdit={(contact) => handleEdit(contact)}
      />
    </div>
  );
}
