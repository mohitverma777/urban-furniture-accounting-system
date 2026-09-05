"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, PackagePlus, Edit3 } from "lucide-react";
import {
  productFormSchema,
  type ProductFormValues,
} from "@/services/products/schema";
import type { Product } from "@/db/schema/products";
import { useToast } from "@/components/ui/toast";
import { createProductAction, updateProductAction } from "@/actions/products";

export interface ProductDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Product | null;
  onSuccess?: () => void;
}

export function ProductDialog({
  isOpen,
  onClose,
  initialData,
  onSuccess,
}: ProductDialogProps) {
  const { toast } = useToast();
  const isEditing = Boolean(initialData);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      type: "GOODS",
      salesPrice: 0,
      costPrice: 0,
      category: "",
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        type: initialData.type,
        salesPrice: initialData.salesPrice / 100,
        costPrice: initialData.costPrice / 100,
        category: initialData.category ?? "",
      });
    } else {
      reset({
        name: "",
        type: "GOODS",
        salesPrice: 0,
        costPrice: 0,
        category: "",
      });
    }
  }, [initialData, reset, isOpen]);

  if (!isOpen) return null;

  const onSubmit = async (data: ProductFormValues) => {
    let result;
    if (isEditing && initialData) {
      result = await updateProductAction(initialData.id, data);
    } else {
      result = await createProductAction(data);
    }

    if (result.success) {
      toast({
        title: isEditing ? "Product Updated" : "Product Created",
        description: `Product '${data.name}' saved successfully.`,
        variant: "success",
      });
      onClose();
      onSuccess?.();
    } else {
      toast({
        title: "Operation Failed",
        description: result.error,
        variant: "error",
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in-0">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-950 text-amber-400 border border-amber-800">
              {isEditing ? <Edit3 className="w-5 h-5" /> : <PackagePlus className="w-5 h-5" />}
            </div>
            <h2 className="text-lg font-bold text-white">
              {isEditing ? "Edit Product / Service" : "Add Product / Service"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Name & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Item Name <span className="text-rose-400">*</span>
              </label>
              <input
                {...register("name")}
                placeholder="e.g. Executive Desk / Installation Service"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
              {errors.name && (
                <p className="text-xs text-rose-400 font-medium">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Type <span className="text-rose-400">*</span>
              </label>
              <select
                {...register("type")}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
              >
                <option value="GOODS">GOODS</option>
                <option value="SERVICE">SERVICE</option>
                <option value="COMBO">COMBO</option>
              </select>
              {errors.type && (
                <p className="text-xs text-rose-400 font-medium">{errors.type.message}</p>
              )}
            </div>
          </div>

          {/* Sales Price & Cost Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Sales Price (₹ INR) <span className="text-rose-400">*</span>
              </label>
              <input
                {...register("salesPrice", { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0"
                placeholder="1500"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
              {errors.salesPrice && (
                <p className="text-xs text-rose-400 font-medium">{errors.salesPrice.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Cost Price (₹ INR) <span className="text-rose-400">*</span>
              </label>
              <input
                {...register("costPrice", { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0"
                placeholder="1000"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
              {errors.costPrice && (
                <p className="text-xs text-rose-400 font-medium">{errors.costPrice.message}</p>
              )}
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Category</label>
            <input
              {...register("category")}
              placeholder="e.g. Office Furniture / Services / Seating"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
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
              {isSubmitting ? "Saving..." : isEditing ? "Update Product" : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
