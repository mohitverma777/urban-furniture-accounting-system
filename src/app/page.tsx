import { PageHeader } from "@/components/common/page-header";
import { db } from "@/db";
import { contacts, products, orders, journalEntries } from "@/db/schema";
import { count, sum, eq } from "drizzle-orm";
import { Users, Package, ShoppingCart, BookOpen, ArrowUpRight, ArrowDownRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [contactsCount] = await db.select({ value: count() }).from(contacts);
  const [productsCount] = await db.select({ value: count() }).from(products);
  const [ordersCount] = await db.select({ value: count() }).from(orders);
  const [entriesCount] = await db.select({ value: count() }).from(journalEntries);

  const [salesSum] = await db
    .select({ total: sum(orders.totalAmount) })
    .from(orders)
    .where(eq(orders.type, "SO"));

  const [purchaseSum] = await db
    .select({ total: sum(orders.totalAmount) })
    .from(orders)
    .where(eq(orders.type, "PO"));

  const totalSales = (salesSum?.total ?? 0) as number;
  const totalPurchases = (purchaseSum?.total ?? 0) as number;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of furniture sales, purchases, contacts, and financial ledger status."
        badge={
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
            Live Database Connected
          </span>
        }
      />

      {/* Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Total Sales Revenue</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            ₹{totalSales.toLocaleString("en-IN")}
          </div>
          <p className="text-xs text-slate-400">Total Sales Orders (SO)</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Total Vendor Spend</span>
            <ArrowDownRight className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            ₹{totalPurchases.toLocaleString("en-IN")}
          </div>
          <p className="text-xs text-slate-400">Total Purchase Orders (PO)</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Active Master Contacts</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {contactsCount.value}
          </div>
          <p className="text-xs text-slate-400">Vendors & Customers</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Journal Postings</span>
            <BookOpen className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {entriesCount.value}
          </div>
          <p className="text-xs text-slate-400">Double-Entry Journal Logs</p>
        </div>
      </div>

      {/* Operational Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-400" />
            <span>Master Catalog Status</span>
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <span className="text-slate-400">Registered Products:</span>
              <span className="font-mono text-white font-bold">{productsCount.value}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <span className="text-slate-400">Total Orders:</span>
              <span className="font-mono text-white font-bold">{ordersCount.value}</span>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-400" />
            <span>Operational Navigation</span>
          </h2>
          <p className="text-sm text-slate-400">
            Use the left sidebar to manage Contacts, Products, Orders, Bills, Payments, and Financial Ledger reports.
          </p>
        </div>
      </div>
    </div>
  );
}
