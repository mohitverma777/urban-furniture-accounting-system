/**
 * src/app/api/import/template/route.ts
 *
 * GET /api/import/template?type=customer|product&format=csv|xlsx
 * Generates and downloads pre-formatted master-data import templates.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/auth/session";
import {
  CUSTOMER_TEMPLATE,
  PRODUCT_TEMPLATE,
  generateTemplateCSV,
  generateTemplateXLSX,
} from "@/lib/import/templates";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (user.role !== "ADMIN" && user.role !== "ACCOUNTANT") {
    return NextResponse.json(
      { error: "Forbidden: Only ADMIN and ACCOUNTANT roles can download import templates" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const type = (searchParams.get("type") || "customer").toLowerCase();
  const format = (searchParams.get("format") || "xlsx").toLowerCase();

  const templateDef = type === "product" ? PRODUCT_TEMPLATE : CUSTOMER_TEMPLATE;

  if (format === "csv") {
    const csvContent = generateTemplateCSV(templateDef);
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${templateDef.fileName}.csv"`,
      },
    });
  } else {
    const xlsxBuffer = generateTemplateXLSX(templateDef);
    return new NextResponse(new Uint8Array(xlsxBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${templateDef.fileName}.xlsx"`,
      },
    });
  }
}
