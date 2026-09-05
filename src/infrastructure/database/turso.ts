/**
 * src/infrastructure/database/turso.ts
 *
 * Turso / LibSQL DatabaseProvider placeholder.
 */

import { env } from "@/config/env";
import type { DatabaseProvider } from "./provider";

export class TursoDatabaseProvider implements DatabaseProvider {
  readonly name = "turso" as const;

  async healthCheck(): Promise<void> {
    if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) {
      throw new Error(
        "Turso provider requires TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables."
      );
    }
    // Stubbed check for hackathon infrastructure layer
  }

  async transaction<T>(): Promise<T> {
    throw new Error("Turso database driver is not configured for runtime execution.");
  }
}

export const tursoProvider = new TursoDatabaseProvider();
