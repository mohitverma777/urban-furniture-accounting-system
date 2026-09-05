"use client";

import React, { useState } from "react";
import { Plus, Trash2, X, ShoppingBag, Loader2 } from "lucide-react";
import { createPurchaseOrderAction } from "@/actions/purchases";
import type { Contact } from "@/db/schema/contacts";
import type { Product } from "@/db/schema/products";

export interface PurchaseOrderDialogProps {
  vendors: Contact[];
  productsList: Product[];
}

interface LineItemState {
  productId: string;
  quantity: number;
  unitPrice: number; // in INR
  taxRate: number; // e.g. 18 for 18%
}

export function PurchaseOrderDialog({ vendors, productsList }: PurchaseOrderDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState(vendors[0]?.id || "");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(
    () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [items, setItems] = useState<LineItemState[]>([
    {
      productId: productsList[0]?.id || "",
      quantity: 1,
      unitPrice: productsList[0] ? productsList[0].costPrice / 100 : 0,
      taxRate: 18,
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddLine = () => {
    const firstProduct = productsList[0];
    setItems((prev) => [
      ...prev,
      {
        productId: firstProduct?.id || "",
        quantity: 1,
        unitPrice: firstProduct ? firstProduct.costPrice / 100 : 0,
        taxRate: 18,
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, productId: string) => {
    const prod = productsList.find((p) => p.id === productId);
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              productId,
              unitPrice: prod ? prod.costPrice / 100 : item.unitPrice,
            }
          : item
      )
    );
  };

  const handleItemChange = (
    index: number,
    field: keyof LineItemState,
    value: number
  ) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  // Calculations for live preview (in INR)
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * (item.unitPrice || 0),
    0
  );
  const taxAmount = items.reduce(
    (sum, item) =>
      sum + (item.quantity * (item.unitPrice || 0) * (item.taxRate || 0)) / 100,
    0
  );
  const totalAmount = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId) {
      setError("Please select a vendor.");
      return;
    }
    if (items.some((it) => !it.productId || it.quantity <= 0)) {
      setError("Please select a valid product and positive quantity for all items.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await createPurchaseOrderAction({
      contactId: selectedVendorId,
      invoiceDate,
      dueDate,
      items: items.map((it) => ({
        productId: it.productId,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        taxRate: Number(it.taxRate),
      })),
    });

    setIsSubmitting(false);

    if (result.success) {
      setIsOpen(false);
      // Reset form
      setItems([
        {
          productId: productsList[0]?.id || "",
          quantity: 1,
          unitPrice: productsList[0] ? productsList[0].costPrice / 100 : 0,
          taxRate: 18,
        },
      ]);
    } else {
      setError(result.error || "Failed to create Purchase Order");
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-sm transition-colors shadow-md"
      >
        <Plus className="w-4 h-4" />
        <span>New Purchase Order</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Create Purchase Order</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Order raw materials or finished goods from vendor suppliers.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {error && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Header Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      Vendor Supplier *
                    </label>
                    <select
                      value={selectedVendorId}
                      onChange={(e) => setSelectedVendorId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                      required
                    >
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      Order Date
                    </label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      Payment Due Date
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                      Product Line Items
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddLine}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Product
                    </button>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-inner">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="bg-slate-900/90 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="p-3">Product</th>
                          <th className="p-3 w-24">Qty</th>
                          <th className="p-3 w-36 text-right">Cost Price (₹)</th>
                          <th className="p-3 w-28 text-right">Tax Rate (%)</th>
                          <th className="p-3 w-36 text-right">Subtotal (₹)</th>
                          <th className="p-3 w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {items.map((item, index) => {
                          const lineSubtotal = item.quantity * (item.unitPrice || 0);

                          return (
                            <tr key={index} className="hover:bg-slate-900/40">
                              <td className="p-3">
                                <select
                                  value={item.productId}
                                  onChange={(e) => handleProductChange(index, e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
                                >
                                  {productsList.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} ({p.type})
                                    </option>
                                  ))}
                                </select>
                              </td>

                              <td className="p-3">
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleItemChange(index, "quantity", parseInt(e.target.value) || 1)
                                  }
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50 text-center font-mono"
                                />
                              </td>

                              <td className="p-3 text-right">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unitPrice}
                                  onChange={(e) =>
                                    handleItemChange(index, "unitPrice", parseFloat(e.target.value) || 0)
                                  }
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50 text-right font-mono"
                                />
                              </td>

                              <td className="p-3 text-right">
                                <select
                                  value={item.taxRate}
                                  onChange={(e) =>
                                    handleItemChange(index, "taxRate", parseFloat(e.target.value) || 0)
                                  }
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50 text-right"
                                >
                                  <option value={18}>18% GST</option>
                                  <option value={12}>12% GST</option>
                                  <option value={5}>5% GST</option>
                                  <option value={0}>0% Tax</option>
                                </select>
                              </td>

                              <td className="p-3 text-right font-mono font-bold text-amber-400">
                                ₹{lineSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>

                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLine(index)}
                                  disabled={items.length <= 1}
                                  className="p-1 text-slate-500 hover:text-rose-400 disabled:opacity-30 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Order Summary Calculations */}
                <div className="flex justify-end">
                  <div className="w-72 bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-sm">
                    <div className="flex justify-between text-slate-400">
                      <span>Subtotal</span>
                      <span className="font-mono font-semibold text-slate-200">
                        ₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>GST Tax</span>
                      <span className="font-mono font-semibold text-slate-200">
                        ₹{taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-base">
                      <span className="text-slate-100">Total Amount</span>
                      <span className="font-mono text-amber-400">
                        ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl transition-colors shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Order...</span>
                    </>
                  ) : (
                    <span>Create Purchase Order</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
