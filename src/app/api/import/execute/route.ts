/**
 * src/app/api/import/execute/route.ts
 *
 * POST /api/import/execute
 * Commits the validated rows into the database.
 * Only rows marked as "VALID" are imported.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/auth/session";
import {
  executeCustomerImport,
  executeProductImport,
  type ValidatedRow,
  type ValidatedCustomerData,
  type ValidatedProductData,
} from "@/services/import";

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

    const body = await request.json();
    const { type, rows } = body;

    if (!type || !Array.isArray(rows)) {
      return NextResponse.json(
        { error: "Invalid request payload. 'type' and 'rows' array are required." },
        { status: 400 }
      );
    }

    const operatorName = user.name || user.loginId || user.role;

    if (type === "customer") {
      const result = await executeCustomerImport(
        rows as ValidatedRow<ValidatedCustomerData>[],
        operatorName
      );
      return NextResponse.json({
        success: true,
        result,
      });
    } else if (type === "product") {
      const result = await executeProductImport(
        rows as ValidatedRow<ValidatedProductData>[],
        operatorName
      );
      return NextResponse.json({
        success: true,
        result,
      });
    } else {
      return NextResponse.json(
        { error: `Unsupported import type '${type}'. Must be 'customer' or 'product'.` },
        { status: 400 }
      );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error committing import records";
    console.error("Error in /api/import/execute:", err);
    return NextResponse.json(
      { error: `Execution failed: ${msg}` },
      { status: 500 }
    );
  }
}
