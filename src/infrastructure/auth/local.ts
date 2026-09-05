/**
 * src/infrastructure/auth/local.ts
 *
 * Demo/local implementation of AuthProvider using cookie-based session switching.
 */

import type { DemoUser, UserRole } from "@/lib/types";
import { DEMO_USERS, type AuthProvider, type Session } from "./provider";

export class LocalAuthProvider implements AuthProvider {
  readonly name = "demo" as const;
  private currentRole: UserRole = "admin";

  async getSession(): Promise<Session | null> {
    const user = DEMO_USERS[this.currentRole] ?? DEMO_USERS.admin;
    return {
      user,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  async createSession(user: DemoUser): Promise<Session> {
    this.currentRole = user.role;
    return {
      user,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  async destroySession(): Promise<void> {
    this.currentRole = "viewer";
  }
}

export const localAuthProvider = new LocalAuthProvider();
