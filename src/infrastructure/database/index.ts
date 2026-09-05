/**
 * src/infrastructure/database/index.ts
 *
 * Database provider factory & exports.
 */

import { env } from "@/config/env";
import type { DatabaseProvider } from "./provider";
import { sqliteProvider } from "./local";
import { tursoProvider } from "./turso";
import { postgresProvider } from "./postgres";

export * from "./provider";
export { SqliteDatabaseProvider } from "./local";
export { TursoDatabaseProvider } from "./turso";
export { PostgresDatabaseProvider } from "./postgres";

export function getDatabaseProvider(): DatabaseProvider {
  switch (env.DATABASE_PROVIDER) {
    case "sqlite":
      return sqliteProvider;
    case "turso":
      return tursoProvider;
    case "postgres":
      return postgresProvider;
    default:
      throw new Error(`Unsupported database provider: ${env.DATABASE_PROVIDER}`);
  }
}

export const databaseProvider = getDatabaseProvider();
