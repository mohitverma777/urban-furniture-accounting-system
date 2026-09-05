/**
 * src/auth/service.ts
 *
 * Authentication business logic.
 *
 * Handles:
 *  - User signup (with validation, uniqueness checks, password hashing)
 *  - User login (credential verification, session creation)
 *  - User logout (session destruction)
 *  - Forgot password (with login ID + email verification)
 *  - Admin user creation (allows ADMIN/ACCOUNTANT roles)
 *  - User listing (for admin panel)
 */

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema/users";
import { hashPassword, verifyPassword } from "./password";
import { setUserSession, destroySession } from "./session";
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  adminCreateUserSchema,
  type SignupInput,
  type LoginInput,
  type ForgotPasswordInput,
  type AdminCreateUserInput,
} from "./validation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuthResult =
  | { success: true; user: Omit<User, "passwordHash"> }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

// ---------------------------------------------------------------------------
// Sign Up (Public — always creates USER role)
// ---------------------------------------------------------------------------

export async function signup(input: SignupInput): Promise<AuthResult> {
  // 1. Validate
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "_";
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return { success: false, error: "Validation failed", fieldErrors };
  }

  const data = parsed.data;

  // 2. Force USER role for public signup
  data.role = "USER";

  // 3. Check loginId uniqueness
  const existingLogin = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.loginId, data.loginId))
    .get();
  if (existingLogin) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: { loginId: ["This Login ID is already taken"] },
    };
  }

  // 4. Check email uniqueness
  const existingEmail = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, data.email))
    .get();
  if (existingEmail) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: { email: ["This email is already registered"] },
    };
  }

  // 5. Hash password
  const passwordHash = await hashPassword(data.password);

  // 6. Insert user
  const now = new Date();
  const newUser = db
    .insert(users)
    .values({
      name: data.name,
      loginId: data.loginId,
      email: data.email,
      passwordHash,
      role: "USER",
      active: true,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();

  // 7. Set session
  await setUserSession({
    userId: newUser.id,
    loginId: newUser.loginId,
    name: newUser.name,
    role: newUser.role as "ADMIN" | "ACCOUNTANT" | "USER",
    contactId: newUser.contactId,
  });

  // 8. Return user without password hash
  const { passwordHash: _, ...safeUser } = newUser;
  return { success: true, user: safeUser };
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export async function login(input: LoginInput): Promise<AuthResult> {
  // 1. Validate
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid Login Id or Password" };
  }

  const { loginId, password } = parsed.data;

  // 2. Find user by loginId
  const user = db
    .select()
    .from(users)
    .where(eq(users.loginId, loginId))
    .get();

  // Generic error — don't reveal whether loginId or password was wrong
  const genericError = "Invalid Login Id or Password";

  if (!user) {
    return { success: false, error: genericError };
  }

  // 3. Check if user is active
  if (!user.active) {
    return { success: false, error: genericError };
  }

  // 4. Verify password
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return { success: false, error: genericError };
  }

  // 5. Set session
  await setUserSession({
    userId: user.id,
    loginId: user.loginId,
    name: user.name,
    role: user.role as "ADMIN" | "ACCOUNTANT" | "USER",
    contactId: user.contactId,
  });

  // 6. Return user without password hash
  const { passwordHash: _, ...safeUser } = user;
  return { success: true, user: safeUser };
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

export async function logout(): Promise<void> {
  await destroySession();
}

// ---------------------------------------------------------------------------
// Forgot Password
// ---------------------------------------------------------------------------

export async function resetPassword(input: ForgotPasswordInput): Promise<AuthResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "_";
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return { success: false, error: "Validation failed", fieldErrors };
  }

  const { loginId, email, newPassword } = parsed.data;

  // Find user by loginId AND email — both must match
  const user = db
    .select()
    .from(users)
    .where(eq(users.loginId, loginId))
    .get();

  // Generic message — don't reveal whether account exists
  const genericMsg =
    "If an account with that Login ID and email exists, the password has been reset.";

  if (!user || user.email !== email) {
    // Still return success-like message to not reveal account existence
    return { success: false, error: genericMsg };
  }

  // Hash new password and update
  const passwordHash = await hashPassword(newPassword);
  const now = new Date();

  db.update(users)
    .set({ passwordHash, updatedAt: now })
    .where(eq(users.id, user.id))
    .run();

  const { passwordHash: _, ...safeUser } = { ...user, passwordHash, updatedAt: now };
  return { success: true, user: safeUser };
}

export const forgotPassword = resetPassword;


// ---------------------------------------------------------------------------
// Admin: Create User (allows any role)
// ---------------------------------------------------------------------------

export async function adminCreateUser(input: AdminCreateUserInput): Promise<AuthResult> {
  const parsed = adminCreateUserSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "_";
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return { success: false, error: "Validation failed", fieldErrors };
  }

  const data = parsed.data;

  // Check loginId uniqueness
  const existingLogin = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.loginId, data.loginId))
    .get();
  if (existingLogin) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: { loginId: ["This Login ID is already taken"] },
    };
  }

  // Check email uniqueness
  const existingEmail = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, data.email))
    .get();
  if (existingEmail) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: { email: ["This email is already registered"] },
    };
  }

  const passwordHash = await hashPassword(data.password);
  const now = new Date();

  const newUser = db
    .insert(users)
    .values({
      name: data.name,
      loginId: data.loginId,
      email: data.email,
      passwordHash,
      role: data.role,
      contactId: data.contactId ?? null,
      active: true,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();

  const { passwordHash: _, ...safeUser } = newUser;
  return { success: true, user: safeUser };
}

// ---------------------------------------------------------------------------
// Admin: List Users
// ---------------------------------------------------------------------------

export function listUsers(): Omit<User, "passwordHash">[] {
  const allUsers = db.select().from(users).all();
  return allUsers.map(({ passwordHash: _, ...rest }) => rest);
}

// ---------------------------------------------------------------------------
// Admin: Toggle User Active Status
// ---------------------------------------------------------------------------

export function toggleUserActive(userId: string, active: boolean) {
  db.update(users)
    .set({ active, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .run();
}

// ---------------------------------------------------------------------------
// Get user by ID (without password hash)
// ---------------------------------------------------------------------------

export function getUserById(userId: string): Omit<User, "passwordHash"> | null {
  const user = db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .get();
  if (!user) return null;
  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
}
