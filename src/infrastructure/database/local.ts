/**
 * src/infrastructure/database/local.ts
 *
 * Local SQLite implementation of DatabaseProvider using better-sqlite3 and Drizzle ORM.
 */

import { db } from "@/db";
import { sql } from "drizzle-orm";
import type { DatabaseProvider, TransactionContext } from "./provider";

export class SqliteDatabaseProvider implements DatabaseProvider {
  readonly name = "sqlite" as const;

  /**
   * Health check runs a simple query against SQLite.
   */
  async healthCheck(): Promise<void> {
    try {
      await db.run(sql`SELECT 1`);
    } catch (err) {
      throw new Error(`SQLite database health check failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Transaction wrapper utilizing Drizzle ORM's transaction support.
   */
  async transaction<T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T> {
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    // We execute the callback within Drizzle's transaction context
    return await db.transaction(async () => {
      return await fn({ id: txId });
    });
  }
}

export const sqliteProvider = new SqliteDatabaseProvider();
