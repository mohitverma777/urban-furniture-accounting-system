/**
 * src/infrastructure/database/provider.ts
 *
 * Abstract database provider interface.
 *
 * Business services depend ONLY on this interface, never on a concrete
 * driver (better-sqlite3, @libsql/client, pg, etc.).
 *
 * Concrete implementations are created by the provider factory and
 * injected at the infrastructure boundary.
 *
 * NOTE: The actual Drizzle ORM client type will be added here once
 * Drizzle ORM is installed in a subsequent task.
 */

// ---------------------------------------------------------------------------
// Query result types (driver-agnostic shapes)
// ---------------------------------------------------------------------------

/** A single row returned from a query (column name → value). */
export type QueryRow = Record<string, unknown>;

/** Raw query result returned by the underlying driver. */
export interface RawQueryResult {
  rows: QueryRow[];
  rowsAffected: number;
}

// ---------------------------------------------------------------------------
// Transaction context
// ---------------------------------------------------------------------------

/**
 * Represents an active database transaction context.
 * Services receive this during transactional operations.
 */
export interface TransactionContext {
  readonly id: string; // Debug identifier
}

// ---------------------------------------------------------------------------
// Database provider interface
// ---------------------------------------------------------------------------

/**
 * All database interactions in services must go through a DatabaseProvider.
 * The concrete implementation wraps either SQLite (local) or
 * Turso/LibSQL or PostgreSQL (production).
 */
export interface DatabaseProvider {
  /**
   * Provider identifier — useful for logging and diagnostics.
   */
  readonly name: "sqlite" | "turso" | "postgres";

  /**
   * Verify the connection is healthy.
   * Throws if the database is unreachable.
   */
  healthCheck(): Promise<void>;

  /**
   * Execute work inside an atomic transaction.
   * If `fn` throws, the transaction is automatically rolled back.
   */
  transaction<T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T>;
}

// ---------------------------------------------------------------------------
// Provider factory signature (concrete factories live in src/config/)
// ---------------------------------------------------------------------------

export type DatabaseProviderFactory = () => DatabaseProvider;
