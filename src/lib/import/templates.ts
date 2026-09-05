/**
 * src/lib/import/templates.ts
 *
 * Sample templates for Customer and Product master data imports.
 * Generates both CSV strings and XLSX WorkBook binary buffers.
 */

import * as XLSX from "xlsx";

export interface TemplateDefinition {
  type: "customer" | "product";
  fileName: string;
  headers: string[];
  sampleRows: Record<string, string | number>[];
}

export const CUSTOMER_TEMPLATE: TemplateDefinition = {
  type: "customer",
  fileName: "urban_furniture_customer_template",
  headers: ["Name", "Email", "Phone", "Address", "GSTIN", "Type"],
  sampleRows: [
    {
      Name: "Apex Luxury Living Pvt Ltd",
      Email: "procurement@apexluxury.com",
      Phone: "9820011223",
      Address: "Suite 401, Crescent Business Park, Mumbai, MH",
      GSTIN: "27AAACA1234A1Z5",
      Type: "CUSTOMER",
    },
    {
      Name: "Meera Patel Interiors",
      Email: "meera.patel@interiors.in",
      Phone: "9876543210",
      Address: "12 Linking Road, Bandra West, Mumbai, MH",
      GSTIN: "27AABCP9988B1Z2",
      Type: "CUSTOMER",
    },
    {
      Name: "Decora Studio Architects",
      Email: "contact@decorastudio.com",
      Phone: "9988776655",
      Address: "88 MG Road, Bengaluru, KA",
      GSTIN: "29AABCD1122E1Z8",
      Type: "CUSTOMER",
    },
  ],
};

export const PRODUCT_TEMPLATE: TemplateDefinition = {
  type: "product",
  fileName: "urban_furniture_product_template",
  headers: [
    "SKU",
    "Product Name",
    "Category",
    "Selling Price",
    "Cost Price",
    "GST Rate",
    "Opening Stock",
  ],
  sampleRows: [
    {
      SKU: "SOF-CHEST-01",
      "Product Name": "Chesterfield 3-Seater Velvet Sofa",
      Category: "Sofas",
      "Selling Price": 65000,
      "Cost Price": 42000,
      "GST Rate": 18,
      "Opening Stock": 12,
    },
    {
      SKU: "TBL-TEAK-04",
      "Product Name": "Solid Teak 6-Seater Dining Table",
      Category: "Dining Sets",
      "Selling Price": 48500,
      "Cost Price": 31000,
      "GST Rate": 18,
      "Opening Stock": 8,
    },
    {
      SKU: "CHR-ERGO-09",
      "Product Name": "Executive Ergonomic Office Chair",
      Category: "Office Furniture",
      "Selling Price": 14200,
      "Cost Price": 8500,
      "GST Rate": 18,
      "Opening Stock": 25,
    },
    {
      SKU: "ACC-CUSH-02",
      "Product Name": "Handwoven Linen Cushion Cover Set",
      Category: "Accessories",
      "Selling Price": 2400,
      "Cost Price": 1100,
      "GST Rate": 12,
      "Opening Stock": 50,
    },
  ],
};

/**
 * Generate CSV text representation of a template
 */
export function generateTemplateCSV(def: TemplateDefinition): string {
  const ws = XLSX.utils.json_to_sheet(def.sampleRows, {
    header: def.headers,
  });
  return XLSX.utils.sheet_to_csv(ws);
}

/**
 * Generate binary XLSX buffer for a template
 */
export function generateTemplateXLSX(def: TemplateDefinition): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(def.sampleRows, {
    header: def.headers,
  });

  // Set column widths
  ws["!cols"] = def.headers.map((h) => ({
    wch: Math.max(h.length + 4, 18),
  }));

  XLSX.utils.book_append_sheet(wb, ws, "Master Data Template");
  return XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as Buffer;
}
