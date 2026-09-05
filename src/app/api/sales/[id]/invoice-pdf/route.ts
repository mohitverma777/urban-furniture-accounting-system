import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSalesOrderById } from "@/services/sales";
import { InvoicePDFTemplate } from "@/components/sales/invoice-pdf-template";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await getSalesOrderById(id);

    if (!data) {
      return NextResponse.json(
        { error: "Sales order not found" },
        { status: 404 }
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
