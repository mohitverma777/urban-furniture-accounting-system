import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

export interface InvoicePDFData {
  order: {
    id: string;
    orderNumber: string;
    type: string;
    status: string;
    invoiceDate: Date | string | null;
    dueDate: Date | string | null;
    subtotal: number; // in paise
    taxAmount: number; // in paise
    totalAmount: number; // in paise
    contactName: string | null;
    contactEmail: string | null;
    contactMobile: string | null;
    contactAddress: string | null;
    contactCity: string | null;
    createdAt?: Date | string | null;
  };
  items: Array<{
    id: string;
    productId: string;
    productName: string | null;
    productType: string | null;
    quantity: number;
    unitPrice: number; // in paise
    taxRate: number; // in hundredths or %
    taxAmount: number; // in paise
    lineTotal: number; // in paise
  }>;
  totalPaid: number; // in paise
  outstandingAmount: number; // in paise
}

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1e293b",
    backgroundColor: "#ffffff",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: "#0f172a",
    paddingBottom: 16,
    marginBottom: 20,
  },
  companyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f172a",
    letterSpacing: 0.5,
  },
  companySubtitle: {
    fontSize: 10,
    color: "#d97706",
    fontWeight: "bold",
    marginTop: 2,
    marginBottom: 6,
  },
  companyDetails: {
    fontSize: 8,
    color: "#475569",
    lineHeight: 1.3,
  },
  invoiceBadgeBox: {
    alignItems: "flex-end",
  },
  invoiceTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  orderNumText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#2563eb",
    marginTop: 4,
  },
  statusBadge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  statusPaid: {
    backgroundColor: "#dcfce7",
    color: "#15803d",
  },
  statusBilled: {
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
  },
  statusPartial: {
    backgroundColor: "#fef3c7",
    color: "#b45309",
  },
  statusDraft: {
    backgroundColor: "#f1f5f9",
    color: "#475569",
  },
  metaGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 16,
  },
  metaBox: {
    width: "48%",
    backgroundColor: "#f8fafc",
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionHeading: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#0f172a",
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 3,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  metaLabel: {
    color: "#64748b",
    fontSize: 8,
  },
  metaValue: {
    color: "#0f172a",
    fontSize: 8,
    fontWeight: "bold",
  },
  table: {
    width: "100%",
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  th: {
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 7,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  tableRowAlt: {
    backgroundColor: "#f8fafc",
  },
  td: {
    fontSize: 8,
    color: "#334155",
  },
  colSl: { width: "5%" },
  colItem: { width: "35%" },
  colType: { width: "12%" },
  colQty: { width: "8%", textAlign: "center" },
  colPrice: { width: "12%", textAlign: "right" },
  colTax: { width: "13%", textAlign: "right" },
  colTotal: { width: "15%", textAlign: "right" },

  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  paymentInfoBox: {
    width: "52%",
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  totalsBox: {
    width: "42%",
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  totalRowGrand: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1.5,
    borderTopColor: "#0f172a",
    paddingTop: 6,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#0f172a",
  },
  grandTotalValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
  },
  outstandingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
  },
  outstandingLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#b91c1c",
  },
  outstandingValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#b91c1c",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 7,
    color: "#94a3b8",
  },
  signatoryBox: {
    alignItems: "center",
    marginTop: 15,
  },
  signatoryLine: {
    width: 120,
    borderTopWidth: 1,
    borderTopColor: "#94a3b8",
    marginBottom: 4,
  },
  signatoryText: {
    fontSize: 7,
    color: "#64748b",
  },
});

function formatCurrency(paise: number): string {
  const rupees = paise / 100;
  return `Rs. ${rupees.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateVal: Date | string | null | undefined): string {
  if (!dateVal) return "—";
  const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getTaxRateDisplay(taxRate: number): string {
  const rate = taxRate >= 100 ? taxRate / 100 : taxRate;
  return `${rate}%`;
}

export function InvoicePDFTemplate({ data }: { data: InvoicePDFData }) {
  const { order, items, totalPaid, outstandingAmount } = data;

  const invDateStr = formatDate(order.invoiceDate || order.createdAt);
  const dueDateStr = formatDate(order.dueDate);

  // Calculate GST splits (Intra-state CGST 9% + SGST 9%)
  const totalTaxRupees = order.taxAmount / 100;
  const halfTaxPaise = Math.round(order.taxAmount / 2);

  const getBadgeStyle = (status: string) => {
    switch (status) {
      case "PAID":
        return styles.statusPaid;
      case "BILLED":
        return styles.statusBilled;
      case "PARTIAL":
        return styles.statusPartial;
      default:
        return styles.statusDraft;
    }
  };

  return (
    <Document title={`Invoice-${order.orderNumber}`} author="Urban Furniture">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.companyTitle}>URBAN FURNITURE</Text>
            <Text style={styles.companySubtitle}>Premium Modern Office & Home Solutions</Text>
            <Text style={styles.companyDetails}>
              Plot 42, Industrial Area Phase II, Lower Parel, Mumbai, MH - 400013{"\n"}
              GSTIN: 27AAPCU0123M1ZV | PAN: AAPCU0123M{"\n"}
              Email: accounts@urbanfurniture.com | Mobile: +91 98200 12345
            </Text>
          </View>

          <View style={styles.invoiceBadgeBox}>
            <Text style={styles.invoiceTitle}>
              {order.status === "DRAFT" ? "SALES ORDER" : "TAX INVOICE"}
            </Text>
            <Text style={styles.orderNumText}>{order.orderNumber}</Text>
            <View style={[styles.statusBadge, getBadgeStyle(order.status)]}>
              <Text>{order.status}</Text>
            </View>
          </View>
        </View>

        {/* Customer & Invoice Meta Grid */}
        <View style={styles.metaGrid}>
          {/* Bill To */}
          <View style={styles.metaBox}>
            <Text style={styles.sectionHeading}>Billed To (Customer)</Text>
            <Text style={{ fontSize: 10, fontWeight: "bold", color: "#0f172a", marginBottom: 3 }}>
              {order.contactName || "Walk-in Customer"}
            </Text>
            {order.contactAddress && (
              <Text style={{ fontSize: 8, color: "#475569", marginBottom: 2 }}>
                {order.contactAddress}, {order.contactCity || ""}
              </Text>
            )}
            {order.contactEmail && (
              <Text style={{ fontSize: 8, color: "#475569", marginBottom: 2 }}>
                Email: {order.contactEmail}
              </Text>
            )}
            {order.contactMobile && (
              <Text style={{ fontSize: 8, color: "#475569" }}>
                Phone: {order.contactMobile}
              </Text>
            )}
          </View>

          {/* Document Details */}
          <View style={styles.metaBox}>
            <Text style={styles.sectionHeading}>Invoice Details</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Invoice Date:</Text>
              <Text style={styles.metaValue}>{invDateStr}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Payment Due Date:</Text>
              <Text style={styles.metaValue}>{dueDateStr}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Place of Supply:</Text>
              <Text style={styles.metaValue}>27-Maharashtra</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Reverse Charge:</Text>
              <Text style={styles.metaValue}>No</Text>
            </View>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colSl]}>#</Text>
            <Text style={[styles.th, styles.colItem]}>Item Description</Text>
            <Text style={[styles.th, styles.colType]}>Type</Text>
            <Text style={[styles.th, styles.colQty]}>Qty</Text>
            <Text style={[styles.th, styles.colPrice]}>Unit Price</Text>
            <Text style={[styles.th, styles.colTax]}>GST Rate</Text>
            <Text style={[styles.th, styles.colTotal]}>Amount</Text>
          </View>

          {items.map((item, idx) => (
            <View
              key={item.id || idx}
              style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
            >
              <Text style={[styles.td, styles.colSl]}>{idx + 1}</Text>
              <Text style={[styles.td, styles.colItem, { fontWeight: "bold" }]}>
                {item.productName || "Product"}
              </Text>
              <Text style={[styles.td, styles.colType]}>
                {item.productType || "GOODS"}
              </Text>
              <Text style={[styles.td, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.td, styles.colPrice]}>
                {formatCurrency(item.unitPrice)}
              </Text>
              <Text style={[styles.td, styles.colTax]}>
                {getTaxRateDisplay(item.taxRate)}
              </Text>
              <Text style={[styles.td, styles.colTotal, { fontWeight: "bold" }]}>
                {formatCurrency(item.lineTotal)}
              </Text>
            </View>
          ))}
        </View>

        {/* Summary & Bank Details Section */}
        <View style={styles.summaryContainer}>
          {/* Bank & Terms */}
          <View style={styles.paymentInfoBox}>
            <Text style={styles.sectionHeading}>Bank Details & Payment Instructions</Text>
            <View style={{ marginTop: 4 }}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Bank Name:</Text>
                <Text style={styles.metaValue}>HDFC Bank Ltd</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Account Name:</Text>
                <Text style={styles.metaValue}>Urban Furniture Pvt Ltd</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Account No:</Text>
                <Text style={styles.metaValue}>50200084920194</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>IFSC Code:</Text>
                <Text style={styles.metaValue}>HDFC0000123</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Branch:</Text>
                <Text style={styles.metaValue}>Lower Parel, Mumbai</Text>
              </View>
            </View>
            <Text style={[styles.metaLabel, { marginTop: 8, fontSize: 7, fontStyle: "italic" }]}>
              * E. & O.E. Payments due within terms. Interest @ 18% p.a. applicable on overdue payments.
            </Text>
          </View>

          {/* Tax Breakdown & Totals */}
          <View style={styles.totalsBox}>
            <Text style={styles.sectionHeading}>Amount Summary</Text>
            <View style={styles.totalRow}>
              <Text style={styles.metaLabel}>Subtotal:</Text>
              <Text style={styles.metaValue}>{formatCurrency(order.subtotal)}</Text>
            </View>

            {totalTaxRupees > 0 && (
              <>
                <View style={styles.totalRow}>
                  <Text style={styles.metaLabel}>CGST (9%):</Text>
                  <Text style={styles.metaValue}>{formatCurrency(halfTaxPaise)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.metaLabel}>SGST (9%):</Text>
                  <Text style={styles.metaValue}>{formatCurrency(halfTaxPaise)}</Text>
                </View>
              </>
            )}

            <View style={styles.totalRowGrand}>
              <Text style={styles.grandTotalLabel}>Total Amount:</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(order.totalAmount)}</Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.metaLabel}>Amount Paid:</Text>
              <Text style={[styles.metaValue, { color: "#16a34a" }]}>
                {formatCurrency(totalPaid)}
              </Text>
            </View>

            <View style={styles.outstandingRow}>
              <Text style={styles.outstandingLabel}>Balance Due:</Text>
              <Text style={styles.outstandingValue}>
                {formatCurrency(outstandingAmount)}
              </Text>
            </View>
          </View>
        </View>

        {/* Signatory Box */}
        <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 25 }}>
          <View style={styles.signatoryBox}>
            <View style={styles.signatoryLine} />
            <Text style={styles.signatoryText}>For URBAN FURNITURE</Text>
            <Text style={[styles.signatoryText, { fontSize: 6, color: "#94a3b8" }]}>
              (Authorized Signatory)
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This is a computer-generated tax invoice generated by Urban Furniture Accounting Engine.
          </Text>
          <Text style={styles.footerText}>Page 1 of 1</Text>
        </View>
      </Page>
    </Document>
  );
}
