import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSalesOrderById } from "@/services/sales";
import { InvoicePDFTemplate } from "@/components/sales/invoice-pdf-template";
import { getCurrentUser } from "@/auth/session";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const data = await getSalesOrderById(id);

    if (!data) {
      return NextResponse.json(
        { error: "Sales order not found" },
        { status: 404 }
      );
    }

    // RBAC Security: USER role can ONLY access invoices matching their own contact ID
    if (user.role === "USER" && data.order.contactId !== user.contactId) {
      return NextResponse.json(
        { error: "Forbidden: You cannot access other customers' invoices" },
        { status: 403 }
      );
    }

    // Render the React PDF element into a binary buffer
    const buffer = await renderToBuffer(InvoicePDFTemplate({ data }));
    const pdfUint8Array = new Uint8Array(buffer);

    return new Response(pdfUint8Array, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Invoice-${data.order.orderNumber}.pdf"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err: any) {
    console.error("PDF generation error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate PDF invoice" },
      { status: 500 }
    );
  }
}
