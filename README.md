# 🛋️ Urban Furniture Accounting & ERP System

An enterprise-grade, modern Accounting & ERP platform purpose-built for the **Urban Furniture** industry. Engineered with **Next.js 15 App Router**, **TypeScript**, **Drizzle ORM**, and **SQLite**, featuring an **immutable double-entry ledger engine**, **Indian GST statutory compliance**, **predictive AI cash flow forecasting with 95% confidence intervals**, **one-click server-rendered PDF invoicing**, **low stock reorder loops**, **enterprise Excel/CSV master data import**, and **hybrid AI executive intelligence (Gemini 2.5 Flash + Ollama local fallback)**.

> 📖 **Full User Documentation:** See [Complete User Manual (USER_MANUAL.md)](file:///c:/Users/mohit/OneDrive/Documents/odoo_hackathon_final/urban-furniture-accounting/USER_MANUAL.md) for detailed workflows on **WHY**, **WHERE**, and **HOW** to operate every module.

---

## 🎯 Executive Summary & Pitch to Judges

Traditional ERPs are either **too bloated and expensive** (SAP, NetSuite) or **too lightweight to enforce true accounting integrity** (basic CRUD apps masquerading as ERPs). 

**Urban Furniture Accounting & ERP bridges this gap:**
1. **Mathematical Ledger Integrity**: Unlike basic CRUD apps, every sales order, purchase bill, and payment automatically generates dual-entry journal items where **Total Debits strictly equal Total Credits ($\Delta = ₹0.00$)**.
2. **Built for Real-World Indian Furniture SMEs**: Native multi-slab GST (CGST/SGST/IGST), perpetual stock valuation, automated reorder thresholds for bulky goods, and statutory compliance reports.
3. **AI that Explains "Why", Not Just "What"**: Contextual AI answers complex financial questions (*"Why did profit decrease in August?"*, *"Explain this transaction's journal impact"*) grounded directly in live ledger records.
4. **Resilient Hybrid Architecture**: Seamlessly shifts between Google Gemini 2.5 Flash for high-speed cloud intelligence and local Ollama (`gemma3:4b`) for 100% air-gapped/offline resilience.
5. **Zero-Friction Onboarding**: Enterprise-grade Excel/CSV master data import with header normalization, formula sanitization, and dual-layer duplicate prevention.

---

## ⚡ Quick Reference Matrix for Judges

| Feature / Innovation | Route / URL | What to Look For (Proof Points) |
| :--- | :--- | :--- |
| **Double-Entry Parity** | [`/accounting`](http://localhost:3000/accounting) | Real-time general ledger showing $\sum\text{Dr} = \sum\text{Cr}$ with ₹0.00 difference badge. |
| **AI Executive Summary** | [`/`](http://localhost:3000) | Click `✨ Generate Business Summary` for instant CFO-level executive briefing. |
| **Global Spotlight Search** | Anywhere (<kbd>Ctrl+K</kbd>) | Fast search across SOs, POs, contacts, and products; dismiss via outside click or <kbd>Esc</kbd>. |
| **Indian GST Compliance** | [`/reports/gst`](http://localhost:3000/reports/gst) | Outward tax vs Input Tax Credit (ITC) breakdown across 0%, 5%, 12%, 18% slabs. |
| **Server-Rendered PDF** | [`/sales`](http://localhost:3000/sales) | Open `SO-2026-001`, click **Download PDF** for branded invoice rendered via `@react-pdf/renderer`. |
| **Cash Flow Forecasting** | [`/reports/cash-flow`](http://localhost:3000/reports/cash-flow) | Linear regression model ($y = mx + c$) with shaded 95% Student's t confidence bands. |
| **Master Data Import** | [`/import`](http://localhost:3000/import) | Drag & drop CSV/XLSX with sample downloads, live validation preview, and duplicate flags. |
| **Tamper-Evident Audit Trail**| [`/audit`](http://localhost:3000/audit) | Complete chronological audit log with interactive before/after JSON diff modal. |
| **Customer Portal RBAC** | [`/portal`](http://localhost:3000/portal) | Login as `user` (`user123`) to verify zero data leakage of other customers' invoices. |

---

## ✨ Key Features & Highlights

### 📊 Double-Entry Accounting Core
- **General Ledger**: Immutable double-entry journal items with real-time debit/credit equality enforcement.
- **Financial Statements**: Real-time **Profit & Loss (P&L)** statement and **Balance Sheet** derived strictly from ledger transactions.
- **Chart of Accounts**: Standardized account classification across Assets (1000s), Liabilities (2000s), Equity (3000s), Income (4000s), and Expenses (5000s).

### 🔍 Global Search & Command Palette (<kbd>Ctrl+K</kbd>)
- **Universal Spotlight**: Search invoices (`SO-...`), purchase orders (`PO-...`), contacts, furniture items, journals, and navigation links.
- **Keyboard & Click Fluidity**: Full arrow-key navigation (<kbd>↑</kbd>/<kbd>↓</kbd>), <kbd>Enter</kbd> to open, and dismissal via outside click or <kbd>Esc</kbd>.

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

### 📁 Master-Data Excel/CSV Import
- **Customer & Product Upload**: Bulk upload `.xlsx` and `.csv` files for Customer and Product master records.
- **Safety & Validation**: Formula execution stripping, 5MB file-size limits, header auto-normalization, and cell-level schema validation (GSTIN, emails, rates, prices).
- **Dual-Tier Duplicate Prevention**: In-batch duplicate detection plus database collision checks to prevent accidental overwrites.
- **Preview & Confirmation**: Interactive preview grid with error/duplicate pills and explicit user confirmation before committing.
- **Accounting Isolation**: Opening stock creates inventory `ADJUSTMENT` movements with zero unbalanced journal entries.

### 🛡️ Real-Time Audit Trail with Visual Diffs
- **Chronological Change Tracking**: Records all entity mutations across sales, purchases, and journals.
- **Before/After Diff Viewer**: Interactive side-by-side modal displaying exact state diffs for total compliance and forensic transparency.

### 🔐 Role-Based Access Control (RBAC) & Customer Portal
- **Role Hierarchy**:
  - `ADMIN`: Full system control, user management, and settings.
  - `ACCOUNTANT`: Accounting ledger, journal vouchers, reports, master-data import, and payments.
  - `USER`: Dedicated Customer Portal strictly isolated to customer's own invoices and receipts.
- **Cross-Tenant Isolation**: Verified customer isolation blocking cross-customer data leakage on portal API routes and PDF invoice downloads.

---

## 🎬 5–7 Minute Winning Demo Script for Judges

When presenting to judges, follow this choreographed flow to hit every evaluation criterion:

### Step 1: Executive Dashboard & AI Briefing (1 min)
* **Navigate to**: [`/`](http://localhost:3000)
* **What to Show**: Active revenue, expense widgets, and the `✨ Generate Business Summary` button.
* **Pitch Point to Say**:
  > *"We didn't just build another CRUD dashboard. With one click, our AI acts as a virtual CFO, synthesizing our live general ledger into an executive briefing with revenue trends, expense ratios, and immediate cash warnings."*

### Step 2: Global Spotlight Search (<kbd>Ctrl+K</kbd>) (30 sec)
* **Trigger**: Press <kbd>Ctrl+K</kbd> anywhere in the application.
* **What to Show**: Type `"wood"` or `"Acme"`. Show instant multi-entity category results (Invoices, Purchases, Contacts, Products). Navigate with arrow keys, and click outside the box or press <kbd>Esc</kbd> to dismiss.
* **Pitch Point to Say**:
  > *"Users don't need to hunt through menus. Spotlight search allows an accountant to jump across transactions, customers, and inventory items with zero friction."*

### Step 3: Commercial Sales, GST Breakdown & PDF Invoicing (1.5 min)
* **Navigate to**: [`/sales`](http://localhost:3000/sales) $\to$ Select `SO-2026-001`
* **What to Show**: Multi-slab Indian GST breakdown (CGST, SGST, IGST), the **Download PDF** button, and the **Explain This Transaction** AI button.
* **Pitch Point to Say**:
  > *"Furniture orders have complex tax rates. Notice how line items dynamically apply 12% or 18% GST. When we click 'Download PDF', a production-grade tax invoice is rendered server-side via React-PDF with our company GSTIN, bank details, and QR verification."*

### Step 4: Double-Entry Mathematical Parity (1 min)
* **Navigate to**: [`/accounting`](http://localhost:3000/accounting)
* **What to Show**: Journal Entries and General Ledger view. Point to the **Total Debits = Total Credits** balance badge showing ₹0.00 variance.
* **Pitch Point to Say**:
  > *"This is where most hackathon ERPs fall short. Every commercial action—sales, vendor bills, and bank settlements—automatically creates balanced double-entry vouchers. At all times, Debits strictly equal Credits."*

### Step 5: Master Data Onboarding via Excel/CSV (1 min)
* **Navigate to**: [`/import`](http://localhost:3000/import)
* **What to Show**: Upload customer or product master data. Point out automatic header normalization, cell-level validation, and in-batch/database duplicate detection before committing.
* **Pitch Point to Say**:
  > *"Migrating to our ERP takes 30 seconds. We built an enterprise spreadsheet engine that sanitizes formulas, validates GSTINs and emails, flags duplicates, and isolates opening stock into non-disruptive inventory adjustments."*

### Step 6: Predictive Cash Flow & Low-Stock Loop (1 min)
* **Navigate to**: [`/reports/cash-flow`](http://localhost:3000/reports/cash-flow) and [`/stock`](http://localhost:3000/stock)
* **What to Show**: The linear regression projection with shaded 95% confidence bands; then show the low-stock alert widget with 1-click PO generation.
* **Pitch Point to Say**:
  > *"Instead of simple historical charts, our cash flow module runs a linear regression over actual ledger cash postings with a 95% confidence interval, letting business owners forecast cash runway before stockouts occur."*

### Step 7: Zero-Downtime Hybrid AI Assistant (1 min)
* **Navigate to**: [`/ai`](http://localhost:3000/ai)
* **What to Show**: Ask FinBot: *"Why did profit decrease in August?"* or *"What is our net GST liability?"*
* **Pitch Point to Say**:
  > *"FinBot uses function calling grounded in our live database. If cloud connectivity is lost, it automatically fails over to local Ollama running Gemma 3, ensuring accounting operations never halt."*

---

## 🛠️ Technology Stack

- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Database**: SQLite with Drizzle ORM
- **Spreadsheet Processing**: `xlsx` (SheetJS)
- **PDF Generation**: `@react-pdf/renderer`
- **Data Visualization**: Recharts
- **Styling**: Vanilla Tailwind CSS (Dark Slate theme)
- **Icons**: Lucide React
- **Testing**: Vitest (217 unit & integration tests, 100% passing)


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

### 3. Environment & AI Engine Setup
Copy the example environment configuration:
```bash
cp .env.example .env
```

The system features a **hybrid AI architecture** supporting two modes:

#### Option A: Local Ollama (Recommended for 100% Offline / Free / Air-Gapped)
No API keys or cloud dependencies needed!
1. Install Ollama from **[ollama.com](https://ollama.com)**.
2. Pull and start the recommended model:
   ```bash
   ollama run gemma3:4b
   # or alternately: ollama run qwen2.5:7b
   ```
3. Set in your `.env`:
   ```env
   AI_PROVIDER=ollama
   OLLAMA_BASE_URL=http://localhost:11434/v1
   OLLAMA_MODEL=gemma3:4b
   ```
   *(Defaults to `http://localhost:11434/v1` and `gemma3:4b` automatically).*

#### Option B: Google Gemini Cloud (High-Speed Inference)
1. Obtain a free API key from **[Google AI Studio](https://aistudio.google.com)**.
2. Set in your `.env`:
   ```env
   AI_PROVIDER=google
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

---

### 4. Initialize & Seed Database
The project utilizes SQLite with Drizzle ORM. Run the automated seed script to populate isolated test data, contacts, products, chart of accounts, double-entry vouchers, and budgets:

```bash
npm run db:push
# or run seed scripts directly:
npx tsx src/db/seed.ts
```

### 5. Run Development Server
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
