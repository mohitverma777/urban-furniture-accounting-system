import { z } from "zod";

export const purchaseOrderItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .positive("Quantity must be greater than 0"),
  unitPrice: z
    .number()
    .min(0, "Purchase price cannot be negative"),
  taxRate: z
    .number()
    .min(0, "Tax rate cannot be negative")
    .max(100, "Tax rate cannot exceed 100%"),
});

export const createPurchaseOrderSchema = z.object({
  contactId: z.string().min(1, "Vendor is required"),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional(),
  items: z
    .array(purchaseOrderItemSchema)
    .min(1, "At least one product line item is required"),
});

export type PurchaseOrderItemInput = z.infer<typeof purchaseOrderItemSchema>;
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
