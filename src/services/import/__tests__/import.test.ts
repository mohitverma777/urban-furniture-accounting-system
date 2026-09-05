/**
 * src/services/import/__tests__/import.test.ts
 *
 * Comprehensive test suite for the Master Data Import engine:
 * - Valid & invalid customer imports
 * - Duplicate customer handling (in-batch and against database)
 * - Valid & invalid product imports
 * - Duplicate SKU handling
 * - Invalid GST rate & prices
 * - Negative opening stock
 * - Accounting safety & opening stock movements
 * - Partial import execution
 * - Malformed spreadsheets and empty sheets
 * - RBAC enforcement (USER role rejection)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";
import { contacts } from "@/db/schema/contacts";
import { products } from "@/db/schema/products";
import { stockMovements } from "@/db/schema/stock";
import { eq, like, or } from "drizzle-orm";
import * as XLSX from "xlsx";
import {
  parseSpreadsheetBuffer,
  SpreadsheetParsingError,
} from "@/lib/import/spreadsheet-parser";
import {
  CUSTOMER_TEMPLATE,
  PRODUCT_TEMPLATE,
  generateTemplateCSV,
  generateTemplateXLSX,
} from "@/lib/import/templates";
import {
  validateCustomerRows,
  validateProductRows,
} from "@/services/import/validator";
import {
  validateImportSpreadsheet,
  executeCustomerImport,
  executeProductImport,
} from "@/services/import";
import { AuthorizationError, ROLE_PERMISSIONS } from "@/auth/permissions";

/** Helper to create an in-memory XLSX buffer from an array of objects */
function createTestXlsxBuffer(sheetData: Record<string, unknown>[]): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as Buffer;
}

/** Helper to create an in-memory CSV buffer from text */
function createTestCsvBuffer(csvText: string): Buffer {
  return Buffer.from(csvText, "utf-8");
}

describe("Master Data Import Engine", () => {
  beforeEach(async () => {
    // Delete stock movements for test products first to satisfy FK constraint
    const testProds = await db
      .select({ id: products.id })
      .from(products)
      .where(or(like(products.name, "TestImport%"), like(products.sku, "TEST-IMP-%")));

    for (const p of testProds) {
      await db.delete(stockMovements).where(eq(stockMovements.productId, p.id));
    }

    await db.delete(products).where(or(like(products.name, "TestImport%"), like(products.sku, "TEST-IMP-%")));
    await db.delete(contacts).where(like(contacts.name, "TestImport%"));
  });

  describe("Spreadsheet Parser & Template Engine", () => {
    it("generates valid CSV and XLSX templates for customer and product", () => {
      const custCsv = generateTemplateCSV(CUSTOMER_TEMPLATE);
      expect(custCsv).toContain("Apex Luxury Living");
      expect(custCsv).toContain("GSTIN");

      const prodXlsx = generateTemplateXLSX(PRODUCT_TEMPLATE);
      expect(prodXlsx.length).toBeGreaterThan(100);

      // Parse generated XLSX back
      const parsed = parseSpreadsheetBuffer(prodXlsx, "template.xlsx");
      expect(parsed.headers).toContain("SKU");
      expect(parsed.totalRows).toBeGreaterThanOrEqual(3);
    });

    it("parses CSV buffers correctly", () => {
      const csv = `Name,Email,Phone,GSTIN\nTestImport Cust1,cust1@example.com,9876543210,27AAPCU0123M1ZV\nTestImport Cust2,cust2@example.com,9876543211,27AAPCU0123M1ZW`;
      const parsed = parseSpreadsheetBuffer(createTestCsvBuffer(csv), "test.csv");
      expect(parsed.totalRows).toBe(2);
      expect(parsed.headers).toEqual(["Name", "Email", "Phone", "GSTIN"]);
      expect(parsed.rawRows[0].Name).toBe("TestImport Cust1");
    });

    it("rejects malformed or empty spreadsheets", () => {
      // Empty buffer
      expect(() => parseSpreadsheetBuffer(Buffer.alloc(0), "empty.xlsx")).toThrow(
        SpreadsheetParsingError
      );

      // Unsupported extension
      expect(() => parseSpreadsheetBuffer(Buffer.from("abc"), "document.pdf")).toThrow(
        /Unsupported file extension/
      );

      // CSV with headers but no rows
      const emptyCsv = "Name,Email,Phone\n";
      expect(() => parseSpreadsheetBuffer(createTestCsvBuffer(emptyCsv), "empty.csv")).toThrow(
        /contains headers but no data rows/
      );
    });

    it("strips formulas for safety", () => {
      const csv = `Name,Email,Phone\n=CMD|' /C calc'!A0,test@example.com,9999999999`;
      const parsed = parseSpreadsheetBuffer(createTestCsvBuffer(csv), "safety.csv");
      expect(parsed.rawRows[0].Name).not.toContain("=");
    });
  });

  describe("Customer Master Data Validation & Import", () => {
    it("validates a clean customer spreadsheet row", async () => {
      const rawRows = [
        {
          Name: "TestImport Valid Corp",
          Email: "valid@testimport.com",
          Phone: "9820011223",
          Address: "123 Nariman Point, Mumbai",
          GSTIN: "27AAPCU0123M1ZV",
          Type: "CUSTOMER",
        },
      ];

      const summary = await validateCustomerRows(rawRows);
      expect(summary.totalRows).toBe(1);
      expect(summary.validCount).toBe(1);
      expect(summary.errorCount).toBe(0);
      expect(summary.rows[0].status).toBe("VALID");
      expect(summary.rows[0].data?.name).toBe("TestImport Valid Corp");
      expect(summary.rows[0].data?.gstin).toBe("27AAPCU0123M1ZV");
    });

    it("rejects invalid customer email format with row number and field", async () => {
      const rawRows = [
        {
          Name: "TestImport Bad Email",
          Email: "invalid-email-address",
        },
      ];

      const summary = await validateCustomerRows(rawRows);
      expect(summary.validCount).toBe(0);
      expect(summary.errorCount).toBe(1);
      expect(summary.rows[0].status).toBe("ERROR");
      expect(summary.rows[0].errors[0].field).toBe("Email");
      expect(summary.rows[0].errors[0].rowNumber).toBe(2);
      expect(summary.rows[0].errors[0].message).toContain("Invalid email format");
    });

    it("rejects invalid GSTIN format with row number and field", async () => {
      const rawRows = [
        {
          Name: "TestImport Bad GSTIN",
          GSTIN: "INVALID_GST_123",
        },
      ];

      const summary = await validateCustomerRows(rawRows);
      expect(summary.errorCount).toBe(1);
      expect(summary.rows[0].status).toBe("ERROR");
      expect(summary.rows[0].errors[0].field).toBe("GSTIN");
      expect(summary.rows[0].errors[0].rowNumber).toBe(2);
    });

    it("detects in-batch and database duplicate customers", async () => {
      // 1. Seed an existing contact in DB
      await db.insert(contacts).values({
        name: "TestImport Existing DB Customer",
        email: "existing.db@testimport.com",
        type: "CUSTOMER",
      });

      // 2. Upload file with one DB duplicate and one in-batch duplicate
      const rawRows = [
        {
          Name: "TestImport Fresh One",
          Email: "existing.db@testimport.com", // DB duplicate
        },
        {
          Name: "TestImport Batch Dup",
          Email: "batch.dup@testimport.com",
        },
        {
          Name: "TestImport Batch Dup Copy",
          Email: "batch.dup@testimport.com", // In-batch duplicate
        },
      ];

      const summary = await validateCustomerRows(rawRows);
      expect(summary.duplicateCount).toBe(2);
      expect(summary.validCount).toBe(1);

      // First duplicate (DB)
      expect(summary.rows[0].status).toBe("DUPLICATE");
      expect(summary.rows[0].errors[0].message).toContain("already exists in database");

      // Second duplicate (In-batch)
      expect(summary.rows[2].status).toBe("DUPLICATE");
      expect(summary.rows[2].errors[0].message).toContain("Duplicate email");
    });

    it("executes partial import committing only valid customer rows", async () => {
      const rawRows = [
        {
          Name: "TestImport Batch Alpha",
          Email: "alpha@testimport.com",
        },
        {
          Name: "", // Missing name -> ERROR
          Email: "beta@testimport.com",
        },
        {
          Name: "TestImport Batch Gamma",
          Email: "gamma@testimport.com",
        },
      ];

      const summary = await validateCustomerRows(rawRows);
      expect(summary.validCount).toBe(2);
      expect(summary.errorCount).toBe(1);

      const result = await executeCustomerImport(summary.rows, "TestRunner");
      expect(result.importedCount).toBe(2);
      expect(result.skippedCount).toBe(1);

      // Verify records are persisted in database
      const [savedAlpha] = await db
        .select()
        .from(contacts)
        .where(eq(contacts.email, "alpha@testimport.com"));
      expect(savedAlpha).toBeDefined();
      expect(savedAlpha.name).toBe("TestImport Batch Alpha");

      const [savedBeta] = await db
        .select()
        .from(contacts)
        .where(eq(contacts.email, "beta@testimport.com"));
      expect(savedBeta).toBeUndefined(); // Beta was skipped!
    });
  });

  describe("Product Master Data Validation & Accounting Safety", () => {
    it("validates a clean product spreadsheet row", async () => {
      const rawRows = [
        {
          SKU: "TEST-IMP-01",
          "Product Name": "TestImport Royal Oak Table",
          Category: "Dining Sets",
          "Selling Price": 45000,
          "Cost Price": 28000,
          "GST Rate": "18%",
          "Opening Stock": 10,
        },
      ];

      const summary = await validateProductRows(rawRows);
      expect(summary.totalRows).toBe(1);
      expect(summary.validCount).toBe(1);
      expect(summary.errorCount).toBe(0);
      expect(summary.rows[0].status).toBe("VALID");
      expect(summary.rows[0].data?.sku).toBe("TEST-IMP-01");
      expect(summary.rows[0].data?.gstRate).toBe(18);
      expect(summary.rows[0].data?.openingStock).toBe(10);
    });

    it("detects duplicate SKU in-batch and against database", async () => {
      // 1. Seed existing product with SKU
      await db.insert(products).values({
        name: "TestImport Pre-existing Chair",
        sku: "TEST-IMP-EXISTING",
        type: "GOODS",
        salesPrice: 500000,
        costPrice: 300000,
      });

      const rawRows = [
        {
          SKU: "TEST-IMP-EXISTING", // DB duplicate
          "Product Name": "New Item 1",
          "Selling Price": 1000,
          "Cost Price": 500,
        },
        {
          SKU: "TEST-IMP-UNIQUE-1",
          "Product Name": "New Item 2",
          "Selling Price": 1000,
          "Cost Price": 500,
        },
        {
          SKU: "TEST-IMP-UNIQUE-1", // In-batch duplicate
          "Product Name": "New Item 3",
          "Selling Price": 1000,
          "Cost Price": 500,
        },
      ];

      const summary = await validateProductRows(rawRows);
      expect(summary.duplicateCount).toBe(2);
      expect(summary.validCount).toBe(1);
      expect(summary.rows[0].status).toBe("DUPLICATE");
      expect(summary.rows[0].errors[0].message).toContain("already exists in database");
      expect(summary.rows[2].status).toBe("DUPLICATE");
      expect(summary.rows[2].errors[0].message).toContain("Duplicate SKU");
    });

    it("rejects unsupported GST rate with row number and field", async () => {
      const rawRows = [
        {
          SKU: "TEST-IMP-BAD-GST",
          "Product Name": "TestImport Bad GST Item",
          "Selling Price": 5000,
          "Cost Price": 3000,
          "GST Rate": "15%", // 15% is not in [0, 5, 12, 18, 28]
        },
      ];

      const summary = await validateProductRows(rawRows);
      expect(summary.errorCount).toBe(1);
      expect(summary.rows[0].status).toBe("ERROR");
      expect(summary.rows[0].errors[0].field).toBe("GST Rate");
      expect(summary.rows[0].errors[0].rowNumber).toBe(2);
      expect(summary.rows[0].errors[0].message).toContain("Unsupported GST Rate");
    });

    it("rejects invalid prices (negative or non-numeric)", async () => {
      const rawRows = [
        {
          SKU: "TEST-IMP-NEG-PRICE",
          "Product Name": "TestImport Negative Price",
          "Selling Price": -500,
          "Cost Price": "not-a-number",
        },
      ];

      const summary = await validateProductRows(rawRows);
      expect(summary.errorCount).toBe(1);
      expect(summary.rows[0].status).toBe("ERROR");
      const fieldNames = summary.rows[0].errors.map((e) => e.field);
      expect(fieldNames).toContain("Selling Price");
      expect(fieldNames).toContain("Cost Price");
    });

    it("rejects negative opening stock", async () => {
      const rawRows = [
        {
          SKU: "TEST-IMP-NEG-STOCK",
          "Product Name": "TestImport Negative Stock",
          "Selling Price": 1000,
          "Cost Price": 500,
          "Opening Stock": -5,
        },
      ];

      const summary = await validateProductRows(rawRows);
      expect(summary.errorCount).toBe(1);
      expect(summary.rows[0].status).toBe("ERROR");
      expect(summary.rows[0].errors[0].field).toBe("Opening Stock");
    });

    it("executes product import and verifies accounting safety for opening stock", async () => {
      const rawRows = [
        {
          SKU: "TEST-IMP-AC-01",
          "Product Name": "TestImport Teak Bookshelf",
          Category: "Living Room",
          "Selling Price": 22000,
          "Cost Price": 14000,
          "GST Rate": 18,
          "Opening Stock": 15,
        },
      ];

      const summary = await validateProductRows(rawRows);
      expect(summary.validCount).toBe(1);

      const result = await executeProductImport(summary.rows, "TestRunner");
      expect(result.importedCount).toBe(1);

      // Verify product in database
      const [saved] = await db
        .select()
        .from(products)
        .where(eq(products.sku, "TEST-IMP-AC-01"));
      expect(saved).toBeDefined();
      expect(saved.salesPrice).toBe(2200000); // 22,000 INR * 100 paise

      // Verify opening stock movement created with type: 'ADJUSTMENT' and referenceId: 'OPENING-STOCK'
      const [stockMov] = await db
        .select()
        .from(stockMovements)
        .where(eq(stockMovements.productId, saved.id));
      expect(stockMov).toBeDefined();
      expect(stockMov.type).toBe("ADJUSTMENT");
      expect(stockMov.quantity).toBe(15);
      expect(stockMov.referenceId).toBe("OPENING-STOCK");
    });
  });

  describe("RBAC & Security Checks", () => {
    it("verifies permissions map restricts /import and /api/import to ADMIN and ACCOUNTANT", () => {
      expect(ROLE_PERMISSIONS["/import"]).toEqual(["ADMIN", "ACCOUNTANT"]);
      expect(ROLE_PERMISSIONS["/api/import"]).toEqual(["ADMIN", "ACCOUNTANT"]);
      expect(ROLE_PERMISSIONS["/import"]).not.toContain("USER");
      expect(ROLE_PERMISSIONS["/api/import"]).not.toContain("USER");
    });

    it("throws AuthorizationError if role is USER", () => {
      const checkRole = (role: string) => {
        const allowed = ROLE_PERMISSIONS["/import"];
        if (!allowed.includes(role as any)) {
          throw new AuthorizationError("Only ADMIN and ACCOUNTANT roles can import master data");
        }
      };

      expect(() => checkRole("ADMIN")).not.toThrow();
      expect(() => checkRole("ACCOUNTANT")).not.toThrow();
      expect(() => checkRole("USER")).toThrow(AuthorizationError);
    });
  });

  describe("End-to-End Spreadsheet Validation Runner", () => {
    it("validates XLSX buffer end-to-end", async () => {
      const testData = [
        {
          Name: "TestImport E2E Customer",
          Email: "e2e@testimport.com",
          Phone: "9988776655",
          GSTIN: "27AAPCU0123M1ZV",
          Type: "CUSTOMER",
        },
      ];
      const xlsxBuffer = createTestXlsxBuffer(testData);

      const summary = await validateImportSpreadsheet(xlsxBuffer, "customers.xlsx", "customer");
      expect(summary.totalRows).toBe(1);
      expect(summary.validCount).toBe(1);
      expect(summary.errorCount).toBe(0);
    });
  });
});
