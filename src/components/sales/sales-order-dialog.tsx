"use client";

import React, { useState, useMemo } from "react";
import { X, Plus, Trash2, ShoppingCart } from "lucide-react";
import type { Contact } from "@/db/schema/contacts";
import type { Product } from "@/db/schema/products";
import { useToast } from "@/components/ui/toast";
import { createSalesOrderAction } from "@/actions/sales";

export interface SalesOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Contact[];
  productsList: Product[];
  onSuccess?: () => void;
}

interface LineItemState {
  productId: string;
  quantity: number;
  unitPrice: number; // in INR
  taxRate: number;
}

export function SalesOrderDialog({
  isOpen,
  onClose,
  customers,
  productsList,
  onSuccess,
}: SalesOrderDialogProps) {
  const { toast } = useToast();

  // Active non-archived products only
  const activeProducts = useMemo(() => {
    return productsList.filter((p) => !p.isArchived);
  }, [productsList]);

  const [contactId, setContactId] = useState(
    () => (customers.length > 0 ? customers[0].id : "")
  );
  const [invoiceDate, setInvoiceDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState(
    () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [items, setItems] = useState<LineItemState[]>(() => {
    const active = productsList.filter((p) => !p.isArchived);
    return active.length > 0
      ? [
          {
            productId: active[0].id,
            quantity: 1,
            unitPrice: active[0].salesPrice / 100,
            taxRate: 18,
          },
        ]
      : [];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const addItemRow = () => {
    const defaultProd = activeProducts[0];
    if (!defaultProd) return;
    setItems((prev) => [
      ...prev,
      {
        productId: defaultProd.id,
        quantity: 1,
        unitPrice: defaultProd.salesPrice / 100,
        taxRate: 18,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItemRow = (index: number, field: keyof LineItemState, value: unknown) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        // If product changed, update default price
        if (field === "productId") {
          const prod = activeProducts.find((p) => p.id === value);
          if (prod) {
            updated.unitPrice = prod.salesPrice / 100;
          }
        }
        return updated;
      })
    );
  };

  // Preview totals calculation
  const calculatedSubtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const calculatedTaxAmount = items.reduce(
    (sum, item) => sum + (item.quantity * item.unitPrice * item.taxRate) / 100,
    0
  );
  const calculatedTotalAmount = calculatedSubtotal + calculatedTaxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contactId) {
      toast({ title: "Customer Required", description: "Please select a customer.", variant: "error" });
      return;
    }

    if (items.length === 0) {
      toast({ title: "No Items", description: "Please add at least one line item.", variant: "error" });
      return;
    }

    for (const item of items) {
      if (item.quantity <= 0) {
        toast({ title: "Invalid Quantity", description: "All line item quantities must be greater than 0.", variant: "error" });
        return;
      }
    }

    setIsSubmitting(true);
    const result = await createSalesOrderAction({
      contactId,
      invoiceDate,
      dueDate,
      items,
    });
    setIsSubmitting(false);

    if (result.success && result.order) {
      toast({
        title: "Sales Order Created",
        description: `Sales Order ${result.order.orderNumber} saved in DRAFT status.`,
        variant: "success",
      });
      onClose();
      onSuccess?.();
    } else {
      toast({
        title: "Order Creation Failed",
        description: result.error,
        variant: "error",
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in-0">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-950 text-amber-400 border border-amber-800">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white">Create New Sales Order</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Customer & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Customer <span className="text-rose-400">*</span>
              </label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
                required
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Invoice Date</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-semibold text-white">Line Items</h3>
              <button
                type="button"
                onClick={addItemRow}
                className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div className="col-span-4">
                    <select
                      value={item.productId}
                      onChange={(e) => updateItemRow(idx, "productId", e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                    >
                      {activeProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItemRow(idx, "quantity", Number(e.target.value))}
                      placeholder="Qty"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white text-center"
                    />
                  </div>

                  <div className="col-span-3">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) => updateItemRow(idx, "unitPrice", Number(e.target.value))}
                      placeholder="Unit Price"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white text-right"
                    />
                  </div>

                  <div className="col-span-2 text-right font-mono text-xs font-semibold text-emerald-400">
                    ₹
                    {(
                      item.quantity * item.unitPrice +
                      (item.quantity * item.unitPrice * item.taxRate) / 100
                    ).toLocaleString("en-IN")}
                  </div>

                  <div className="col-span-1 text-center">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="text-slate-400 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals Summary */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Subtotal:</span>
              <span className="text-white">₹{calculatedSubtotal.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Estimated Tax (18% GST):</span>
              <span className="text-white">₹{calculatedTaxAmount.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-800 text-sm font-bold text-amber-400">
              <span className="font-sans">Total Order Amount:</span>
              <span>₹{calculatedTotalAmount.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors shadow-lg shadow-amber-950/40 disabled:opacity-50"
            >
              {isSubmitting ? "Creating Order..." : "Save as DRAFT"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
