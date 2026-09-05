import { PageHeader } from "@/components/common/page-header";
import { db } from "@/db";
import { products } from "@/db/schema";
import { EmptyState } from "@/components/common/empty-state";
import { Package, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const productList = await db.select().from(products);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products & Services"
        description="Catalog of furniture goods and installation services."
        actions={
          <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-sm transition-colors shadow-md">
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        }
      />

      {productList.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No Products Found"
          description="Create your first furniture item or service."
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Type</th>
                <th className="p-4">Category</th>
                <th className="p-4">Sales Price</th>
                <th className="p-4">Cost Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {productList.map((prod) => (
                <tr key={prod.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-4 font-semibold text-white">{prod.name}</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${
                        prod.type === "GOODS"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                          : "bg-blue-950 text-blue-400 border border-blue-900"
                      }`}
                    >
                      {prod.type}
                    </span>
                  </td>
                  <td className="p-4">{prod.category || "—"}</td>
                  <td className="p-4 font-mono font-semibold text-emerald-400">
                    ₹{(prod.salesPrice / 100).toLocaleString("en-IN")}
                  </td>
                  <td className="p-4 font-mono text-slate-400">
                    ₹{(prod.costPrice / 100).toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
