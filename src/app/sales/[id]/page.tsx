import { notFound } from "next/navigation";
import { getSalesOrderById } from "@/services/sales";
import { PageHeader } from "@/components/common/page-header";
import { AccountingImpactCard } from "@/components/sales/accounting-impact-card";
import { SalesInvoiceActions } from "@/components/sales/sales-invoice-actions";
import { ArrowLeft, Building2, Calendar, FileText, CreditCard } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SalesInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getSalesOrderById(id);

  if (!data) {
    notFound();
  }

  const { order, items, payments: orderPayments, totalPaid, outstandingAmount, journalEntryData } = data;

  const invDateStr = order.invoiceDate
    ? order.invoiceDate instanceof Date
      ? order.invoiceDate.toISOString().split("T")[0]
      : String(order.invoiceDate)
    : "—";

  const dueDateStr = order.dueDate
    ? order.dueDate instanceof Date
      ? order.dueDate.toISOString().split("T")[0]
      : String(order.dueDate)
    : "—";

  return (
    <div className="space-y-8">
      {/* Top Navigation */}
      <div>
        <Link
          href="/sales"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sales Orders</span>
        </Link>
      </div>

      {/* Page Header */}
      <PageHeader
        title={`Customer Invoice ${order.orderNumber}`}
        description="Detailed sales order line items, payment status, and double-entry accounting impact."
        badge={
          <span
            className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold uppercase ${
              order.status === "PAID"
                ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                : order.status === "BILLED"
                ? "bg-blue-950 text-blue-400 border border-blue-900"
                : order.status === "PARTIAL"
                ? "bg-amber-950 text-amber-400 border border-amber-900"
                : "bg-slate-800 text-slate-300 border border-slate-700"
            }`}
          >
            {order.status}
          </span>
        }
        actions={
          <SalesInvoiceActions
            orderId={order.id}
            orderNumber={order.orderNumber}
            status={order.status as "DRAFT" | "BILLED" | "PARTIAL" | "PAID"}
            outstandingAmount={outstandingAmount}
          />
        }
      />

      {/* Invoice Meta Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Information Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-md">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider border-b border-slate-800 pb-2">
            <Building2 className="w-4 h-4" />
            <span>Customer Counterparty</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{order.contactName}</h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{order.contactEmail || "No email"}</p>
            <p className="text-xs text-slate-400 font-mono">{order.contactMobile || "No mobile"}</p>
            {order.contactAddress && (
              <p className="text-xs text-slate-300 mt-2">
                {order.contactAddress}, {order.contactCity}
              </p>
            )}
          </div>
        </div>

        {/* Dates & Status Overview Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-md">
          <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider border-b border-slate-800 pb-2">
            <Calendar className="w-4 h-4" />
            <span>Invoice Metadata</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-slate-400 block">Invoice Date</span>
              <span className="font-mono font-semibold text-white">{invDateStr}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Payment Due Date</span>
              <span className="font-mono font-semibold text-white">{dueDateStr}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Payment Status</span>
              <span className="font-semibold text-amber-400">{order.status}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Outstanding Balance</span>
              <span className="font-mono font-bold text-rose-400 text-base">
                ₹{(outstandingAmount / 100).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-400" />
          <span>Line Items Breakdown</span>
        </h3>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Product / Item</th>
                <th className="p-4">Type</th>
                <th className="p-4 text-center">Qty</th>
                <th className="p-4 text-right">Unit Price</th>
                <th className="p-4 text-right">Tax Rate %</th>
                <th className="p-4 text-right">Tax Amount</th>
                <th className="p-4 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-4 font-sans font-semibold text-white">
                    {item.productName}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                      {item.productType}
                    </span>
                  </td>
                  <td className="p-4 text-center text-slate-200">{item.quantity}</td>
                  <td className="p-4 text-right">
                    ₹{(item.unitPrice / 100).toLocaleString("en-IN")}
                  </td>
                  <td className="p-4 text-right">{item.taxRate}%</td>
                  <td className="p-4 text-right text-slate-400">
                    ₹{(item.taxAmount / 100).toLocaleString("en-IN")}
                  </td>
                  <td className="p-4 text-right font-bold text-emerald-400">
                    ₹{(item.lineTotal / 100).toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Totals Summary */}
      <div className="flex justify-end">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 font-mono text-sm shadow-xl">
          <div className="flex justify-between text-slate-300">
            <span>Subtotal (Net):</span>
            <span>₹{(order.subtotal / 100).toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Tax Amount (GST):</span>
            <span>₹{(order.taxAmount / 100).toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-slate-800 font-bold text-white text-base">
            <span>Total Invoice Amount:</span>
            <span className="text-amber-400">
              ₹{(order.totalAmount / 100).toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex justify-between text-xs text-slate-400 pt-1">
            <span>Total Paid Receipts:</span>
            <span className="text-emerald-400 font-bold">
              ₹{(totalPaid / 100).toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex justify-between text-xs pt-1 border-t border-slate-800/80 font-bold text-rose-400">
            <span>Remaining Outstanding:</span>
            <span>₹{(outstandingAmount / 100).toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>

      {/* View Accounting Entry Panel */}
      <AccountingImpactCard entryData={journalEntryData} />

      {/* Payment Receipts History */}
      {orderPayments.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <span>Payment Receipts History</span>
          </h3>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Payment ID</th>
                  <th className="p-3">Method</th>
                  <th className="p-3">Reference</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {orderPayments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-semibold text-white">{pay.id.substring(0, 8)}</td>
                    <td className="p-3 font-sans font-medium uppercase">{pay.paymentMethod}</td>
                    <td className="p-3 text-slate-400">{pay.reference || "—"}</td>
                    <td className="p-3">
                      {pay.paymentDate instanceof Date
                        ? pay.paymentDate.toISOString().split("T")[0]
                        : String(pay.paymentDate)}
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-400">
                      ₹{(pay.amount / 100).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
