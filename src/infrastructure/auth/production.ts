/**
 * src/infrastructure/auth/production.ts
 *
 * Production auth provider placeholder (NextAuth / Clerk).
 */

import type { AuthProvider, Session } from "./provider";

export class ProductionAuthProvider implements AuthProvider {
  readonly name = "production" as const;

  async getSession(): Promise<Session | null> {
    throw new Error("Production AuthProvider is not yet configured.");
  }

  async createSession(): Promise<Session> {
    throw new Error("Production AuthProvider is not yet configured.");
  }

  async destroySession(): Promise<void> {
    throw new Error("Production AuthProvider is not yet configured.");
  }
}

export const productionAuthProvider = new ProductionAuthProvider();
