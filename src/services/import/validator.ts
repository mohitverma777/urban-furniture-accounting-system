/**
 * src/services/import/validator.ts
 *
 * Comprehensive validation engine for Customer and Product spreadsheet rows.
 * Validates individual cell values, enforces business rules, and performs
 * dual-tier duplicate detection (both in-batch and against the database).
 */

import { db } from "@/db";
import { contacts } from "@/db/schema/contacts";
import { products } from "@/db/schema/products";
import {
  normalizeHeaderKey,
  CUSTOMER_HEADER_MAP,
  PRODUCT_HEADER_MAP,
} from "@/lib/import/spreadsheet-parser";

export const SUPPORTED_GST_RATES = [0, 5, 12, 18, 28];
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^[0-9+\s\-()]{7,20}$/;

export interface ImportIssue {
  rowNumber: number;
  field: string;
  value: string | number | null;
  message: string;
  severity: "error" | "warning";
}

export interface ValidatedRow<T> {
  rowNumber: number;
  raw: Record<string, unknown>;
  status: "VALID" | "ERROR" | "DUPLICATE";
  data?: T;
  errors: ImportIssue[];
  warnings: ImportIssue[];
}

export interface ValidatedCustomerData {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  gstin?: string | null;
  type: "CUSTOMER" | "VENDOR" | "BOTH";
}

export interface ValidatedProductData {
  sku: string;
  name: string;
  category?: string | null;
  sellingPrice: number; // in Rupees
  costPrice: number;    // in Rupees
  gstRate: number;      // percentage: 0, 5, 12, 18, 28
  openingStock: number; // units
}

export interface ImportValidationSummary<T> {
  type: "customer" | "product";
  totalRows: number;
  validCount: number;
  errorCount: number;
  duplicateCount: number;
  rows: ValidatedRow<T>[];
  allErrors: ImportIssue[];
  allWarnings: ImportIssue[];
}

/**
 * Clean & normalize a raw row map using a provided header mapping dictionary.
 */
export function mapRawRowToFields(
  rawRow: Record<string, unknown>,
  headerMap: Record<string, string>
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(rawRow)) {
    const normalizedKey = normalizeHeaderKey(key);
    const targetField = headerMap[normalizedKey];
    if (targetField) {
      mapped[targetField] = val;
    }
  }

  return mapped;
}

/**
 * Validate customer master data rows
 */
export async function validateCustomerRows(
  rawRows: Record<string, unknown>[]
): Promise<ImportValidationSummary<ValidatedCustomerData>> {
  // Query all active contacts from DB to check for existing duplicates
  const existingContacts = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      email: contacts.email,
      gstin: contacts.gstin,
    })
    .from(contacts);

  const existingEmails = new Set(
    existingContacts
      .map((c) => c.email?.trim().toLowerCase())
      .filter((e): e is string => Boolean(e))
  );
  const existingGstins = new Set(
    existingContacts
      .map((c) => c.gstin?.trim().toUpperCase())
      .filter((g): g is string => Boolean(g))
  );
  const existingNames = new Set(
    existingContacts.map((c) => c.name.trim().toLowerCase())
  );

  // In-batch tracking sets
  const seenBatchEmails = new Map<string, number>();
  const seenBatchGstins = new Map<string, number>();
  const seenBatchNames = new Map<string, number>();

  const rows: ValidatedRow<ValidatedCustomerData>[] = [];
  const allErrors: ImportIssue[] = [];
  const allWarnings: ImportIssue[] = [];

  for (let idx = 0; idx < rawRows.length; idx++) {
    const rowNumber = idx + 2; // Row 1 is header
    const raw = rawRows[idx];
    const mapped = mapRawRowToFields(raw, CUSTOMER_HEADER_MAP);

    const errors: ImportIssue[] = [];
    const warnings: ImportIssue[] = [];
    let isDuplicate = false;

    // 1. Name validation (required)
    const rawName = mapped.name !== null && mapped.name !== undefined ? String(mapped.name).trim() : "";
    if (!rawName) {
      errors.push({
        rowNumber,
        field: "Name",
        value: null,
        message: "Customer name is required",
        severity: "error",
      });
    }

    // 2. Email validation (optional, but must be valid format if provided)
    let email: string | null = null;
    if (mapped.email !== null && mapped.email !== undefined && String(mapped.email).trim() !== "") {
      const emailStr = String(mapped.email).trim().toLowerCase();
      if (!EMAIL_REGEX.test(emailStr)) {
        errors.push({
          rowNumber,
          field: "Email",
          value: String(mapped.email),
          message: "Invalid email format (e.g. name@company.com)",
          severity: "error",
        });
      } else {
        email = emailStr;
      }
    }

    // 3. Phone validation (optional)
    let phone: string | null = null;
    if (mapped.phone !== null && mapped.phone !== undefined && String(mapped.phone).trim() !== "") {
      const phoneStr = String(mapped.phone).trim();
      if (!PHONE_REGEX.test(phoneStr)) {
        warnings.push({
          rowNumber,
          field: "Phone",
          value: phoneStr,
          message: "Phone number format contains unusual characters",
          severity: "warning",
        });
      }
      phone = phoneStr;
    }

    // 4. Address (optional)
    const address = mapped.address ? String(mapped.address).trim() : null;

    // 5. GSTIN validation (optional, but must match 15-char format if provided)
    let gstin: string | null = null;
    if (mapped.gstin !== null && mapped.gstin !== undefined && String(mapped.gstin).trim() !== "") {
      const gstinStr = String(mapped.gstin).trim().toUpperCase();
      if (!GSTIN_REGEX.test(gstinStr)) {
        errors.push({
          rowNumber,
          field: "GSTIN",
          value: gstinStr,
          message: "Invalid GSTIN format (must be 15 alphanumeric characters, e.g. 27AAPCU0123M1ZV)",
          severity: "error",
        });
      } else {
        gstin = gstinStr;
      }
    }

    // 6. Type (optional, defaults to CUSTOMER)
    let type: "CUSTOMER" | "VENDOR" | "BOTH" = "CUSTOMER";
    if (mapped.type !== null && mapped.type !== undefined && String(mapped.type).trim() !== "") {
      const t = String(mapped.type).trim().toUpperCase();
      if (["CUSTOMER", "VENDOR", "BOTH"].includes(t)) {
        type = t as "CUSTOMER" | "VENDOR" | "BOTH";
      } else {
        warnings.push({
          rowNumber,
          field: "Type",
          value: String(mapped.type),
          message: `Unrecognized type '${mapped.type}', defaulted to CUSTOMER`,
          severity: "warning",
        });
      }
    }

    // 7. Duplicate Detection (DB + Batch)
    if (email) {
      if (existingEmails.has(email)) {
        errors.push({
          rowNumber,
          field: "Email",
          value: email,
          message: `Email '${email}' already exists in database`,
          severity: "error",
        });
        isDuplicate = true;
      } else if (seenBatchEmails.has(email)) {
        errors.push({
          rowNumber,
          field: "Email",
          value: email,
          message: `Duplicate email '${email}' found in row ${seenBatchEmails.get(email)}`,
          severity: "error",
        });
        isDuplicate = true;
      } else {
        seenBatchEmails.set(email, rowNumber);
      }
    }

    if (gstin) {
      if (existingGstins.has(gstin)) {
        errors.push({
          rowNumber,
          field: "GSTIN",
          value: gstin,
          message: `GSTIN '${gstin}' already exists in database`,
          severity: "error",
        });
        isDuplicate = true;
      } else if (seenBatchGstins.has(gstin)) {
        errors.push({
          rowNumber,
          field: "GSTIN",
          value: gstin,
          message: `Duplicate GSTIN '${gstin}' found in row ${seenBatchGstins.get(gstin)}`,
          severity: "error",
        });
        isDuplicate = true;
      } else {
        seenBatchGstins.set(gstin, rowNumber);
      }
    }

    if (rawName) {
      const nameKey = rawName.toLowerCase();
      if (!email && !gstin && existingNames.has(nameKey)) {
        errors.push({
          rowNumber,
          field: "Name",
          value: rawName,
          message: `Customer name '${rawName}' already exists in database`,
          severity: "error",
        });
        isDuplicate = true;
      } else if (!email && !gstin && seenBatchNames.has(nameKey)) {
        errors.push({
          rowNumber,
          field: "Name",
          value: rawName,
          message: `Duplicate customer name '${rawName}' in row ${seenBatchNames.get(nameKey)}`,
          severity: "error",
        });
        isDuplicate = true;
      } else {
        seenBatchNames.set(nameKey, rowNumber);
      }
    }

    // Determine status
    let status: "VALID" | "ERROR" | "DUPLICATE" = "VALID";
    if (isDuplicate) {
      status = "DUPLICATE";
    } else if (errors.length > 0) {
      status = "ERROR";
    }

    allErrors.push(...errors);
    allWarnings.push(...warnings);

    rows.push({
      rowNumber,
      raw,
      status,
      data:
        status === "VALID"
          ? {
              name: rawName,
              email,
              phone,
              address,
              gstin,
              type,
            }
          : undefined,
      errors,
      warnings,
    });
  }

  const validCount = rows.filter((r) => r.status === "VALID").length;
  const duplicateCount = rows.filter((r) => r.status === "DUPLICATE").length;
  const errorCount = rows.filter((r) => r.status === "ERROR").length;

  return {
    type: "customer",
    totalRows: rows.length,
    validCount,
    errorCount,
    duplicateCount,
    rows,
    allErrors,
    allWarnings,
  };
}

/**
 * Validate product master data rows
 */
export async function validateProductRows(
  rawRows: Record<string, unknown>[]
): Promise<ImportValidationSummary<ValidatedProductData>> {
  // Query all active products from DB to check for SKU/name duplicates
  const existingProducts = await db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
    })
    .from(products);

  const existingSkus = new Set(
    existingProducts
      .map((p) => p.sku?.trim().toUpperCase())
      .filter((s): s is string => Boolean(s))
  );
  const existingNames = new Set(
    existingProducts.map((p) => p.name.trim().toLowerCase())
  );

  // In-batch tracking sets
  const seenBatchSkus = new Map<string, number>();
  const seenBatchNames = new Map<string, number>();

  const rows: ValidatedRow<ValidatedProductData>[] = [];
  const allErrors: ImportIssue[] = [];
  const allWarnings: ImportIssue[] = [];

  for (let idx = 0; idx < rawRows.length; idx++) {
    const rowNumber = idx + 2; // Row 1 is header
    const raw = rawRows[idx];
    const mapped = mapRawRowToFields(raw, PRODUCT_HEADER_MAP);

    const errors: ImportIssue[] = [];
    const warnings: ImportIssue[] = [];
    let isDuplicate = false;

    // 1. SKU validation (required)
    const rawSku = mapped.sku !== null && mapped.sku !== undefined ? String(mapped.sku).trim().toUpperCase() : "";
    if (!rawSku) {
      errors.push({
        rowNumber,
        field: "SKU",
        value: null,
        message: "Product SKU is required",
        severity: "error",
      });
    }

    // 2. Product Name validation (required)
    const rawName = mapped.name !== null && mapped.name !== undefined ? String(mapped.name).trim() : "";
    if (!rawName) {
      errors.push({
        rowNumber,
        field: "Product Name",
        value: null,
        message: "Product name is required",
        severity: "error",
      });
    }

    // 3. Category (optional)
    const category = mapped.category ? String(mapped.category).trim() : "Furniture";

    // 4. Selling Price validation (required, non-negative number)
    let sellingPrice = 0;
    const rawSellingPrice = mapped.sellingPrice;
    if (rawSellingPrice === null || rawSellingPrice === undefined || String(rawSellingPrice).trim() === "") {
      errors.push({
        rowNumber,
        field: "Selling Price",
        value: null,
        message: "Selling price is required",
        severity: "error",
      });
    } else {
      const parsedSP = Number(String(rawSellingPrice).replace(/[₹,\s]/g, ""));
      if (isNaN(parsedSP) || !isFinite(parsedSP) || parsedSP < 0) {
        errors.push({
          rowNumber,
          field: "Selling Price",
          value: String(rawSellingPrice),
          message: "Selling price must be a valid non-negative number",
          severity: "error",
        });
      } else {
        sellingPrice = parsedSP;
      }
    }

    // 5. Cost Price validation (required, non-negative number)
    let costPrice = 0;
    const rawCostPrice = mapped.costPrice;
    if (rawCostPrice === null || rawCostPrice === undefined || String(rawCostPrice).trim() === "") {
      errors.push({
        rowNumber,
        field: "Cost Price",
        value: null,
        message: "Cost price is required",
        severity: "error",
      });
    } else {
      const parsedCP = Number(String(rawCostPrice).replace(/[₹,\s]/g, ""));
      if (isNaN(parsedCP) || !isFinite(parsedCP) || parsedCP < 0) {
        errors.push({
          rowNumber,
          field: "Cost Price",
          value: String(rawCostPrice),
          message: "Cost price must be a valid non-negative number",
          severity: "error",
        });
      } else {
        costPrice = parsedCP;
      }
    }

    // Cost price > selling price warning
    if (sellingPrice > 0 && costPrice > sellingPrice) {
      warnings.push({
        rowNumber,
        field: "Selling Price",
        value: sellingPrice,
        message: `Selling price (₹${sellingPrice}) is lower than Cost price (₹${costPrice})`,
        severity: "warning",
      });
    }

    // 6. GST Rate validation (supported rates: 0, 5, 12, 18, 28)
    let gstRate = 18;
    const rawGSTRate = mapped.gstRate;
    if (rawGSTRate !== null && rawGSTRate !== undefined && String(rawGSTRate).trim() !== "") {
      const parsedRate = Number(String(rawGSTRate).replace(/[%,\s]/g, ""));
      if (isNaN(parsedRate) || !SUPPORTED_GST_RATES.includes(parsedRate)) {
        errors.push({
          rowNumber,
          field: "GST Rate",
          value: String(rawGSTRate),
          message: `Unsupported GST Rate '${rawGSTRate}'. Must be one of: ${SUPPORTED_GST_RATES.join("%, ")}%`,
          severity: "error",
        });
      } else {
        gstRate = parsedRate;
      }
    }

    // 7. Opening Stock validation (optional, non-negative whole integer)
    let openingStock = 0;
    const rawOpeningStock = mapped.openingStock;
    if (rawOpeningStock !== null && rawOpeningStock !== undefined && String(rawOpeningStock).trim() !== "") {
      const parsedStock = Number(String(rawOpeningStock).trim());
      if (isNaN(parsedStock) || !Number.isInteger(parsedStock) || parsedStock < 0) {
        errors.push({
          rowNumber,
          field: "Opening Stock",
          value: String(rawOpeningStock),
          message: "Opening stock must be a non-negative whole integer",
          severity: "error",
        });
      } else {
        openingStock = parsedStock;
      }
    }

    // 8. Duplicate Detection (DB + Batch)
    if (rawSku) {
      if (existingSkus.has(rawSku)) {
        errors.push({
          rowNumber,
          field: "SKU",
          value: rawSku,
          message: `SKU '${rawSku}' already exists in database`,
          severity: "error",
        });
        isDuplicate = true;
      } else if (seenBatchSkus.has(rawSku)) {
        errors.push({
          rowNumber,
          field: "SKU",
          value: rawSku,
          message: `Duplicate SKU '${rawSku}' found in row ${seenBatchSkus.get(rawSku)}`,
          severity: "error",
        });
        isDuplicate = true;
      } else {
        seenBatchSkus.set(rawSku, rowNumber);
      }
    }

    if (rawName) {
      const nameKey = rawName.toLowerCase();
      if (existingNames.has(nameKey)) {
        errors.push({
          rowNumber,
          field: "Product Name",
          value: rawName,
          message: `Product name '${rawName}' already exists in database`,
          severity: "error",
        });
        isDuplicate = true;
      } else if (seenBatchNames.has(nameKey)) {
        errors.push({
          rowNumber,
          field: "Product Name",
          value: rawName,
          message: `Duplicate product name '${rawName}' in row ${seenBatchNames.get(nameKey)}`,
          severity: "error",
        });
        isDuplicate = true;
      } else {
        seenBatchNames.set(nameKey, rowNumber);
      }
    }

    // Determine status
    let status: "VALID" | "ERROR" | "DUPLICATE" = "VALID";
    if (isDuplicate) {
      status = "DUPLICATE";
    } else if (errors.length > 0) {
      status = "ERROR";
    }

    allErrors.push(...errors);
    allWarnings.push(...warnings);

    rows.push({
      rowNumber,
      raw,
      status,
      data:
        status === "VALID"
          ? {
              sku: rawSku,
              name: rawName,
              category,
              sellingPrice,
              costPrice,
              gstRate,
              openingStock,
            }
          : undefined,
      errors,
      warnings,
    });
  }

  const validCount = rows.filter((r) => r.status === "VALID").length;
  const duplicateCount = rows.filter((r) => r.status === "DUPLICATE").length;
  const errorCount = rows.filter((r) => r.status === "ERROR").length;

  return {
    type: "product",
    totalRows: rows.length,
    validCount,
    errorCount,
    duplicateCount,
    rows,
    allErrors,
    allWarnings,
  };
}
