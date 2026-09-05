import { PageHeader } from "@/components/common/page-header";
import { db } from "@/db";
import { orders, contacts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { EmptyState } from "@/components/common/empty-state";
import { ShoppingCart, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const salesOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      invoiceDate: orders.invoiceDate,
      dueDate: orders.dueDate,
      totalAmount: orders.totalAmount,
      contactName: contacts.name,
    })
    .from(orders)
    .leftJoin(contacts, eq(orders.contactId, contacts.id))
    .where(eq(orders.type, "SO"));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Orders & Invoices"
        description="Track customer sales, customer invoices, and payment statuses."
        actions={
          <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-sm transition-colors shadow-md">
            <Plus className="w-4 h-4" />
            <span>New Sales Order</span>
          </button>
        }
      />

      {salesOrders.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No Sales Orders"
          description="Create your first customer sales order to initiate invoicing."
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Order #</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Date</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {salesOrders.map((so) => {
                const dateStr = so.invoiceDate
                  ? so.invoiceDate instanceof Date
                    ? so.invoiceDate.toISOString().split("T")[0]
                    : String(so.invoiceDate)
                  : "—";

                return (
                  <tr key={so.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-mono font-semibold text-amber-400">
                      {so.orderNumber}
                    </td>
                    <td className="p-4 text-white font-medium">{so.contactName || "—"}</td>
                    <td className="p-4 font-mono text-xs">{dateStr}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${
                          so.status === "PAID"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                            : so.status === "BILLED"
                            ? "bg-blue-950 text-blue-400 border border-blue-900"
                            : "bg-slate-800 text-slate-300 border border-slate-700"
                        }`}
                      >
                        {so.status}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-white text-right">
                      ₹{(so.totalAmount / 100).toLocaleString("en-IN")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
