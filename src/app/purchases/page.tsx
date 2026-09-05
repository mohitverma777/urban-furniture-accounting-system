import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { getPurchaseOrders } from "@/services/purchases";
import { db } from "@/db";
import { contacts, products } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { EmptyState } from "@/components/common/empty-state";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { PurchaseOrderDialog } from "@/components/purchases/purchase-order-dialog";

export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  const purchaseOrders = await getPurchaseOrders();

  // Fetch vendors for creation dialog
  const vendorsList = await db
    .select()
    .from(contacts)
    .where(or(eq(contacts.type, "VENDOR"), eq(contacts.type, "BOTH")));

  // Fetch active products for creation dialog
  const activeProducts = await db
    .select()
    .from(products)
    .where(eq(products.isArchived, false));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders & Bills"
        description="Manage vendor purchase orders, vendor bills, inventory replenishment, and supplier payments."
        actions={
          <PurchaseOrderDialog
            vendors={vendorsList}
            productsList={activeProducts}
          />
        }
      />

      {purchaseOrders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No Purchase Orders"
          description="Create your first vendor purchase order to replenish stock and manage Accounts Payable."
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">PO #</th>
                  <th className="p-4">Vendor</th>
                  <th className="p-4">Order Date</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Total Amount</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {purchaseOrders.map((po) => {
                  const invDateStr = po.invoiceDate
                    ? po.invoiceDate.toISOString().split("T")[0]
                    : "—";
                  const dueDateStr = po.dueDate
                    ? po.dueDate.toISOString().split("T")[0]
                    : "—";

                  return (
                    <tr key={po.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-mono font-bold text-amber-400">
                        {po.orderNumber}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-100">{po.contactName || "—"}</div>
                        {po.contactEmail && (
                          <div className="text-xs text-slate-500 font-mono">{po.contactEmail}</div>
                        )}
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-400">{invDateStr}</td>
                      <td className="p-4 font-mono text-xs text-slate-400">{dueDateStr}</td>
                      <td className="p-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            po.status === "PAID"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                              : po.status === "PARTIAL"
                              ? "bg-amber-950 text-amber-400 border border-amber-900"
                              : po.status === "BILLED"
                              ? "bg-blue-950 text-blue-400 border border-blue-900"
                              : "bg-slate-800 text-slate-300 border border-slate-700"
                          }`}
                        >
                          {po.status}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-bold text-white text-right">
                        ₹{(po.totalAmount / 100).toLocaleString("en-IN")}
                      </td>
                      <td className="p-4 text-right">
                        <Link
                          href={`/purchases/${po.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
                        >
                          <span>Details</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
