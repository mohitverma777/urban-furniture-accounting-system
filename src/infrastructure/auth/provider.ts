/**
 * src/infrastructure/auth/provider.ts
 *
 * Abstract authentication / session provider interface.
 */

import type { DemoUser, UserRole } from "@/lib/types";

// ---------------------------------------------------------------------------
// Session types
// ---------------------------------------------------------------------------

export interface Session {
  readonly user: DemoUser;
  /** ISO-8601 expiry timestamp */
  readonly expiresAt: string;
}

// ---------------------------------------------------------------------------
// Auth provider interface
// ---------------------------------------------------------------------------

export interface AuthProvider {
  readonly name: "demo" | "production";
  getSession(): Promise<Session | null>;
  createSession(user: DemoUser): Promise<Session>;
  destroySession(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Demo users — personas for testing
// ---------------------------------------------------------------------------

export const DEMO_USERS: Record<UserRole, DemoUser> = {
  ADMIN: {
    id: "demo-admin",
    loginId: "admin",
    name: "Admin User",
    role: "ADMIN",
    email: "admin@urbanfurniture.com",
  },
  ACCOUNTANT: {
    id: "demo-accountant",
    loginId: "accountant",
    name: "Priya Sharma",
    role: "ACCOUNTANT",
    email: "accountant@urbanfurniture.com",
  },
  USER: {
    id: "demo-user",
    loginId: "user",
    name: "Nimesh Pathak",
    role: "USER",
    email: "user@urbanfurniture.com",
  },
};

// ---------------------------------------------------------------------------
// Role permission helpers
// ---------------------------------------------------------------------------

export type Permission =
  | "accounting:read"
  | "accounting:write"
  | "accounting:post"
  | "sales:read"
  | "sales:write"
  | "purchases:read"
  | "purchases:write"
  | "payments:read"
  | "payments:write"
  | "reports:read"
  | "inventory:read"
  | "inventory:write"
  | "admin:all";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    "accounting:read",
    "accounting:write",
    "accounting:post",
    "sales:read",
    "sales:write",
    "purchases:read",
    "purchases:write",
    "payments:read",
    "payments:write",
    "reports:read",
    "inventory:read",
    "inventory:write",
    "admin:all",
  ],
  ACCOUNTANT: [
    "accounting:read",
    "accounting:write",
    "accounting:post",
    "sales:read",
    "sales:write",
    "purchases:read",
    "purchases:write",
    "payments:read",
    "payments:write",
    "reports:read",
    "inventory:read",
    "inventory:write",
  ],
  USER: [
    "accounting:read",
    "payments:read",
  ],
};

export function hasPermission(user: DemoUser, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[user.role] ?? [];
  return perms.includes(permission) || perms.includes("admin:all");
}

export function requirePermission(
  user: DemoUser,
  permission: Permission
): void {
  if (!hasPermission(user, permission)) {
    throw new Error(
      `Permission denied: user '${user.email}' (role: ${user.role}) ` +
        `does not have '${permission}'.`
    );
  }
}

export type AuthProviderFactory = () => AuthProvider;
