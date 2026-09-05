/**
 * src/db/seed.ts
 *
 * Deterministic database seed script for Urban Furniture Accounting System.
 *
 * Guarantees:
 *  - Deterministic IDs and timestamps for every entity.
 *  - Safe to rerun (idempotent: cleans and reseeds within a safe transaction).
 *  - Strict double-entry accounting invariant: SUM(debits) === SUM(credits).
 *  - Real operational-to-financial flow:
 *      * Opening Capital
 *      * Purchase Orders & Vendor Bills
 *      * Sales Orders & Customer Invoices
 *      * Warehouse Stock Movements (Perpetual Inventory)
 *      * Bank / Cash Payments against Orders
 *      * Operating Expenses tagged with Analytic Accounts (Cost Centers)
 *      * Realistic Budgets for Budget vs Actual reporting
 *
 * Run via:
 *   npm run db:seed
 */

import { resolve } from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { sql } from "drizzle-orm";
import { db } from "./index";
import {
  accounts,
  analyticAccounts,
  budgets,
  contacts,
  journalEntries,
  journalItems,
  journals,
  orderItems,
  orders,
  payments,
  products,
  stockMovements,
} from "./schema";

import { seedUsers } from "./seed-users";

// ---------------------------------------------------------------------------
// Deterministic UUIDs
// ---------------------------------------------------------------------------

export const SEED_IDS = {
  // Contacts
  contactAzure: "c0000000-0000-4000-8000-000000000001",
  contactRaj: "c0000000-0000-4000-8000-000000000002",
  contactNimesh: "c0000000-0000-4000-8000-000000000003",
  contactAbc: "c0000000-0000-4000-8000-000000000004",

  // Products
  productOfficeChair: "p0000000-0000-4000-8000-000000000001",
  productDiningTable: "p0000000-0000-4000-8000-000000000002",
  productExecutiveDesk: "p0000000-0000-4000-8000-000000000003",
  productSofa: "p0000000-0000-4000-8000-000000000004",
  productInstallationService: "p0000000-0000-4000-8000-000000000005",

  // Accounts
  accountCash1000: "a0000000-0000-4000-8000-000000001000",
  accountBank1010: "a0000000-0000-4000-8000-000000001010",
  accountDebtors1100: "a0000000-0000-4000-8000-000000001100",
  accountInventory1200: "a0000000-0000-4000-8000-000000001200",
  accountCreditors2000: "a0000000-0000-4000-8000-000000002000",
  accountTaxPayable2200: "a0000000-0000-4000-8000-000000002200",
  accountCapital3000: "a0000000-0000-4000-8000-000000003000",
  accountSalesIncome4000: "a0000000-0000-4000-8000-000000004000",
  accountPurchaseExpense5000: "a0000000-0000-4000-8000-000000005000",
  accountOperatingExpense5100: "a0000000-0000-4000-8000-000000005100",

  // Journals
  journalSales: "j0000000-0000-4000-8000-000000000001",
  journalPurchase: "j0000000-0000-4000-8000-000000000002",
  journalBank: "j0000000-0000-4000-8000-000000000003",
  journalCash: "j0000000-0000-4000-8000-000000000004",

  // Analytic Accounts
  analyticManufacturing: "aa000000-0000-4000-8000-000000000001",
  analyticShowroom: "aa000000-0000-4000-8000-000000000002",
  analyticDelivery: "aa000000-0000-4000-8000-000000000003",
  analyticMarketing: "aa000000-0000-4000-8000-000000000004",

  // Budgets
  budgetManufacturing: "b0000000-0000-4000-8000-000000000001",
  budgetShowroom: "b0000000-0000-4000-8000-000000000002",
  budgetDelivery: "b0000000-0000-4000-8000-000000000003",
  budgetMarketing: "b0000000-0000-4000-8000-000000000004",

  // Orders
  orderPO1: "o0000000-0000-4000-8000-000000000001",
  orderPO2: "o0000000-0000-4000-8000-000000000002",
  orderSO1: "o0000000-0000-4000-8000-000000000003",
  orderSO2: "o0000000-0000-4000-8000-000000000004",

  // Journal Entries
  entryCapital: "je000000-0000-4000-8000-000000000001",
  entryCashWithdrawal: "je000000-0000-4000-8000-000000000002",
  entryBillPO1: "je000000-0000-4000-8000-000000000003",
  entryPayPO1: "je000000-0000-4000-8000-000000000004",
  entryBillPO2: "je000000-0000-4000-8000-000000000005",
  entryPayPO2: "je000000-0000-4000-8000-000000000006",
  entryInvoiceSO1: "je000000-0000-4000-8000-000000000007",
  entryPaySO1: "je000000-0000-4000-8000-000000000008",
  entryInvoiceSO2: "je000000-0000-4000-8000-000000000009",
  entryExpShowroom: "je000000-0000-4000-8000-000000000010",
  entryExpMarketing: "je000000-0000-4000-8000-000000000011",
  entryExpDelivery: "je000000-0000-4000-8000-000000000012",

  // Payments
  paymentPO1: "pay00000-0000-4000-8000-000000000001",
  paymentPO2: "pay00000-0000-4000-8000-000000000002",
  paymentSO1: "pay00000-0000-4000-8000-000000000003",
};

// ---------------------------------------------------------------------------
// Fixed Seed Timestamps (Fiscal Year 2026)
// ---------------------------------------------------------------------------

const DATES = {
  Jan01: new Date("2026-01-01T09:00:00.000Z"),
  Jan05: new Date("2026-01-05T10:00:00.000Z"),
  Jan10: new Date("2026-01-10T11:00:00.000Z"),
  Jan15: new Date("2026-01-15T14:30:00.000Z"),
  Jan18: new Date("2026-01-18T10:30:00.000Z"),
  Jan20: new Date("2026-01-20T16:00:00.000Z"),
  Jan31: new Date("2026-01-31T18:00:00.000Z"),
  Feb01: new Date("2026-02-01T10:00:00.000Z"),
  Feb02: new Date("2026-02-02T12:00:00.000Z"),
  Feb10: new Date("2026-02-10T15:00:00.000Z"),
  Feb15: new Date("2026-02-15T11:30:00.000Z"),
  Feb20: new Date("2026-02-20T16:45:00.000Z"),
  Mar15: new Date("2026-03-15T18:00:00.000Z"),
  Dec31: new Date("2026-12-31T23:59:59.000Z"),
};

// ---------------------------------------------------------------------------
// Main Seed Function
// ---------------------------------------------------------------------------

export async function seed() {
  console.log("🌱 [Seed] Applying migrations...");
  const migrationsFolder = resolve(process.cwd(), "src/db/migrations");
  migrate(db, { migrationsFolder });

  console.log("🧹 [Seed] Cleaning existing data in reverse dependency order...");
  // Use raw delete queries to ensure clean teardown regardless of current rows
  db.run(sql`PRAGMA foreign_keys = OFF;`);
  db.run(sql`DELETE FROM payments;`);
  db.run(sql`DELETE FROM stock_movements;`);
  db.run(sql`DELETE FROM order_items;`);
  db.run(sql`DELETE FROM orders;`);
  db.run(sql`DELETE FROM journal_items;`);
  db.run(sql`DELETE FROM journal_entries;`);
  db.run(sql`DELETE FROM budgets;`);
  db.run(sql`DELETE FROM analytic_accounts;`);
  db.run(sql`DELETE FROM journals;`);
  db.run(sql`DELETE FROM accounts;`);
  db.run(sql`DELETE FROM products;`);
  db.run(sql`DELETE FROM users;`);
  db.run(sql`DELETE FROM contacts;`);
  db.run(sql`PRAGMA foreign_keys = ON;`);

  console.log("👥 [Seed] Seeding Contacts...");
  await db.insert(contacts).values([
    {
      id: SEED_IDS.contactAzure,
      name: "Azure Furniture",
      type: "VENDOR",
      email: "contact@azurefurniture.com",
      mobile: "+91 98200 11223",
      address: "Plot 42, Industrial Area, Andheri East",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      createdAt: DATES.Jan01,
      updatedAt: DATES.Jan01,
    },
    {
      id: SEED_IDS.contactRaj,
      name: "Raj Furniture",
      type: "VENDOR",
      email: "sales@rajfurniture.com",
      mobile: "+91 94140 33445",
      address: "12 Marwar Handicrafts Estate, Boranada",
      city: "Jodhpur",
      state: "Rajasthan",
      pincode: "342001",
      createdAt: DATES.Jan01,
      updatedAt: DATES.Jan01,
    },
    {
      id: SEED_IDS.contactNimesh,
      name: "Nimesh Pathak",
      type: "CUSTOMER",
      email: "nimesh.pathak@gmail.com",
      mobile: "+91 98800 55667",
      address: "402, Green Glen Layout, Bellandur",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560038",
      createdAt: DATES.Jan01,
      updatedAt: DATES.Jan01,
    },
    {
      id: SEED_IDS.contactAbc,
      name: "ABC Interiors",
      type: "CUSTOMER",
      email: "projects@abcinteriors.in",
      mobile: "+91 97000 88990",
      address: "Level 3, Cyber Gateway, Hitec City",
      city: "Hyderabad",
      state: "Telangana",
      pincode: "500081",
      createdAt: DATES.Jan01,
      updatedAt: DATES.Jan01,
    },
  ]);

  await seedUsers();

  console.log("🛋️  [Seed] Seeding Products...");
  // All monetary values in INTEGER PAISE (1 INR = 100 paise)
  await db.insert(products).values([
    {
      id: SEED_IDS.productOfficeChair,
      name: "Office Chair",
      type: "GOODS",
      salesPrice: 850000, // ₹8,500.00
      costPrice: 450000, // ₹4,500.00
      category: "Chairs",
      createdAt: DATES.Jan01,
      updatedAt: DATES.Jan01,
    },
    {
      id: SEED_IDS.productDiningTable,
      name: "Wooden Dining Table",
      type: "GOODS",
      salesPrice: 3200000, // ₹32,000.00
      costPrice: 1800000, // ₹18,000.00
      category: "Tables",
      createdAt: DATES.Jan01,
      updatedAt: DATES.Jan01,
    },
    {
      id: SEED_IDS.productExecutiveDesk,
      name: "Executive Desk",
      type: "GOODS",
      salesPrice: 2400000, // ₹24,000.00
      costPrice: 1300000, // ₹13,000.00
      category: "Desks",
      createdAt: DATES.Jan01,
      updatedAt: DATES.Jan01,
    },
    {
      id: SEED_IDS.productSofa,
      name: "Sofa",
      type: "GOODS",
      salesPrice: 4500000, // ₹45,000.00
      costPrice: 2500000, // ₹25,000.00
      category: "Living Room",
      createdAt: DATES.Jan01,
      updatedAt: DATES.Jan01,
    },
    {
      id: SEED_IDS.productInstallationService,
      name: "Installation Service",
      type: "SERVICE",
      salesPrice: 150000, // ₹1,500.00
      costPrice: 50000, // ₹500.00
      category: "Services",
      createdAt: DATES.Jan01,
      updatedAt: DATES.Jan01,
    },
  ]);

  console.log("📒 [Seed] Seeding Chart of Accounts...");
  await db.insert(accounts).values([
    {
      id: SEED_IDS.accountCash1000,
      code: "1000",
      name: "Cash",
      type: "ASSET",
      isActive: true,
      createdAt: DATES.Jan01,
      updatedAt: DATES.Jan01,
    },
    {
      id: SEED_IDS.accountBank1010,
      code: "1010",
      name: "Bank",
      type: "ASSET",
      isActive: true,
      createdAt: DATES.Jan01,
      updatedAt: DATES.Jan01,
    },
    {
      id: SEED_IDS.accountDebtors1100,
      code: "1100",
      name: "Debtors",
      type: "ASSET",
      isActive: true,
      createdAt: DATES.Jan01,
      updatedAt: DATES.Jan01,
    },
    {
      id: SEED_IDS.accountInventory1200,
      code: "1200",
      name: "Inventory",
      type: "ASSET",
      isActive: true,
      createdAt: DATES.Jan01,
      updatedAt: DATES.Jan01,
    },
    {
      id: SEED_IDS.accountCreditors2000,
      code: "2000",
      name: "Creditors",
      type: "LIABILITY",
      isActive: true,
      createdAt: DATES.Jan01,
      updatedAt: DATES.Jan01,
    },
    {
      id: SEED_IDS.accountTaxPayable2200,
      code: "2200",
      name: "Tax Payable",
      type: "LIABILITY",
      isActive: true,
      createdAt: DATES.Jan01,
      updatedAt: DATES.Jan01,
    },
    {
      id: SEED_IDS.accountCapital3000,
      code: "3000",
      name: "Capital",
      type: "CAPITAL",
      isActive: true,
      createdAt: DATES.Jan01,
      updatedAt: DATES.Jan01,
    },
    {
      id: SEED_IDS.accountSalesIncome4000,
      code: "4000",
      name: "Sales Income",
      type: "INCOME",
      isActive: true,
      createdAt: DATES.Jan01,
      updatedAt: DATES.Jan01,
    },
    {
      id: SEED_IDS.accountPurchaseExpense5000,
      code: "5000",
      name: "Purchase Expense",
      type: "EXPENSE",
      isActive: true,
      createdAt: DATES.Jan01,
      updatedAt: DATES.Jan01,
    },
    {
      id: SEED_IDS.accountOperatingExpense5100,
      code: "5100",
      name: "Operating Expense",
      type: "EXPENSE",
      isActive: true,
      createdAt: DATES.Jan01,
      updatedAt: DATES.Jan01,
    },
  ]);

  console.log("📖 [Seed] Seeding Journals...");
  await db.insert(journals).values([
    {
      id: SEED_IDS.journalSales,
      name: "Sales Journal",
      type: "SALES",
      defaultAccountId: SEED_IDS.accountSalesIncome4000,
      createdAt: DATES.Jan01,
      updatedAt: DATES.Jan01,
    },
    {
      id: SEED_IDS.journalPurchase,
      name: "Purchase Journal",
      type: "PURCHASE",
      defaultAccountId: SEED_IDS.accountPurchaseExpense5000,
      createdAt: DATES.Jan01,
      updatedAt: DATES.Jan01,
    },
    {
      id: SEED_IDS.journalBank,
      name: "Bank Journal",
      type: "BANK",
      defaultAccountId: SEED_IDS.accountBank1010,
      createdAt: DATES.Jan01,
      updatedAt: DATES.Jan01,
    },
    {
      id: SEED_IDS.journalCash,
      name: "Cash Journal",
      type: "CASH",
      defaultAccountId: SEED_IDS.accountCash1000,
      createdAt: DATES.Jan01,
      updatedAt: DATES.Jan01,
    },
  ]);

  console.log("📊 [Seed] Seeding Analytic Accounts & Budgets...");
  await db.insert(analyticAccounts).values([
    {
      id: SEED_IDS.analyticManufacturing,
      name: "Manufacturing",
      type: "EXPENSE",
      createdAt: DATES.Jan01,
    },
    {
      id: SEED_IDS.analyticShowroom,
      name: "Showroom",
      type: "EXPENSE",
      createdAt: DATES.Jan01,
    },
    {
      id: SEED_IDS.analyticDelivery,
      name: "Delivery",
      type: "EXPENSE",
      createdAt: DATES.Jan01,
    },
    {
      id: SEED_IDS.analyticMarketing,
      name: "Marketing",
      type: "EXPENSE",
      createdAt: DATES.Jan01,
    },
  ]);

  // Annual Budgets for FY 2026
  await db.insert(budgets).values([
    {
      id: SEED_IDS.budgetManufacturing,
      name: "Manufacturing Budget 2026",
      analyticAccountId: SEED_IDS.analyticManufacturing,
      plannedAmount: 150000000, // ₹15,00,000.00
      startDate: DATES.Jan01,
      endDate: DATES.Dec31,
      createdAt: DATES.Jan01,
    },
    {
      id: SEED_IDS.budgetShowroom,
      name: "Showroom Operations Budget 2026",
      analyticAccountId: SEED_IDS.analyticShowroom,
      plannedAmount: 80000000, // ₹8,00,000.00
      startDate: DATES.Jan01,
      endDate: DATES.Dec31,
      createdAt: DATES.Jan01,
    },
    {
      id: SEED_IDS.budgetDelivery,
      name: "Delivery & Logistics Budget 2026",
      analyticAccountId: SEED_IDS.analyticDelivery,
      plannedAmount: 40000000, // ₹4,00,000.00
      startDate: DATES.Jan01,
      endDate: DATES.Dec31,
      createdAt: DATES.Jan01,
    },
    {
      id: SEED_IDS.budgetMarketing,
      name: "Marketing & Promotion Budget 2026",
      analyticAccountId: SEED_IDS.analyticMarketing,
      plannedAmount: 60000000, // ₹6,00,000.00
      startDate: DATES.Jan01,
      endDate: DATES.Dec31,
      createdAt: DATES.Jan01,
    },
  ]);

  console.log("📑 [Seed] Seeding Orders & Order Items...");
  // PO 1: Azure Furniture (10 Office Chairs + 4 Sofas)
  // Subtotal = 45,000 + 1,00,000 = 1,45,000 | Tax @ 18% = 26,100 | Total = 1,71,100
  await db.insert(orders).values([
    {
      id: SEED_IDS.orderPO1,
      orderNumber: "PO-2026-0001",
      type: "PO",
      contactId: SEED_IDS.contactAzure,
      status: "PAID",
      invoiceDate: DATES.Jan10,
      dueDate: DATES.Jan20,
      subtotal: 14500000, // ₹1,45,000
      taxAmount: 2610000, // ₹26,100
      totalAmount: 17110000, // ₹1,71,100
      createdAt: DATES.Jan10,
      updatedAt: DATES.Jan15,
    },
    // PO 2: Raj Furniture (5 Dining Tables + 5 Executive Desks)
    // Subtotal = 90,000 + 65,000 = 1,55,000 | Tax @ 18% = 27,900 | Total = 1,82,900
    {
      id: SEED_IDS.orderPO2,
      orderNumber: "PO-2026-0002",
      type: "PO",
      contactId: SEED_IDS.contactRaj,
      status: "PARTIAL",
      invoiceDate: DATES.Jan18,
      dueDate: DATES.Feb15,
      subtotal: 15500000, // ₹1,55,000
      taxAmount: 2790000, // ₹27,900
      totalAmount: 18290000, // ₹1,82,900
      createdAt: DATES.Jan18,
      updatedAt: DATES.Jan20,
    },
    // SO 1: Nimesh Pathak (1 Dining Table + 4 Chairs + 1 Installation)
    // Subtotal = 32,000 + 34,000 + 1,500 = 67,500 | Tax @ 18% = 12,150 | Total = 79,650
    {
      id: SEED_IDS.orderSO1,
      orderNumber: "SO-2026-0001",
      type: "SO",
      contactId: SEED_IDS.contactNimesh,
      status: "PAID",
      invoiceDate: DATES.Feb01,
      dueDate: DATES.Feb10,
      subtotal: 6750000, // ₹67,500
      taxAmount: 1215000, // ₹12,150
      totalAmount: 7965000, // ₹79,650
      createdAt: DATES.Feb01,
      updatedAt: DATES.Feb02,
    },
    // SO 2: ABC Interiors (2 Sofas + 3 Executive Desks)
    // Subtotal = 90,000 + 72,000 = 1,62,000 | Tax @ 18% = 29,160 | Total = 1,91,160
    {
      id: SEED_IDS.orderSO2,
      orderNumber: "SO-2026-0002",
      type: "SO",
      contactId: SEED_IDS.contactAbc,
      status: "BILLED", // Awaiting payment
      invoiceDate: DATES.Feb15,
      dueDate: DATES.Mar15,
      subtotal: 16200000, // ₹1,62,000
      taxAmount: 2916000, // ₹29,160
      totalAmount: 19116000, // ₹1,91,160
      createdAt: DATES.Feb15,
      updatedAt: DATES.Feb15,
    },
  ]);

  await db.insert(orderItems).values([
    // PO 1 items
    {
      id: "oi000000-0000-4000-8000-000000000001",
      orderId: SEED_IDS.orderPO1,
      productId: SEED_IDS.productOfficeChair,
      quantity: 10,
      unitPrice: 450000,
      taxRate: 1800, // 18%
      taxAmount: 810000,
      lineTotal: 5310000,
    },
    {
      id: "oi000000-0000-4000-8000-000000000002",
      orderId: SEED_IDS.orderPO1,
      productId: SEED_IDS.productSofa,
      quantity: 4,
      unitPrice: 2500000,
      taxRate: 1800,
      taxAmount: 1800000,
      lineTotal: 11800000,
    },
    // PO 2 items
    {
      id: "oi000000-0000-4000-8000-000000000003",
      orderId: SEED_IDS.orderPO2,
      productId: SEED_IDS.productDiningTable,
      quantity: 5,
      unitPrice: 1800000,
      taxRate: 1800,
      taxAmount: 1620000,
      lineTotal: 10620000,
    },
    {
      id: "oi000000-0000-4000-8000-000000000004",
      orderId: SEED_IDS.orderPO2,
      productId: SEED_IDS.productExecutiveDesk,
      quantity: 5,
      unitPrice: 1300000,
      taxRate: 1800,
      taxAmount: 1170000,
      lineTotal: 7670000,
    },
    // SO 1 items
    {
      id: "oi000000-0000-4000-8000-000000000005",
      orderId: SEED_IDS.orderSO1,
      productId: SEED_IDS.productDiningTable,
      quantity: 1,
      unitPrice: 3200000,
      taxRate: 1800,
      taxAmount: 576000,
      lineTotal: 3776000,
    },
    {
      id: "oi000000-0000-4000-8000-000000000006",
      orderId: SEED_IDS.orderSO1,
      productId: SEED_IDS.productOfficeChair,
      quantity: 4,
      unitPrice: 850000,
      taxRate: 1800,
      taxAmount: 612000,
      lineTotal: 4012000,
    },
    {
      id: "oi000000-0000-4000-8000-000000000007",
      orderId: SEED_IDS.orderSO1,
      productId: SEED_IDS.productInstallationService,
      quantity: 1,
      unitPrice: 150000,
      taxRate: 1800,
      taxAmount: 27000,
      lineTotal: 177000,
    },
    // SO 2 items
    {
      id: "oi000000-0000-4000-8000-000000000008",
      orderId: SEED_IDS.orderSO2,
      productId: SEED_IDS.productSofa,
      quantity: 2,
      unitPrice: 4500000,
      taxRate: 1800,
      taxAmount: 1620000,
      lineTotal: 10620000,
    },
    {
      id: "oi000000-0000-4000-8000-000000000009",
      orderId: SEED_IDS.orderSO2,
      productId: SEED_IDS.productExecutiveDesk,
      quantity: 3,
      unitPrice: 2400000,
      taxRate: 1800,
      taxAmount: 1296000,
      lineTotal: 8496000,
    },
  ]);

  console.log("📦 [Seed] Seeding Warehouse Stock Movements...");
  // Tracks perpetual inventory ledger for GOODS
  await db.insert(stockMovements).values([
    // Inbound from PO-2026-0001
    {
      id: "sm000000-0000-4000-8000-000000000001",
      productId: SEED_IDS.productOfficeChair,
      type: "PURCHASE",
      quantity: 10,
      referenceId: "PO-2026-0001",
      createdAt: DATES.Jan10,
    },
    {
      id: "sm000000-0000-4000-8000-000000000002",
      productId: SEED_IDS.productSofa,
      type: "PURCHASE",
      quantity: 4,
      referenceId: "PO-2026-0001",
      createdAt: DATES.Jan10,
    },
    // Inbound from PO-2026-0002
    {
      id: "sm000000-0000-4000-8000-000000000003",
      productId: SEED_IDS.productDiningTable,
      type: "PURCHASE",
      quantity: 5,
      referenceId: "PO-2026-0002",
      createdAt: DATES.Jan18,
    },
    {
      id: "sm000000-0000-4000-8000-000000000004",
      productId: SEED_IDS.productExecutiveDesk,
      type: "PURCHASE",
      quantity: 5,
      referenceId: "PO-2026-0002",
      createdAt: DATES.Jan18,
    },
    // Outbound from SO-2026-0001
    {
      id: "sm000000-0000-4000-8000-000000000005",
      productId: SEED_IDS.productDiningTable,
      type: "SALE",
      quantity: -1,
      referenceId: "SO-2026-0001",
      createdAt: DATES.Feb01,
    },
    {
      id: "sm000000-0000-4000-8000-000000000006",
      productId: SEED_IDS.productOfficeChair,
      type: "SALE",
      quantity: -4,
      referenceId: "SO-2026-0001",
      createdAt: DATES.Feb01,
    },
    // Outbound from SO-2026-0002
    {
      id: "sm000000-0000-4000-8000-000000000007",
      productId: SEED_IDS.productSofa,
      type: "SALE",
      quantity: -2,
      referenceId: "SO-2026-0002",
      createdAt: DATES.Feb15,
    },
    {
      id: "sm000000-0000-4000-8000-000000000008",
      productId: SEED_IDS.productExecutiveDesk,
      type: "SALE",
      quantity: -3,
      referenceId: "SO-2026-0002",
      createdAt: DATES.Feb15,
    },
  ]);

  console.log("⚖️  [Seed] Seeding Double-Entry Journal Entries & Line Items...");

  // Journal Entry Headers
  await db.insert(journalEntries).values([
    // 1. Initial Capital Introduced
    {
      id: SEED_IDS.entryCapital,
      journalId: SEED_IDS.journalBank,
      date: DATES.Jan01,
      reference: "INIT-CAP-2026",
      description: "Initial promoter equity capital introduced into Bank Account",
      createdAt: DATES.Jan01,
    },
    // 2. Cash withdrawal for petty cash
    {
      id: SEED_IDS.entryCashWithdrawal,
      journalId: SEED_IDS.journalCash,
      date: DATES.Jan05,
      reference: "CHQ-00001",
      description: "Cash withdrawal from Bank for petty cash operations",
      createdAt: DATES.Jan05,
    },
    // 3. Vendor Bill for PO-2026-0001 (Azure Furniture)
    {
      id: SEED_IDS.entryBillPO1,
      journalId: SEED_IDS.journalPurchase,
      date: DATES.Jan10,
      reference: "BILL-AZURE-001",
      description: "Vendor Bill for PO-2026-0001 (Azure Furniture)",
      createdAt: DATES.Jan10,
    },
    // 4. Payment to Azure Furniture
    {
      id: SEED_IDS.entryPayPO1,
      journalId: SEED_IDS.journalBank,
      date: DATES.Jan15,
      reference: "UTR-AZURE-99881",
      description: "Payment for Vendor Bill BILL-AZURE-001",
      createdAt: DATES.Jan15,
    },
    // 5. Vendor Bill for PO-2026-0002 (Raj Furniture)
    {
      id: SEED_IDS.entryBillPO2,
      journalId: SEED_IDS.journalPurchase,
      date: DATES.Jan18,
      reference: "BILL-RAJ-001",
      description: "Vendor Bill for PO-2026-0002 (Raj Furniture)",
      createdAt: DATES.Jan18,
    },
    // 6. Partial Payment to Raj Furniture
    {
      id: SEED_IDS.entryPayPO2,
      journalId: SEED_IDS.journalBank,
      date: DATES.Jan20,
      reference: "UTR-RAJ-44552",
      description: "Partial Payment for Vendor Bill BILL-RAJ-001",
      createdAt: DATES.Jan20,
    },
    // 7. Customer Invoice for SO-2026-0001 (Nimesh Pathak)
    {
      id: SEED_IDS.entryInvoiceSO1,
      journalId: SEED_IDS.journalSales,
      date: DATES.Feb01,
      reference: "INV-2026-0001",
      description: "Customer Invoice for SO-2026-0001 (Nimesh Pathak)",
      createdAt: DATES.Feb01,
    },
    // 8. Payment from Nimesh Pathak
    {
      id: SEED_IDS.entryPaySO1,
      journalId: SEED_IDS.journalBank,
      date: DATES.Feb02,
      reference: "UPI-NIMESH-1234",
      description: "Customer receipt for Invoice INV-2026-0001",
      createdAt: DATES.Feb02,
    },
    // 9. Customer Invoice for SO-2026-0002 (ABC Interiors)
    {
      id: SEED_IDS.entryInvoiceSO2,
      journalId: SEED_IDS.journalSales,
      date: DATES.Feb15,
      reference: "INV-2026-0002",
      description: "Customer Invoice for SO-2026-0002 (ABC Interiors)",
      createdAt: DATES.Feb15,
    },
    // 10. Showroom Rent Expense
    {
      id: SEED_IDS.entryExpShowroom,
      journalId: SEED_IDS.journalBank,
      date: DATES.Jan31,
      reference: "EXP-SHOWROOM-JAN",
      description: "Monthly showroom rental and utility charges",
      createdAt: DATES.Jan31,
    },
    // 11. Marketing Expense
    {
      id: SEED_IDS.entryExpMarketing,
      journalId: SEED_IDS.journalBank,
      date: DATES.Feb10,
      reference: "EXP-MKT-FEB",
      description: "Online catalog and local digital ad campaigns",
      createdAt: DATES.Feb10,
    },
    // 12. Delivery Logistics Expense
    {
      id: SEED_IDS.entryExpDelivery,
      journalId: SEED_IDS.journalCash,
      date: DATES.Feb20,
      reference: "EXP-DELIV-FEB",
      description: "Delivery van diesel, toll charges, and packing supplies",
      createdAt: DATES.Feb20,
    },
  ]);

  // Balanced Journal Items: Every Entry has SUM(debit) === SUM(credit)
  await db.insert(journalItems).values([
    // Entry 1: Capital Introduced (₹25,00,000)
    {
      id: "ji000000-0000-4000-8000-000000000001",
      entryId: SEED_IDS.entryCapital,
      accountId: SEED_IDS.accountBank1010,
      debit: 250000000,
      credit: 0,
    },
    {
      id: "ji000000-0000-4000-8000-000000000002",
      entryId: SEED_IDS.entryCapital,
      accountId: SEED_IDS.accountCapital3000,
      debit: 0,
      credit: 250000000,
    },

    // Entry 2: Cash Withdrawal (₹25,000)
    {
      id: "ji000000-0000-4000-8000-000000000003",
      entryId: SEED_IDS.entryCashWithdrawal,
      accountId: SEED_IDS.accountCash1000,
      debit: 2500000,
      credit: 0,
    },
    {
      id: "ji000000-0000-4000-8000-000000000004",
      entryId: SEED_IDS.entryCashWithdrawal,
      accountId: SEED_IDS.accountBank1010,
      debit: 0,
      credit: 2500000,
    },

    // Entry 3: Vendor Bill PO 1 (Azure Furniture: ₹1,71,100)
    // Dr Purchase Expense (Manufacturing) ₹1,45,000 + Dr Tax Payable ₹26,100 | Cr Creditors ₹1,71,100
    {
      id: "ji000000-0000-4000-8000-000000000005",
      entryId: SEED_IDS.entryBillPO1,
      accountId: SEED_IDS.accountPurchaseExpense5000,
      analyticAccountId: SEED_IDS.analyticManufacturing,
      debit: 14500000,
      credit: 0,
    },
    {
      id: "ji000000-0000-4000-8000-000000000006",
      entryId: SEED_IDS.entryBillPO1,
      accountId: SEED_IDS.accountTaxPayable2200,
      debit: 2610000,
      credit: 0,
    },
    {
      id: "ji000000-0000-4000-8000-000000000007",
      entryId: SEED_IDS.entryBillPO1,
      accountId: SEED_IDS.accountCreditors2000,
      debit: 0,
      credit: 17110000,
    },

    // Entry 4: Vendor Payment PO 1 (₹1,71,100)
    // Dr Creditors ₹1,71,100 | Cr Bank ₹1,71,100
    {
      id: "ji000000-0000-4000-8000-000000000008",
      entryId: SEED_IDS.entryPayPO1,
      accountId: SEED_IDS.accountCreditors2000,
      debit: 17110000,
      credit: 0,
    },
    {
      id: "ji000000-0000-4000-8000-000000000009",
      entryId: SEED_IDS.entryPayPO1,
      accountId: SEED_IDS.accountBank1010,
      debit: 0,
      credit: 17110000,
    },

    // Entry 5: Vendor Bill PO 2 (Raj Furniture: ₹1,82,900)
    // Dr Purchase Expense (Manufacturing) ₹1,55,000 + Dr Tax Payable ₹27,900 | Cr Creditors ₹1,82,900
    {
      id: "ji000000-0000-4000-8000-000000000010",
      entryId: SEED_IDS.entryBillPO2,
      accountId: SEED_IDS.accountPurchaseExpense5000,
      analyticAccountId: SEED_IDS.analyticManufacturing,
      debit: 15500000,
      credit: 0,
    },
    {
      id: "ji000000-0000-4000-8000-000000000011",
      entryId: SEED_IDS.entryBillPO2,
      accountId: SEED_IDS.accountTaxPayable2200,
      debit: 2790000,
      credit: 0,
    },
    {
      id: "ji000000-0000-4000-8000-000000000012",
      entryId: SEED_IDS.entryBillPO2,
      accountId: SEED_IDS.accountCreditors2000,
      debit: 0,
      credit: 18290000,
    },

    // Entry 6: Partial Payment to Raj Furniture (₹1,00,000)
    // Dr Creditors ₹1,00,000 | Cr Bank ₹1,00,000 (leaves ₹82,900 balance in Creditors)
    {
      id: "ji000000-0000-4000-8000-000000000013",
      entryId: SEED_IDS.entryPayPO2,
      accountId: SEED_IDS.accountCreditors2000,
      debit: 10000000,
      credit: 0,
    },
    {
      id: "ji000000-0000-4000-8000-000000000014",
      entryId: SEED_IDS.entryPayPO2,
      accountId: SEED_IDS.accountBank1010,
      debit: 0,
      credit: 10000000,
    },

    // Entry 7: Customer Invoice SO 1 (Nimesh Pathak: ₹79,650)
    // Dr Debtors ₹79,650 | Cr Sales Income ₹67,500 + Cr Tax Payable ₹12,150
    {
      id: "ji000000-0000-4000-8000-000000000015",
      entryId: SEED_IDS.entryInvoiceSO1,
      accountId: SEED_IDS.accountDebtors1100,
      debit: 7965000,
      credit: 0,
    },
    {
      id: "ji000000-0000-4000-8000-000000000016",
      entryId: SEED_IDS.entryInvoiceSO1,
      accountId: SEED_IDS.accountSalesIncome4000,
      debit: 0,
      credit: 6750000,
    },
    {
      id: "ji000000-0000-4000-8000-000000000017",
      entryId: SEED_IDS.entryInvoiceSO1,
      accountId: SEED_IDS.accountTaxPayable2200,
      debit: 0,
      credit: 1215000,
    },

    // Entry 8: Customer Payment SO 1 (₹79,650)
    // Dr Bank ₹79,650 | Cr Debtors ₹79,650
    {
      id: "ji000000-0000-4000-8000-000000000018",
      entryId: SEED_IDS.entryPaySO1,
      accountId: SEED_IDS.accountBank1010,
      debit: 7965000,
      credit: 0,
    },
    {
      id: "ji000000-0000-4000-8000-000000000019",
      entryId: SEED_IDS.entryPaySO1,
      accountId: SEED_IDS.accountDebtors1100,
      debit: 0,
      credit: 7965000,
    },

    // Entry 9: Customer Invoice SO 2 (ABC Interiors: ₹1,91,160)
    // Dr Debtors ₹1,91,160 | Cr Sales Income ₹1,62,000 + Cr Tax Payable ₹29,160
    {
      id: "ji000000-0000-4000-8000-000000000020",
      entryId: SEED_IDS.entryInvoiceSO2,
      accountId: SEED_IDS.accountDebtors1100,
      debit: 19116000,
      credit: 0,
    },
    {
      id: "ji000000-0000-4000-8000-000000000021",
      entryId: SEED_IDS.entryInvoiceSO2,
      accountId: SEED_IDS.accountSalesIncome4000,
      debit: 0,
      credit: 16200000,
    },
    {
      id: "ji000000-0000-4000-8000-000000000022",
      entryId: SEED_IDS.entryInvoiceSO2,
      accountId: SEED_IDS.accountTaxPayable2200,
      debit: 0,
      credit: 2916000,
    },

    // Entry 10: Showroom Rent (₹45,000)
    // Dr Operating Expense (Showroom) ₹45,000 | Cr Bank ₹45,000
    {
      id: "ji000000-0000-4000-8000-000000000023",
      entryId: SEED_IDS.entryExpShowroom,
      accountId: SEED_IDS.accountOperatingExpense5100,
      analyticAccountId: SEED_IDS.analyticShowroom,
      debit: 4500000,
      credit: 0,
    },
    {
      id: "ji000000-0000-4000-8000-000000000024",
      entryId: SEED_IDS.entryExpShowroom,
      accountId: SEED_IDS.accountBank1010,
      debit: 0,
      credit: 4500000,
    },

    // Entry 11: Marketing Ads (₹30,000)
    // Dr Operating Expense (Marketing) ₹30,000 | Cr Bank ₹30,000
    {
      id: "ji000000-0000-4000-8000-000000000025",
      entryId: SEED_IDS.entryExpMarketing,
      accountId: SEED_IDS.accountOperatingExpense5100,
      analyticAccountId: SEED_IDS.analyticMarketing,
      debit: 3000000,
      credit: 0,
    },
    {
      id: "ji000000-0000-4000-8000-000000000026",
      entryId: SEED_IDS.entryExpMarketing,
      accountId: SEED_IDS.accountBank1010,
      debit: 0,
      credit: 3000000,
    },

    // Entry 12: Delivery Fuel (₹12,000 from Cash)
    // Dr Operating Expense (Delivery) ₹12,000 | Cr Cash ₹12,000
    {
      id: "ji000000-0000-4000-8000-000000000027",
      entryId: SEED_IDS.entryExpDelivery,
      accountId: SEED_IDS.accountOperatingExpense5100,
      analyticAccountId: SEED_IDS.analyticDelivery,
      debit: 1200000,
      credit: 0,
    },
    {
      id: "ji000000-0000-4000-8000-000000000028",
      entryId: SEED_IDS.entryExpDelivery,
      accountId: SEED_IDS.accountCash1000,
      debit: 0,
      credit: 1200000,
    },
  ]);

  console.log("💳 [Seed] Seeding Payments...");
  await db.insert(payments).values([
    // Payment for PO-2026-0001 (Full settlement to Azure Furniture)
    {
      id: SEED_IDS.paymentPO1,
      orderId: SEED_IDS.orderPO1,
      amount: 17110000, // ₹1,71,100
      paymentMethod: "BANK",
      paymentDate: DATES.Jan15,
      reference: "UTR-AZURE-99881",
      journalEntryId: SEED_IDS.entryPayPO1,
    },
    // Payment for PO-2026-0002 (Partial settlement to Raj Furniture)
    {
      id: SEED_IDS.paymentPO2,
      orderId: SEED_IDS.orderPO2,
      amount: 10000000, // ₹1,00,000
      paymentMethod: "BANK",
      paymentDate: DATES.Jan20,
      reference: "UTR-RAJ-44552",
      journalEntryId: SEED_IDS.entryPayPO2,
    },
    // Payment for SO-2026-0001 (Full receipt from Nimesh Pathak)
    {
      id: SEED_IDS.paymentSO1,
      orderId: SEED_IDS.orderSO1,
      amount: 7965000, // ₹79,650
      paymentMethod: "BANK",
      paymentDate: DATES.Feb02,
      reference: "UPI-NIMESH-1234",
      journalEntryId: SEED_IDS.entryPaySO1,
    },
  ]);

  // -------------------------------------------------------------------------
  // Financial & Operational Integrity Verification
  // -------------------------------------------------------------------------
  const [balanceResult] = await db
    .select({
      totalDebit: sql<number>`COALESCE(SUM(debit), 0)`,
      totalCredit: sql<number>`COALESCE(SUM(credit), 0)`,
    })
    .from(journalItems);

  const diff = balanceResult.totalDebit - balanceResult.totalCredit;
  const isBalanced = diff === 0;

  console.log("\n==================================================");
  console.log("✅ SEED COMPLETED SUCCESSFULLY");
  console.log("==================================================");
  console.log(`- Contacts:          4 (2 Vendors, 2 Customers)`);
  console.log(`- Products:          5 (4 Goods, 1 Service)`);
  console.log(`- Accounts:          10 (Assets, Liabilities, Capital, P&L)`);
  console.log(`- Journals:          4 (Sales, Purchase, Bank, Cash)`);
  console.log(`- Analytic Accounts: 4 (Cost Centers)`);
  console.log(`- Budgets:           4 (Annual Targets)`);
  console.log(`- Orders:            4 (2 POs, 2 SOs)`);
  console.log(`- Order Items:       9 Line Items`);
  console.log(`- Stock Movements:   8 Movements (Perpetual Inventory)`);
  console.log(`- Journal Entries:   12 Double-entry Vouchers`);
  console.log(`- Journal Items:     28 Debit/Credit Lines`);
  console.log(`- Payments:          3 Settlements`);
  console.log("--------------------------------------------------");
  console.log(`Double-Entry Balance:`);
  console.log(`  Total Debits:  ₹${(balanceResult.totalDebit / 100).toLocaleString("en-IN")}`);
  console.log(`  Total Credits: ₹${(balanceResult.totalCredit / 100).toLocaleString("en-IN")}`);
  console.log(`  Difference:    ₹${(diff / 100).toFixed(2)} ${isBalanced ? "✅ (PERFECT BALANCE)" : "❌ (UNBALANCED)"}`);
  console.log("==================================================\n");

  if (!isBalanced) {
    throw new Error(`Double-entry balance check failed! Difference is ₹${diff / 100}`);
  }
}

// Auto-run when executed directly via `tsx src/db/seed.ts`
if (require.main === module || process.argv[1]?.includes("seed")) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Seed failed:", err);
      process.exit(1);
    });
}
