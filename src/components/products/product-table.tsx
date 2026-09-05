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
import { Search, Filter, Edit, Archive, RotateCcw, PackagePlus } from "lucide-react";
import type { Product, ProductType } from "@/db/schema/products";
import { canCreateStockMovement } from "@/services/products/schema";
import { ProductDialog } from "./product-dialog";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { useToast } from "@/components/ui/toast";
import { archiveProductAction, unarchiveProductAction } from "@/actions/products";

const columnHelper = createColumnHelper<Product>();

export interface ProductTableProps {
  initialProducts: Product[];
}

export function ProductTable({ initialProducts }: ProductTableProps) {
  const { toast } = useToast();
  const [data, setData] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ProductType | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [showArchived, setShowArchived] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Archive Confirm State
  const [archiveTarget, setArchiveTarget] = useState<Product | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  // Unique categories for dropdown filter
  const categories = useMemo(() => {
    const set = new Set<string>();
    data.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [data]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return data.filter((p) => {
      // Archive filter
      if (showArchived ? !p.isArchived : p.isArchived) {
        return false;
      }
      // Type filter
      if (typeFilter !== "ALL" && p.type !== typeFilter) {
        return false;
      }
      // Category filter
      if (categoryFilter !== "ALL" && p.category !== categoryFilter) {
        return false;
      }
      // Global search
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = p.name.toLowerCase().includes(q);
        const catMatch = p.category?.toLowerCase().includes(q) ?? false;
        return nameMatch || catMatch;
      }
      return true;
    });
  }, [data, searchQuery, typeFilter, categoryFilter, showArchived]);

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedProduct(null);
    setDialogOpen(true);
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    setIsArchiving(true);

    const isRestoring = archiveTarget.isArchived;
    const result = isRestoring
      ? await unarchiveProductAction(archiveTarget.id)
      : await archiveProductAction(archiveTarget.id);

    setIsArchiving(false);

    if (result.success && result.product) {
      toast({
        title: isRestoring ? "Product Restored" : "Product Archived",
        description: `Product '${archiveTarget.name}' has been ${
          isRestoring ? "restored" : "archived"
        }.`,
        variant: "success",
      });
      setData((prev) =>
        prev.map((p) => (p.id === archiveTarget.id ? result.product! : p))
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
        header: "Product / Service Name",
        cell: (info) => (
          <div className="flex flex-col">
            <span className="font-bold text-white">{info.getValue()}</span>
            <span className="text-xs text-slate-400">
              Category: {info.row.original.category || "Uncategorized"}
            </span>
          </div>
        ),
      }),
      columnHelper.accessor("type", {
        header: "Type",
        cell: (info) => {
          const val = info.getValue();
          const isStockable = canCreateStockMovement(info.row.original);

          return (
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${
                  val === "GOODS"
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                    : val === "SERVICE"
                    ? "bg-blue-950 text-blue-400 border border-blue-900"
                    : "bg-purple-950 text-purple-400 border border-purple-900"
                }`}
              >
                {val}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                  isStockable
                    ? "bg-slate-800 text-slate-300"
                    : "bg-slate-900 text-slate-500 italic"
                }`}
              >
                {isStockable ? "Stock Tracked" : "No Stock"}
              </span>
            </div>
          );
        },
      }),
      columnHelper.accessor("salesPrice", {
        header: "Sales Price",
        cell: (info) => (
          <span className="font-mono font-bold text-emerald-400">
            ₹{(info.getValue() / 100).toLocaleString("en-IN")}
          </span>
        ),
      }),
      columnHelper.accessor("costPrice", {
        header: "Cost Price",
        cell: (info) => (
          <span className="font-mono text-slate-400">
            ₹{(info.getValue() / 100).toLocaleString("en-IN")}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: (info) => {
          const product = info.row.original;
          return (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleEdit(product)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                title="Edit Product"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => setArchiveTarget(product)}
                className={`p-1.5 rounded-lg transition-colors ${
                  product.isArchived
                    ? "text-emerald-400 hover:bg-emerald-950"
                    : "text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                }`}
                title={product.isArchived ? "Restore Product" : "Archive Product"}
              >
                {product.isArchived ? (
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
      {/* Control Bar: Search, Type Filter, Category Filter, Add Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="flex flex-1 flex-col sm:flex-row items-center gap-3 w-full">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product or category..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as ProductType | "ALL")}
              className="bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-amber-400 outline-none cursor-pointer"
            >
              <option value="ALL">All Types</option>
              <option value="GOODS">GOODS (Physical)</option>
              <option value="SERVICE">SERVICE (Non-stock)</option>
              <option value="COMBO">COMBO (Bundle)</option>
            </select>
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-amber-400 outline-none cursor-pointer w-full sm:w-auto"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}

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
          <PackagePlus className="w-4 h-4" />
          <span>Add Product</span>
        </button>
      </div>

      {/* TanStack Table Container */}
      {filteredData.length === 0 ? (
        <EmptyState
          title={showArchived ? "No Archived Products" : "No Products Found"}
          description={
            searchQuery || typeFilter !== "ALL" || categoryFilter !== "ALL"
              ? "No products match your current search/filter criteria."
              : "Click 'Add Product' to create your first catalog product or service."
          }
          action={
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-xs transition-colors"
            >
              <PackagePlus className="w-4 h-4" />
              <span>Add Product</span>
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
      <ProductDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initialData={selectedProduct}
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
            ? "Restoring this product will allow it to be selected in new sales and purchase orders again."
            : "Archiving hides this product from new transaction dropdowns while preserving historical records."
        }
        confirmText={archiveTarget?.isArchived ? "Restore Product" : "Archive Product"}
        variant={archiveTarget?.isArchived ? "info" : "danger"}
        isLoading={isArchiving}
      />
    </div>
  );
}
