/**
 * src/services/import/index.ts
 *
 * Master-Data Import Service — manages validation, preview, and atomic execution
 * for Customers and Products, reusing existing domain services.
 */

import { parseSpreadsheetBuffer } from "@/lib/import/spreadsheet-parser";
import {
  validateCustomerRows,
  validateProductRows,
  type ImportValidationSummary,
  type ValidatedCustomerData,
  type ValidatedProductData,
  type ValidatedRow,
} from "./validator";
import { createContact } from "@/services/contacts";
import { createProduct } from "@/services/products";
import { recordAuditLog } from "@/services/audit";

export * from "./validator";

export interface ImportExecutionResult {
  success: boolean;
  type: "customer" | "product";
  totalReceived: number;
  importedCount: number;
  skippedCount: number;
  importedIds: string[];
  errors: { rowNumber?: number; message: string }[];
}

/**
 * Parse and validate an uploaded spreadsheet buffer
 */
export async function validateImportSpreadsheet(
  buffer: Buffer | ArrayBuffer,
  fileName: string,
  type: "customer" | "product"
): Promise<ImportValidationSummary<ValidatedCustomerData> | ImportValidationSummary<ValidatedProductData>> {
  const parsed = parseSpreadsheetBuffer(buffer, fileName);

  if (type === "customer") {
    return await validateCustomerRows(parsed.rawRows);
  } else {
    return await validateProductRows(parsed.rawRows);
  }
}

/**
 * Execute validated customer import rows.
 * Only rows with status "VALID" and valid data will be committed.
 */
export async function executeCustomerImport(
  rows: ValidatedRow<ValidatedCustomerData>[],
  executedBy = "System"
): Promise<ImportExecutionResult> {
  const validRows = rows.filter((r) => r.status === "VALID" && r.data);
  const importedIds: string[] = [];
  const errors: { rowNumber?: number; message: string }[] = [];

  for (const row of validRows) {
    try {
      const data = row.data!;
      const created = await createContact({
        name: data.name,
        type: data.type,
        email: data.email || undefined,
        mobile: data.phone || undefined,
        address: data.address || undefined,
        gstin: data.gstin || undefined,
      });

      importedIds.push(created.id);

      await recordAuditLog({
        entityType: "CONTACT",
        entityId: created.id,
        action: "CREATE",
        changedBy: executedBy,
        newValue: {
          name: created.name,
          email: created.email,
          type: created.type,
          gstin: created.gstin,
          source: "EXCEL_IMPORT",
        },
      }).catch(() => {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({
        rowNumber: row.rowNumber,
        message: `Failed to create customer: ${msg}`,
      });
    }
  }

  return {
    success: errors.length === 0,
    type: "customer",
    totalReceived: rows.length,
    importedCount: importedIds.length,
    skippedCount: rows.length - importedIds.length,
    importedIds,
    errors,
  };
}

/**
 * Execute validated product import rows.
 * Only rows with status "VALID" and valid data will be committed.
 * Opening stock creates stock movements with type: 'ADJUSTMENT' and referenceId: 'OPENING-STOCK'
 * without creating arbitrary unverified journal entries.
 */
export async function executeProductImport(
  rows: ValidatedRow<ValidatedProductData>[],
  executedBy = "System"
): Promise<ImportExecutionResult> {
  const validRows = rows.filter((r) => r.status === "VALID" && r.data);
  const importedIds: string[] = [];
  const errors: { rowNumber?: number; message: string }[] = [];

  for (const row of validRows) {
    try {
      const data = row.data!;
      const created = await createProduct({
        name: data.name,
        type: "GOODS",
        sku: data.sku,
        gstRate: data.gstRate,
        salesPrice: data.sellingPrice,
        costPrice: data.costPrice,
        category: data.category || "Furniture",
        openingStock: data.openingStock,
      });

      importedIds.push(created.id);

      await recordAuditLog({
        entityType: "PRODUCT",
        entityId: created.id,
        action: "CREATE",
        changedBy: executedBy,
        newValue: {
          name: created.name,
          sku: created.sku,
          salesPrice: created.salesPrice,
          costPrice: created.costPrice,
          gstRate: created.gstRate,
          source: "EXCEL_IMPORT",
        },
      }).catch(() => {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({
        rowNumber: row.rowNumber,
        message: `Failed to create product: ${msg}`,
      });
    }
  }

  return {
    success: errors.length === 0,
    type: "product",
    totalReceived: rows.length,
    importedCount: importedIds.length,
    skippedCount: rows.length - importedIds.length,
    importedIds,
    errors,
  };
}
