import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, contacts, products, journalEntries } from "@/db/schema";
import { like, or, eq } from "drizzle-orm";

export const runtime = "nodejs";

interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: "INVOICE" | "PURCHASE" | "CONTACT" | "PRODUCT" | "JOURNAL" | "NAVIGATION";
  url: string;
  badge?: string;
}

const STATIC_NAVIGATION: SearchResultItem[] = [
  { id: "nav-dash", title: "Financial Dashboard", subtitle: "KPIs, revenue vs expenses, cash position", category: "NAVIGATION", url: "/" },
  { id: "nav-sales", title: "Sales & Invoices", subtitle: "Customer orders, billing, and receipts", category: "NAVIGATION", url: "/sales" },
  { id: "nav-purchases", title: "Purchases & Vendor Bills", subtitle: "Supplier procurement, bills, AP", category: "NAVIGATION", url: "/purchases" },
  { id: "nav-stock", title: "Inventory & Stock Levels", subtitle: "Perpetual stock tracking, reorder points", category: "NAVIGATION", url: "/stock" },
  { id: "nav-contacts", title: "Counterparty Contacts", subtitle: "Customers, vendors, and partners", category: "NAVIGATION", url: "/contacts" },
  { id: "nav-products", title: "Product Catalog", subtitle: "Furniture items, pricing, inventory", category: "NAVIGATION", url: "/products" },
  { id: "nav-accounting", title: "General Ledger & Journals", subtitle: "Double-entry journal vouchers", category: "NAVIGATION", url: "/accounting" },
  { id: "nav-pnl", title: "Profit & Loss (P&L)", subtitle: "Income, COGS, operating expenses", category: "NAVIGATION", url: "/reports/profit-loss" },
  { id: "nav-bs", title: "Balance Sheet", subtitle: "Assets, liabilities, and equity", category: "NAVIGATION", url: "/reports/balance-sheet" },
  { id: "nav-gst", title: "Indian GST Compliance Report", subtitle: "Monthly tax slabs, IGST, CGST, SGST", category: "NAVIGATION", url: "/reports/gst" },
  { id: "nav-cashflow", title: "AI Cash Flow Forecast", subtitle: "Linear regression with 95% confidence bands", category: "NAVIGATION", url: "/reports/cash-flow" },
  { id: "nav-budgets", title: "Budgets & Cost Centers", subtitle: "Analytic accounts, budget variances", category: "NAVIGATION", url: "/budgets" },
  { id: "nav-import", title: "Master Data Import", subtitle: "Bulk import customers and products from Excel/CSV", category: "NAVIGATION", url: "/import" },
  { id: "nav-audit", title: "Audit Trail & Change Log", subtitle: "Immutable system logs, before/after JSON diffs", category: "NAVIGATION", url: "/admin/users?tab=audit" },
  { id: "nav-ai", title: "AI Financial Assistant", subtitle: "Talk to Your Ledger (Gemma 3:4B / Gemini)", category: "NAVIGATION", url: "/ai" },
  { id: "nav-users", title: "User Management & RBAC", subtitle: "System users, roles, security credentials", category: "NAVIGATION", url: "/admin/users" },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();

    const role = req.cookies.get("uf_user_role")?.value;
    const allowedStaticNav = STATIC_NAVIGATION.filter((item) => {
      if (item.url.startsWith("/admin") && role !== "ADMIN") return false;
      return true;
    });

    if (!q) {
      return NextResponse.json({
        success: true,
        results: allowedStaticNav.slice(0, 8),
      });
    }

    const pattern = `%${q}%`;
    const results: SearchResultItem[] = [];

    // 1. Match Navigation
    const matchedNav = allowedStaticNav.filter(
      (n) => n.title.toLowerCase().includes(q) || n.subtitle.toLowerCase().includes(q)
    );
    results.push(...matchedNav.slice(0, 3));

    // 2. Query Orders with joined contact name
    try {
      const orderMatches = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          type: orders.type,
          totalAmount: orders.totalAmount,
          status: orders.status,
          contactName: contacts.name,
        })
        .from(orders)
        .leftJoin(contacts, eq(orders.contactId, contacts.id))
        .where(
          or(
            like(orders.orderNumber, pattern),
            like(contacts.name, pattern)
          )
        )
        .limit(5);

      for (const ord of orderMatches) {
        const isSales = ord.type === "SO";
        results.push({
          id: ord.id,
          title: `${ord.orderNumber} - ${ord.contactName || "Counterparty"}`,
          subtitle: `${isSales ? "Sales Invoice" : "Purchase Bill"} · ₹${((ord.totalAmount || 0) / 100).toLocaleString("en-IN")}`,
          category: isSales ? "INVOICE" : "PURCHASE",
          url: isSales ? `/sales/${ord.id}` : `/purchases/${ord.id}`,
          badge: ord.status,
        });
      }
    } catch (e) {
      console.error("[Global Search] Order query error:", e);
    }

    // 3. Query Contacts
    try {
      const contactMatches = await db
        .select()
        .from(contacts)
        .where(
          or(
            like(contacts.name, pattern),
            like(contacts.email, pattern),
            like(contacts.city, pattern)
          )
        )
        .limit(4);

      for (const con of contactMatches) {
        results.push({
          id: con.id,
          title: con.name,
          subtitle: `${con.type === "CUSTOMER" ? "Customer" : "Vendor"} · ${con.city || con.email || "Active"}`,
          category: "CONTACT",
          url: `/contacts`,
          badge: con.type,
        });
      }
    } catch (e) {
      console.error("[Global Search] Contact query error:", e);
    }

    // 4. Query Products
    try {
      const productMatches = await db
        .select()
        .from(products)
        .where(
          or(
            like(products.name, pattern),
            like(products.category, pattern)
          )
        )
        .limit(4);

      for (const prod of productMatches) {
        const price = `₹${((prod.salesPrice || 0) / 100).toLocaleString("en-IN")}`;
        results.push({
          id: prod.id,
          title: prod.name,
          subtitle: `${prod.category || "Furniture"} · ${price}`,
          category: "PRODUCT",
          url: `/products`,
          badge: price,
        });
      }
    } catch (e) {
      console.error("[Global Search] Product query error:", e);
    }

    // 5. Query Journal Entries
    try {
      const journalMatches = await db
        .select()
        .from(journalEntries)
        .where(
          or(
            like(journalEntries.reference, pattern),
            like(journalEntries.description, pattern)
          )
        )
        .limit(3);

      for (const j of journalMatches) {
        results.push({
          id: j.id,
          title: `${j.reference || "Voucher"} - ${j.description || "General Entry"}`,
          subtitle: `General Ledger Voucher · ${new Date(j.date).toLocaleDateString("en-IN")}`,
          category: "JOURNAL",
          url: `/accounting`,
          badge: "Posted",
        });
      }
    } catch (e) {
      console.error("[Global Search] Journal query error:", e);
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (err: any) {
    console.error("[Global Search Error]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
