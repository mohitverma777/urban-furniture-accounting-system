/**
 * src/services/sales/schema.ts
 *
 * Client-safe validation schemas and types for Sales.
 * Does NOT import database drivers. Safe for use in Client Components.
 */

import { z } from "zod";

export const salesOrderItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().int("Quantity must be a whole number").gt(0, "Quantity must be greater than 0"),
  unitPrice: z.number().min(0, "Unit price cannot be negative"), // input in INR
  taxRate: z.number().min(0, "Tax rate cannot be negative").default(18),
});

export const createSalesOrderSchema = z.object({
  contactId: z.string().min(1, "Customer is required"),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional(),
  items: z.array(salesOrderItemSchema).min(1, "At least one product line item is required"),
});

export type CreateSalesOrderInput = z.infer<typeof createSalesOrderSchema>;
