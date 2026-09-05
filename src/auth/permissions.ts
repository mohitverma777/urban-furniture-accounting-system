/**
 * src/auth/permissions.ts
 *
 * Server-side authorization helpers.
 *
 * Every protected server action / API route must call these checks.
 * Hiding UI buttons is a UX convenience — actual authorization lives here.
 */

import { getCurrentUser, type SessionData } from "./session";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class AuthenticationError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor(message = "You do not have permission to perform this action") {
    super(message);
    this.name = "AuthorizationError";
  }
}

// ---------------------------------------------------------------------------
// Role type
// ---------------------------------------------------------------------------

export type AppRole = "ADMIN" | "ACCOUNTANT" | "USER";

// ---------------------------------------------------------------------------
// Route / feature permission map
// ---------------------------------------------------------------------------

/**
 * Which roles are allowed to access each feature area.
 * Used by middleware and server actions.
 */
export const ROLE_PERMISSIONS: Record<string, AppRole[]> = {
  // Admin-only
  "/admin": ["ADMIN"],
  "/admin/users": ["ADMIN"],
  "/diagnostics": ["ADMIN"],

  // Accounting features — ADMIN + ACCOUNTANT
  "/": ["ADMIN", "ACCOUNTANT"],
  "/contacts": ["ADMIN", "ACCOUNTANT"],
  "/products": ["ADMIN", "ACCOUNTANT"],
  "/stock": ["ADMIN", "ACCOUNTANT"],
  "/sales": ["ADMIN", "ACCOUNTANT"],
  "/purchases": ["ADMIN", "ACCOUNTANT"],
  "/payments": ["ADMIN", "ACCOUNTANT"],
  "/accounting": ["ADMIN", "ACCOUNTANT"],
  "/budgets": ["ADMIN", "ACCOUNTANT"],
  "/reports": ["ADMIN", "ACCOUNTANT"],
  "/ai": ["ADMIN", "ACCOUNTANT"],

  // Portal — USER only (also accessible by ADMIN/ACCOUNTANT for testing)
  "/portal": ["ADMIN", "ACCOUNTANT", "USER"],
};

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

/**
 * Require that a user is authenticated.
 * Throws AuthenticationError if not.
 * Returns the session data.
 */
export async function requireAuth(): Promise<SessionData> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthenticationError();
  }
  return user;
}

/**
 * Require that the authenticated user has one of the specified roles.
 * Throws AuthorizationError if role does not match.
 */
export async function requireRole(...roles: AppRole[]): Promise<SessionData> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    throw new AuthorizationError(
      `This action requires one of the following roles: ${roles.join(", ")}`
    );
  }
  return user;
}

/**
 * Assert that a resource belongs to the authenticated user.
 * Used for USER role to enforce ownership checks.
 *
 * @param user      - Current session user
 * @param ownerId   - The contactId / userId that owns the resource
 * @param resource  - Human-readable resource name for error messages
 */
export function assertOwnership(
  user: SessionData,
  ownerId: string | null | undefined,
  resource = "resource"
) {
  // ADMIN and ACCOUNTANT can access any resource
  if (user.role === "ADMIN" || user.role === "ACCOUNTANT") return;

  // USER must own the resource via their contactId
  if (!user.contactId || user.contactId !== ownerId) {
    throw new AuthorizationError(
      `You do not have permission to access this ${resource}`
    );
  }
}

/**
 * Helper to get explicit boolean capabilities per role.
 */
export function getRolePermissions(role: AppRole) {
  return {
    manageUsers: role === "ADMIN",
    manageAccounting: role === "ADMIN" || role === "ACCOUNTANT",
    viewPortal: true,
  };
}

/**
 * Check if a pathname is allowed for the given role.
 * Returns true if access is permitted.
 */
export function isPathAllowedForRole(pathname: string, role: AppRole): boolean {
  // Auth pages are always accessible
  if (pathname.startsWith("/auth")) return true;

  // API routes for auth are always accessible
  if (pathname.startsWith("/api/auth")) return true;

  // Portal is accessible to all authenticated users
  if (pathname.startsWith("/portal")) return true;

  // Check exact match first, then prefix match
  for (const [path, allowedRoles] of Object.entries(ROLE_PERMISSIONS)) {
    if (pathname === path || (path !== "/" && pathname.startsWith(path))) {
      return allowedRoles.includes(role);
    }
  }

  // For the root path, check specifically
  if (pathname === "/") {
    return ROLE_PERMISSIONS["/"]?.includes(role) ?? false;
  }

  // API routes for data — ADMIN + ACCOUNTANT only
  if (pathname.startsWith("/api/")) {
    return role === "ADMIN" || role === "ACCOUNTANT";
  }

  // Default: deny for USER, allow for ADMIN/ACCOUNTANT
  return role === "ADMIN" || role === "ACCOUNTANT";
}

/**
 * Alias for isPathAllowedForRole.
 */
export const hasPermission = isPathAllowedForRole;

