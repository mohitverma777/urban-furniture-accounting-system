/**
 * src/db/schema/index.ts
 *
 * Single entry point for all Drizzle ORM schema tables and relations.
 *
 * Import order follows the dependency graph (depended-on tables first):
 *   contacts, products
 *   → accounts (journals refs accounts)
 *   → analytics (budgets refs analyticAccounts)
 *   → journal-entries (refs accounts, analytics)
 *   → orders (refs contacts, products)
 *   → payments (refs orders, journal-entries)
 *   → stock (refs products)
 *   → relations (refs all of the above)
 *
 * Used by:
 *   - drizzle.config.ts  (schema discovery for migration generation)
 *   - src/db/index.ts    (passed to drizzle() client constructor)
 */

// Standalone domain tables
export * from "./contacts";
export * from "./products";

// Accounting configuration
export * from "./accounts";

// Analytic / budget
export * from "./analytics";

// Double-entry journal engine
export * from "./journal-entries";

// Transactional documents
export * from "./orders";
export * from "./payments";

// Inventory
export * from "./stock";

// Drizzle relational query definitions (must come last — references all tables)
export * from "./relations";
