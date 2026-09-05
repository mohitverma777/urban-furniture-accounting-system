/**
 * src/lib/import/spreadsheet-parser.ts
 *
 * Isolated, production-grade parser for CSV and XLSX files.
 * Enforces file size limits, disables formula evaluation, and normalizes headers.
 */

import * as XLSX from "xlsx";

export const MAX_IMPORT_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface ParsedSheetData {
  headers: string[];
  rawRows: Record<string, string | number | boolean | null>[];
  totalRows: number;
}

export interface ParseOptions {
  maxRows?: number;
}

export class SpreadsheetParsingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpreadsheetParsingError";
  }
}

/**
 * Cleanly sanitize raw cell values to string or number, stripping potential dangerous injection sequences.
 */
function sanitizeCellValue(val: unknown): string | number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") {
    if (isNaN(val) || !isFinite(val)) return null;
    return val;
  }
  if (typeof val === "boolean") return val ? "true" : "false";

  let str = String(val).trim();
  // Strip dangerous spreadsheet formula prefixes if accidentally passed as raw text
  if (str.startsWith("=") || str.startsWith("+") || str.startsWith("-") || str.startsWith("@")) {
    str = str.replace(/^[=+\-@]+/, "").trim();
  }
  return str.length === 0 ? null : str;
}

/**
 * Parse an uploaded Buffer or ArrayBuffer (.xlsx or .csv) into structured records.
 */
export function parseSpreadsheetBuffer(
  buffer: Buffer | ArrayBuffer,
  fileName: string,
  options: ParseOptions = {}
): ParsedSheetData {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (!extension || !["csv", "xlsx", "xls"].includes(extension)) {
    throw new SpreadsheetParsingError(
      `Unsupported file extension '.${extension}'. Only .xlsx and .csv files are supported.`
    );
  }

  const byteLength = buffer instanceof Buffer ? buffer.length : buffer.byteLength;
  if (byteLength > MAX_IMPORT_FILE_SIZE_BYTES) {
    throw new SpreadsheetParsingError(
      `File size (${(byteLength / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed limit of 5 MB.`
    );
  }

  if (byteLength === 0) {
    throw new SpreadsheetParsingError("Uploaded file is empty (0 bytes).");
  }

  let workbook: XLSX.WorkBook;
  try {
    // cellFormula: false explicitly prevents formula execution/evaluation
    workbook = XLSX.read(buffer, {
      type: buffer instanceof Buffer ? "buffer" : "array",
      cellFormula: false,
      cellHTML: false,
      cellText: false,
      raw: true,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new SpreadsheetParsingError(`Failed to parse spreadsheet file: ${msg}`);
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new SpreadsheetParsingError("The spreadsheet contains no readable worksheets.");
  }

  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new SpreadsheetParsingError("The active worksheet is invalid or unreadable.");
  }

  // Convert to 2D array of rows
  const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: null,
    blankrows: false,
  });

  if (sheetRows.length === 0) {
    throw new SpreadsheetParsingError("The spreadsheet sheet is completely blank.");
  }

  // First non-empty row represents the headers
  const headerRow = sheetRows[0] as unknown[];
  const headers = headerRow
    .map((h) => (h !== null && h !== undefined ? String(h).trim() : ""))
    .filter((h) => h.length > 0);

  if (headers.length === 0) {
    throw new SpreadsheetParsingError(
      "No valid header column found in the first row of the spreadsheet."
    );
  }

  const rawRows: Record<string, string | number | boolean | null>[] = [];
  const maxRows = options.maxRows ?? 2000;

  for (let i = 1; i < sheetRows.length; i++) {
    if (rawRows.length >= maxRows) break;
    const row = sheetRows[i] as unknown[];
    if (!row || row.length === 0) continue;

    // Check if whole row is empty
    const isAllBlank = row.every((c) => c === null || c === undefined || String(c).trim() === "");
    if (isAllBlank) continue;

    const rowObj: Record<string, string | number | boolean | null> = {};
    headers.forEach((header, colIndex) => {
      const cellVal = row[colIndex];
      rowObj[header] = sanitizeCellValue(cellVal);
    });

    rawRows.push(rowObj);
  }

  if (rawRows.length === 0) {
    throw new SpreadsheetParsingError("The spreadsheet contains headers but no data rows.");
  }

  return {
    headers,
    rawRows,
    totalRows: rawRows.length,
  };
}

/**
 * Standardize header keys by stripping casing, punctuation, and spaces
 * e.g. "Selling Price (₹)" -> "sellingprice"
 */
export function normalizeHeaderKey(header: string): string {
  return header
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Header mappings for Customer imports
 */
export const CUSTOMER_HEADER_MAP: Record<string, string> = {
  name: "name",
  customername: "name",
  clientname: "name",
  contactname: "name",
  fullname: "name",

  email: "email",
  emailaddress: "email",
  mail: "email",

  phone: "phone",
  mobile: "phone",
  phonenumber: "phone",
  mobilenumber: "phone",
  contactnumber: "phone",

  address: "address",
  street: "address",
  streetaddress: "address",
  fulladdress: "address",

  gstin: "gstin",
  gst: "gstin",
  gstnumber: "gstin",
  taxid: "gstin",

  type: "type",
  contacttype: "type",
};

/**
 * Header mappings for Product imports
 */
export const PRODUCT_HEADER_MAP: Record<string, string> = {
  sku: "sku",
  skucode: "sku",
  productcode: "sku",
  itemcode: "sku",

  productname: "name",
  name: "name",
  product: "name",
  itemname: "name",
  title: "name",

  category: "category",
  productcategory: "category",
  type: "category",

  sellingprice: "sellingPrice",
  salesprice: "sellingPrice",
  price: "sellingPrice",
  mrp: "sellingPrice",
  retailprice: "sellingPrice",

  costprice: "costPrice",
  cost: "costPrice",
  purchaseprice: "costPrice",
  buyprice: "costPrice",

  gstrate: "gstRate",
  gst: "gstRate",
  taxrate: "gstRate",
  tax: "gstRate",

  openingstock: "openingStock",
  stock: "openingStock",
  initialstock: "openingStock",
  qty: "openingStock",
  quantity: "openingStock",
};
