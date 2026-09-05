/**
 * src/infrastructure/auth/provider.ts
 *
 * Abstract authentication / session provider interface.
 *
 * In development / hackathon demo: AUTH_PROVIDER=demo
 *   → Returns a hard-coded demo user based on a session cookie value.
 *   → Role can be switched in the UI without any real login flow.
 *
 * In production: AUTH_PROVIDER=production
 *   → Delegates to a real auth system (NextAuth.js, Clerk, etc.)
 *
 * Business services must NEVER call concrete auth implementations directly.
 * They receive a resolved `DemoUser` (or equivalent) through Server Actions.
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
  /**
   * Provider identifier.
   */
  readonly name: "demo" | "production";

  /**
   * Resolve the current session from the incoming request context.
   * Returns null if there is no valid session.
   */
  getSession(): Promise<Session | null>;

  /**
   * Create or refresh a session for the given user.
   * In demo mode, this simply stores the role in a cookie.
   */
  createSession(user: DemoUser): Promise<Session>;

  /**
   * Destroy the current session (logout).
   */
  destroySession(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Demo users — fixed personas for the hackathon demo experience
// ---------------------------------------------------------------------------

export const DEMO_USERS: Record<UserRole, DemoUser> = {
  admin: {
    id: "demo-admin",
    name: "Admin User",
    role: "admin",
    email: "admin@urbanfurniture.demo",
  },
  accountant: {
    id: "demo-accountant",
    name: "Priya Sharma",
    role: "accountant",
    email: "priya@urbanfurniture.demo",
  },
  sales_manager: {
    id: "demo-sales",
    name: "Rahul Mehta",
    role: "sales_manager",
    email: "rahul@urbanfurniture.demo",
  },
  purchase_manager: {
    id: "demo-purchase",
    name: "Anita Desai",
    role: "purchase_manager",
    email: "anita@urbanfurniture.demo",
  },
  viewer: {
    id: "demo-viewer",
    name: "Read Only",
    role: "viewer",
    email: "viewer@urbanfurniture.demo",
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
  admin: [
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
  accountant: [
    "accounting:read",
    "accounting:write",
    "accounting:post",
    "payments:read",
    "payments:write",
    "reports:read",
    "inventory:read",
  ],
  sales_manager: [
    "sales:read",
    "sales:write",
    "accounting:read",
    "reports:read",
    "inventory:read",
  ],
  purchase_manager: [
    "purchases:read",
    "purchases:write",
    "accounting:read",
    "reports:read",
    "inventory:read",
    "inventory:write",
  ],
  viewer: [
    "accounting:read",
    "sales:read",
    "purchases:read",
    "reports:read",
    "inventory:read",
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

// ---------------------------------------------------------------------------
// Factory signature
// ---------------------------------------------------------------------------

export type AuthProviderFactory = () => AuthProvider;
