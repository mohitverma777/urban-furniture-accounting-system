import { PageHeader } from "@/components/common/page-header";
import { getSalesOrders } from "@/services/sales";
import { getContacts } from "@/services/contacts";
import { getProducts } from "@/services/products";
import { EmptyState } from "@/components/common/empty-state";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { SalesOrderClientWrapper } from "@/components/sales/sales-order-client-wrapper";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const salesOrders = await getSalesOrders();
  const customers = await getContacts({ isArchived: false });
  const productList = await getProducts({ isArchived: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Orders & Invoices"
        description="Track customer sales, customer invoices, and double-entry postings."
        actions={
          <SalesOrderClientWrapper customers={customers} productsList={productList} />
        }
      />

      {salesOrders.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No Sales Orders Found"
          description="Create your first customer sales order to initiate invoicing and double-entry journal postings."
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Order #</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Date</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Total Amount</th>
                <th className="p-4 text-right">Action</th>
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
                    <td className="p-4 font-mono font-bold text-amber-400">
                      <Link href={`/sales/${so.id}`} className="hover:underline">
                        {so.orderNumber}
                      </Link>
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
                            : so.status === "PARTIAL"
                            ? "bg-amber-950 text-amber-400 border border-amber-900"
                            : "bg-slate-800 text-slate-300 border border-slate-700"
                        }`}
                      >
                        {so.status}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-white text-right">
                      ₹{(so.totalAmount / 100).toLocaleString("en-IN")}
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/sales/${so.id}`}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-amber-400 transition-colors"
                      >
                        View Invoice
                      </Link>
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
