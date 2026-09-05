/**
 * src/db/index.ts
 *
 * Environment-aware Drizzle ORM database client.
 *
 * Local development  (DATABASE_PROVIDER=sqlite):
 *   → better-sqlite3 driver, SQLite file at SQLITE_DB_PATH (default: ./local.db)
 *   → WAL mode enabled for better read concurrency
 *   → Singleton pattern prevents multiple connections during Next.js HMR
 *
 * Production (DATABASE_PROVIDER=turso | postgres):
 *   → TODO: implement in a subsequent infrastructure task
 *   → Throws at startup with a clear message if no provider is implemented yet
 *
 * IMPORTANT: This module runs server-side only.
 * Never import it from client components.
 */

import { env, isSqliteDb } from "@/config/env";
import { drizzle as drizzleBetterSqlite } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

// ---------------------------------------------------------------------------
// Type alias for the Drizzle client (used throughout the codebase)
// ---------------------------------------------------------------------------

export type DB = ReturnType<typeof createSqliteDb>;

// ---------------------------------------------------------------------------
// SQLite (local development)
// ---------------------------------------------------------------------------

function createSqliteDb() {
  // Dynamic require keeps better-sqlite3 out of the client bundle.
  // Next.js will tree-shake this for browser builds.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require("better-sqlite3") as typeof import("better-sqlite3");
  const dbPath = env.SQLITE_DB_PATH ?? "./local.db";
  const sqlite = new Database(dbPath);

  // WAL mode: readers don't block writers and vice versa
  sqlite.pragma("journal_mode = WAL");

  // Enforce foreign key constraints (SQLite disables them by default)
  sqlite.pragma("foreign_keys = ON");

  return drizzleBetterSqlite(sqlite, { schema });
}

// ---------------------------------------------------------------------------
// Singleton — prevents multiple connections during Next.js HMR in dev
// ---------------------------------------------------------------------------

type GlobalWithDb = typeof globalThis & { _urbanFurnitureDb?: DB };

function getOrCreateDb(): DB {
  if (isSqliteDb) {
    const g = globalThis as GlobalWithDb;
    if (!g._urbanFurnitureDb) {
      g._urbanFurnitureDb = createSqliteDb();
    }
    return g._urbanFurnitureDb;
  }

  // Future providers: turso, postgres
  throw new Error(
    `Database provider '${env.DATABASE_PROVIDER}' is not yet implemented. ` +
      `Only 'sqlite' is supported in this version.`
  );
}

export const db = getOrCreateDb();

// ---------------------------------------------------------------------------
// Re-export schema for convenience
// ---------------------------------------------------------------------------

export { schema };
