# 🛋️ Urban Furniture Accounting & ERP System

An enterprise-grade, modern Accounting & ERP web application engineered for the **Urban Furniture** use-case. Built with **Next.js 15 App Router**, **TypeScript**, **Drizzle ORM**, and **SQLite**, featuring a **double-entry ledger engine**, **Indian GST compliance reports**, **predictive AI cash flow forecasting**, **one-click PDF invoice generation**, **low stock reorder alerts**, **AI executive business briefings**, and **role-based access control**.

> 📖 **Looking for full documentation?** Check out the [Complete User Manual (USER_MANUAL.md)](file:///c:/Users/mohit/OneDrive/Documents/odoo_hackathon_final/urban-furniture-accounting/USER_MANUAL.md) for step-by-step guides on **WHY**, **WHERE**, and **HOW** to use every feature.

---

## ✨ Key Features & Highlights

### 📊 Double-Entry Accounting Core
- **General Ledger**: Immutable double-entry journal items with debit/credit balance enforcement.
- **Financial Statements**: Real-time **Profit & Loss (P&L)** statement and **Balance Sheet** derived strictly from ledger transactions.
- **Chart of Accounts**: Standardized account classification across Assets (1000s), Liabilities (2000s), Equity (3000s), Income (4000s), and Expenses (5000s).

### 🇮🇳 Indian GST Compliance Report
- **Dedicated GST Summary Report**: Monthly IGST, CGST, and SGST breakdowns per tax rate slab (0%, 5%, 12%, 18%).
- **Tax Position Breakdown**: Compares Output Tax (Sales) vs Input Tax Credit (Purchases) with net tax liability calculation.

### 📄 One-Click PDF Invoice Export
- **Server-Side Rendering**: Generates high-resolution corporate PDF invoices instantly via `@react-pdf/renderer` without external third-party services.
- **Professional Formatting**: Includes Urban Furniture logo/branding, GSTIN (`27AAPCU0123M1ZV`), line items breakdown, GST split, bank transfer details, and payment status badges.

### 🤖 AI-Powered Cash Flow Forecasting
- **Linear Regression Engine**: Fits simple linear regression ($y = mx + c$) on General Ledger cash postings over historical months.
- **95% Confidence Band**: Computes upper and lower 95% Student's t confidence bounds for 3-month future cash position predictions.
- **Predictive AI Insights**: Analyzes burn rate, runway, and projected quarter-end cash reserves.

### 📦 Low Stock & Reorder Alerts
- **Perpetual Inventory Tracking**: Tracks stock-on-hand ($\text{Opening} + \text{Purchases} - \text{Sales} \pm \text{Adjustments}$).
- **Automated Reorder Thresholds**: Detects items with stock $\le 5$ units or out-of-stock status.
- **Procurement Loop**: Closed-loop workflow (SO $\to$ Stock Depletion $\to$ PO Suggestion) with one-click Purchase Order generation.

### 📊 Analytic Accounts & Budget Variance
- **Cost Center Management**: Categorize income and expenses by cost center or department.
- **Budget vs Actual Variance**: Monitors planned vs actual spend with color-coded progress indicators (`On Track`, `Near Limit`, `Over Budget`).

### 🔐 Role-Based Access Control (RBAC) & Customer Portal
- **Role Hierarchy**:
  - `ADMIN`: Full system control & settings.
  - `ACCOUNTANT`: Accounting ledger, journal vouchers, reports, and payments.
  - `USER`: Dedicated Customer Portal for viewing orders, downloading invoices, and registering payments.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Database**: SQLite with Drizzle ORM
- **PDF Generation**: `@react-pdf/renderer`
- **Data Visualization**: Recharts
- **Styling**: Vanilla Tailwind CSS (Dark Slate theme)
- **Icons**: Lucide React
- **Testing**: Vitest (195+ unit & integration tests)

---

## 🚀 Getting Started & Setup Instructions

### Prerequisites
- **Node.js**: v18.x or higher
- **npm**: v9.x or higher

### 1. Clone the Repository
```bash
git clone https://github.com/mohitverma777/urban-furniture-accounting-system.git
cd urban-furniture-accounting-system
```

### 2. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 3. Initialize & Seed Database
The project utilizes SQLite with Drizzle ORM. Run the automated seed script to populate isolated test data, contacts, products, chart of accounts, double-entry vouchers, and budgets:

```bash
npm run db:push
# or run seed scripts directly:
npx tsx src/db/seed.ts
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Seeded Test Login Credentials

| Role | Username / Email | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Full ERP, Ledger, Users & Settings |
| **Accountant** | `accountant` | `accountant123` | Accounting, Reports, Sales, Purchases, Budgets |
| **Customer** | `user` | `user123` | Customer Portal (Invoices, Receipts, Statements) |

---

## 🧪 Running Automated Tests

The application includes a comprehensive Vitest test suite covering double-entry accounting math, GST calculations, budget variances, linear regression forecasting, and stock movements.

```bash
# Run all unit and integration tests
npx vitest run

# Run TypeScript type safety verification
npx tsc --noEmit
```

---

## 📁 Project Directory Structure

```
src/
├── actions/             # Next.js Server Actions (Sales, Purchases, Payments, Budgets)
├── ai/                  # AI LLM Tools, FinBot System Prompts & Audit Detectors
├── app/                 # Next.js App Router (Pages, Customer Portal, API Routes)
│   ├── api/             # PDF Export (/api/sales/[id]/invoice-pdf), Portal APIs
│   ├── reports/         # P&L, Balance Sheet, GST Report, Cash Flow Forecast
│   ├── sales/           # Sales Orders & Customer Invoice Detail Pages
│   ├── purchases/       # Purchase Orders & Vendor Bills
│   ├── budgets/         # Analytic Cost Centers & Budget Variance Reports
│   └── portal/          # Customer Portal Views
├── components/          # React UI Components (Dashboard, Reports, Sales, PDF)
├── db/                  # Drizzle ORM Schemas, Migrations & Seeder Scripts
├── infrastructure/      # System Diagnostics & Health Checkers
└── services/            # Core Business Services (Accounting, Stock, Reports)
```

---

## 📝 License

Developed for the Odoo Hackathon — Urban Furniture Real-World Accounting & ERP Use Case.
