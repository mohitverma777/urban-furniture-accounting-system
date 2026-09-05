"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, PackagePlus, Edit3, Upload } from "lucide-react";
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
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      type: "GOODS",
      salesPrice: 0,
      costPrice: 0,
      category: "",
      imageUrl: "",
    },
  });

  const imageUrlValue = watch("imageUrl");

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue("imageUrl", reader.result as string, {
          shouldValidate: true,
          shouldDirty: true,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        type: initialData.type,
        salesPrice: initialData.salesPrice / 100,
        costPrice: initialData.costPrice / 100,
        category: initialData.category ?? "",
        imageUrl: initialData.imageUrl ?? "",
      });
    } else {
      reset({
        name: "",
        type: "GOODS",
        salesPrice: 0,
        costPrice: 0,
        category: "",
        imageUrl: "",
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

          {/* Initial Opening Stock Qty (only for new GOODS / COMBO items) */}
          {!isEditing && watch("type") !== "SERVICE" && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Initial Opening Stock Quantity (Units)
              </label>
              <input
                {...register("openingStock", { valueAsNumber: true })}
                type="number"
                min="0"
                placeholder="e.g. 25"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
              {errors.openingStock && (
                <p className="text-xs text-rose-400 font-medium">{errors.openingStock.message}</p>
              )}
            </div>
          )}

          {/* Product Image */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Product Picture / Image</label>
            <div className="flex items-center gap-3">
              {imageUrlValue ? (
                <img
                  src={imageUrlValue}
                  alt="Product Preview"
                  className="w-12 h-12 rounded-xl object-cover border border-amber-500/40 bg-slate-950 shrink-0"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-semibold text-slate-400 shrink-0">
                  No Img
                </div>
              )}
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors">
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>Upload Image File</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageFileChange}
                    />
                  </label>
                  {imageUrlValue && (
                    <button
                      type="button"
                      onClick={() => setValue("imageUrl", "")}
                      className="px-2 py-1 text-[11px] font-medium text-rose-400 hover:text-rose-300 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input
                  {...register("imageUrl")}
                  placeholder="Or paste Image URL (https://...)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
            </div>
            {errors.imageUrl && (
              <p className="text-xs text-rose-400 font-medium">{errors.imageUrl.message}</p>
            )}
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
