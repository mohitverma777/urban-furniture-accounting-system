/**
 * src/lib/types.ts
 *
 * Shared primitive domain types used across services, actions, and
 * infrastructure.  No business logic lives here — only type contracts.
 */

// ---------------------------------------------------------------------------
// Branded IDs
// ---------------------------------------------------------------------------

/** Opaque string ID (UUID v4). Use specific branded types per entity. */
export type ID = string;

export type ContactId = string & { readonly __brand: "ContactId" };
export type ProductId = string & { readonly __brand: "ProductId" };
export type AccountId = string & { readonly __brand: "AccountId" };
export type JournalId = string & { readonly __brand: "JournalId" };
export type JournalEntryId = string & { readonly __brand: "JournalEntryId" };
export type SalesOrderId = string & { readonly __brand: "SalesOrderId" };
export type PurchaseOrderId = string & { readonly __brand: "PurchaseOrderId" };
export type InvoiceId = string & { readonly __brand: "InvoiceId" };
export type BillId = string & { readonly __brand: "BillId" };
export type PaymentId = string & { readonly __brand: "PaymentId" };
export type StockMoveId = string & { readonly __brand: "StockMoveId" };
export type BudgetId = string & { readonly __brand: "BudgetId" };

// ---------------------------------------------------------------------------
// Money — Integer minor units (paise)
// ---------------------------------------------------------------------------

/**
 * Monetary value stored as an integer in the smallest currency unit (paise).
 * 1 INR = 100 paise.  Always use `Money` for financial fields.
 * Never use `number` directly for currency amounts.
 */
export type Money = number & { readonly __brand: "Money" };

/** Create a Money value from an integer paise amount. */
export function money(paise: number): Money {
  if (!Number.isInteger(paise)) {
    throw new Error(`Money values must be integers (paise). Received: ${paise}`);
  }
  return paise as Money;
}

/** Zero money constant. */
export const ZERO_MONEY: Money = 0 as Money;

// ---------------------------------------------------------------------------
// Common record timestamps
// ---------------------------------------------------------------------------

export interface Timestamps {
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Result type — explicit error handling without exceptions in services
// ---------------------------------------------------------------------------

export type Ok<T> = { success: true; data: T };
export type Err<E = string> = { success: false; error: E };
export type Result<T, E = string> = Ok<T> | Err<E>;

export function ok<T>(data: T): Ok<T> {
  return { success: true, data };
}

export function err<E = string>(error: E): Err<E> {
  return { success: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.success === true;
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result.success === false;
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Document states
// ---------------------------------------------------------------------------

/** States for transactional documents (Orders, Invoices, Bills). */
export type DocumentState = "draft" | "confirmed" | "posted" | "cancelled";

/** States for payments. */
export type PaymentState = "draft" | "posted" | "reconciled" | "cancelled";

/** States for stock moves. */
export type StockMoveState = "draft" | "confirmed" | "done" | "cancelled";

// ---------------------------------------------------------------------------
// Contact / Partner types
// ---------------------------------------------------------------------------

export type ContactType = "customer" | "vendor" | "both";

// ---------------------------------------------------------------------------
// Account types (Chart of Accounts)
// ---------------------------------------------------------------------------

export type AccountType =
  | "asset_current"
  | "asset_non_current"
  | "asset_cash"
  | "asset_receivable"
  | "liability_current"
  | "liability_payable"
  | "liability_non_current"
  | "equity"
  | "income"
  | "cogs"
  | "expense";

export type AccountNormalBalance = "debit" | "credit";

// ---------------------------------------------------------------------------
// Journal types
// ---------------------------------------------------------------------------

export type JournalType =
  | "sale"        // Customer invoices & credit notes
  | "purchase"    // Vendor bills & refunds
  | "cash"        // Cash receipts & disbursements
  | "bank"        // Bank transactions
  | "general";    // Miscellaneous journal entries

// ---------------------------------------------------------------------------
// Tax
// ---------------------------------------------------------------------------

export type TaxType = "percentage" | "fixed";

// ---------------------------------------------------------------------------
// User role (demo auth)
// ---------------------------------------------------------------------------

export type UserRole =
  | "admin"
  | "accountant"
  | "sales_manager"
  | "purchase_manager"
  | "viewer";

export interface DemoUser {
  readonly id: string;
  readonly name: string;
  readonly role: UserRole;
  readonly email: string;
}
