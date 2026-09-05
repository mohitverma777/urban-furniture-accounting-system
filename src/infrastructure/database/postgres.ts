/**
 * src/infrastructure/database/postgres.ts
 *
 * PostgreSQL DatabaseProvider placeholder.
 */

import { env } from "@/config/env";
import type { DatabaseProvider } from "./provider";

export class PostgresDatabaseProvider implements DatabaseProvider {
  readonly name = "postgres" as const;

  async healthCheck(): Promise<void> {
    if (!env.DATABASE_URL) {
      throw new Error(
        "PostgreSQL provider requires DATABASE_URL environment variable."
      );
    }
    // Stubbed check for hackathon infrastructure layer
  }

  async transaction<T>(): Promise<T> {
    throw new Error("PostgreSQL database driver is not configured for runtime execution.");
  }
}

export const postgresProvider = new PostgresDatabaseProvider();
