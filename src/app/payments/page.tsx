import { PageHeader } from "@/components/common/page-header";
import { db } from "@/db";
import { payments, orders, contacts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { EmptyState } from "@/components/common/empty-state";
import { CreditCard, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const paymentList = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      paymentDate: payments.paymentDate,
      paymentMethod: payments.paymentMethod,
      reference: payments.reference,
      orderNumber: orders.orderNumber,
      orderType: orders.type,
      contactName: contacts.name,
    })
    .from(payments)
    .leftJoin(orders, eq(payments.orderId, orders.id))
    .leftJoin(contacts, eq(orders.contactId, contacts.id));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Inbound customer receipts and outbound vendor payments."
        actions={
          <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-sm transition-colors shadow-md">
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        }
      />

      {paymentList.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No Payments Recorded"
          description="Record a customer payment or vendor disbursement."
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Reference / ID</th>
                <th className="p-4">Order #</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Type</th>
                <th className="p-4">Method</th>
                <th className="p-4">Date</th>
                <th className="p-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paymentList.map((pay) => {
                const dateStr =
                  pay.paymentDate instanceof Date
                    ? pay.paymentDate.toISOString().split("T")[0]
                    : String(pay.paymentDate);
                const isCustomerPayment = pay.orderType === "SO";

                return (
                  <tr key={pay.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-mono font-semibold text-white">
                      {pay.reference || pay.id.substring(0, 8)}
                    </td>
                    <td className="p-4 font-mono text-amber-400 font-medium">
                      {pay.orderNumber || "—"}
                    </td>
                    <td className="p-4 text-slate-200">{pay.contactName || "—"}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${
                          isCustomerPayment
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                            : "bg-rose-950 text-rose-400 border border-rose-900"
                        }`}
                      >
                        {isCustomerPayment ? "INBOUND (CUSTOMER)" : "OUTBOUND (VENDOR)"}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-xs uppercase">{pay.paymentMethod}</td>
                    <td className="p-4 font-mono text-xs">{dateStr}</td>
                    <td className="p-4 font-mono font-bold text-right text-white">
                      ₹{(pay.amount / 100).toLocaleString("en-IN")}
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
