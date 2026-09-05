/**
 * src/app/api/import/validate/route.ts
 *
 * POST /api/import/validate
 * Accepts a multipart/form-data upload containing a .xlsx or .csv file and import type.
 * Parses the file safely, executes dual-tier validation & duplicate detection,
 * and returns the interactive preview data.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/auth/session";
import { validateImportSpreadsheet } from "@/services/import";
import { SpreadsheetParsingError } from "@/lib/import/spreadsheet-parser";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (user.role !== "ADMIN" && user.role !== "ACCOUNTANT") {
      return NextResponse.json(
        { error: "Forbidden: Only ADMIN and ACCOUNTANT roles can import master data" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const rawType = formData.get("type");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Please provide a valid spreadsheet file (.xlsx or .csv)." },
        { status: 400 }
      );
    }

    const type = rawType === "product" ? "product" : "customer";
    const fileName = (file as File).name || (type === "product" ? "products.xlsx" : "customers.xlsx");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const summary = await validateImportSpreadsheet(buffer, fileName, type);

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (err: unknown) {
    if (err instanceof SpreadsheetParsingError) {
      return NextResponse.json(
        { error: err.message },
        { status: 422 }
      );
    }

    const msg = err instanceof Error ? err.message : "Internal error validating spreadsheet";
    console.error("Error in /api/import/validate:", err);
    return NextResponse.json(
      { error: `Validation failed: ${msg}` },
      { status: 500 }
    );
  }
}
