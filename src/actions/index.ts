/**
 * src/actions/index.ts
 *
 * Server Actions barrel placeholder.
 *
 * Individual action modules will be added per domain:
 *  - accounting.ts   (CoA, Journal Entries, posting)
 *  - sales.ts        (Sales Orders, Invoices)
 *  - purchases.ts    (Purchase Orders, Vendor Bills)
 *  - payments.ts     (Customer & Vendor payments)
 *  - inventory.ts    (Products, Stock adjustments)
 *  - contacts.ts     (Customers & Vendors)
 *  - reports.ts      (Report data fetching)
 *
 * All actions:
 *  1. Validate input with Zod
 *  2. Resolve the current session / user
 *  3. Check permissions via requirePermission()
 *  4. Delegate to the appropriate business service
 *  5. Never contain business logic themselves
 */

// No implementation yet — added alongside each domain feature.
export {};
