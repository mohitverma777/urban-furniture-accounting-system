/**
 * drizzle.config.ts
 *
 * Drizzle Kit configuration for schema introspection, migration generation,
 * and Drizzle Studio.
 *
 * Run:
 *   npm run db:generate   — generate SQL migration from schema diff
 *   npm run db:migrate    — apply pending migrations to the local DB
 *   npm run db:push       — push schema directly (dev shortcut, no migration file)
 *   npm run db:studio     — open Drizzle Studio browser UI
 *
 * NOTE: This config reads process.env directly (not via src/config/env.ts)
 * because drizzle-kit runs as a separate CLI process and the env validation
 * in env.ts is designed for the Next.js runtime context.
 */

import { defineConfig } from "drizzle-kit";

const dbPath = process.env.SQLITE_DB_PATH ?? "./local.db";

export default defineConfig({
  // Path to the schema barrel — drizzle-kit discovers all tables from here
  schema: "./src/db/schema/index.ts",

  // Directory where generated SQL migration files will be stored
  out: "./src/db/migrations",

  // SQLite dialect for local development
  dialect: "sqlite",

  dbCredentials: {
    url: dbPath,
  },

  // Print detailed output during generation
  verbose: true,

  // Fail if schema and database are out of sync (useful in CI)
  strict: true,
});
