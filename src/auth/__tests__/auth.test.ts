/**
 * src/auth/__tests__/auth.test.ts
 *
 * Comprehensive unit test suite for Role-Based Authentication.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { hashPassword, verifyPassword } from "../password";
import { loginSchema, signupSchema, adminCreateUserSchema } from "../validation";
import { hasPermission, getRolePermissions } from "../permissions";
import { login, signup } from "../service";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";

describe("Password Hashing (bcryptjs)", () => {
  it("hashes password and verifies successfully", async () => {
    const plain = "SecretPass123!";
    const hash = await hashPassword(plain);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(plain);
    expect(hash.startsWith("$2a$") || hash.startsWith("$2b$")).toBe(true);

    const match = await verifyPassword(plain, hash);
    expect(match).toBe(true);
  });

  it("rejects incorrect password", async () => {
    const plain = "SecretPass123!";
    const hash = await hashPassword(plain);

    const match = await verifyPassword("WrongPassword123", hash);
    expect(match).toBe(false);
  });
});

describe("Auth Validation Schemas", () => {
  it("validates valid login credentials", () => {
    const valid = loginSchema.safeParse({
      loginId: "user123",
      password: "password123",
    });
    expect(valid.success).toBe(true);
  });

  it("rejects signup loginId that is too short or too long", () => {
    const short = signupSchema.safeParse({
      loginId: "usr",
      name: "Short User",
      email: "short@example.com",
      password: "Password123!",
      confirmPassword: "Password123!",
    });
    expect(short.success).toBe(false);

    const long = signupSchema.safeParse({
      loginId: "thisloginidistoolong123",
      name: "Long User",
      email: "long@example.com",
      password: "Password123!",
      confirmPassword: "Password123!",
    });
    expect(long.success).toBe(false);
  });

  it("validates valid signup input", () => {
    const valid = signupSchema.safeParse({
      loginId: "newuser",
      name: "New User",
      email: "newuser@example.com",
      password: "Password123!",
      confirmPassword: "Password123!",
    });
    expect(valid.success).toBe(true);
  });

  it("rejects signup when passwords do not match", () => {
    const mismatch = signupSchema.safeParse({
      loginId: "newuser",
      name: "New User",
      email: "newuser@example.com",
      password: "Password123!",
      confirmPassword: "DifferentPass123!",
    });
    expect(mismatch.success).toBe(false);
  });

  it("enforces admin creation role enum (ADMIN, ACCOUNTANT, USER)", () => {
    const validAdmin = adminCreateUserSchema.safeParse({
      loginId: "adminuser",
      name: "Admin User",
      email: "admin@example.com",
      password: "Password123!",
      confirmPassword: "Password123!",
      role: "ADMIN",
    });
    expect(validAdmin.success).toBe(true);

    const invalidRole = adminCreateUserSchema.safeParse({
      loginId: "adminuser",
      name: "Admin User",
      email: "admin@example.com",
      password: "Password123!",
      confirmPassword: "Password123!",
      role: "SUPERADMIN",
    });
    expect(invalidRole.success).toBe(false);
  });
});

describe("Role Permissions & Guards", () => {
  it("grants full access to ADMIN role", () => {
    const adminPerms = getRolePermissions("ADMIN");
    expect(adminPerms.manageUsers).toBe(true);
    expect(adminPerms.manageAccounting).toBe(true);
    expect(adminPerms.viewPortal).toBe(true);
  });

  it("grants accounting access but denies user management to ACCOUNTANT", () => {
    const accPerms = getRolePermissions("ACCOUNTANT");
    expect(accPerms.manageUsers).toBe(false);
    expect(accPerms.manageAccounting).toBe(true);
    expect(accPerms.viewPortal).toBe(true);
  });

  it("restricts USER role to customer portal only", () => {
    const userPerms = getRolePermissions("USER");
    expect(userPerms.manageUsers).toBe(false);
    expect(userPerms.manageAccounting).toBe(false);
    expect(userPerms.viewPortal).toBe(true);

    expect(hasPermission("/accounting", "USER")).toBe(false);
    expect(hasPermission("/portal", "USER")).toBe(true);
  });
});

describe("Auth Service Operations", () => {
  beforeEach(async () => {
    await db.delete(users).where(eq(users.loginId, "testuser1"));
  });

  it("authenticates existing seeded admin account", async () => {
    const res = await login({
      loginId: "admin",
      password: "Admin@1234",
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.user.role).toBe("ADMIN");
      expect(res.user.loginId).toBe("admin");
    }
  });

  it("returns exact error message 'Invalid Login Id or Password' on wrong password", async () => {
    const res = await login({
      loginId: "admin",
      password: "WrongPassword999",
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBe("Invalid Login Id or Password");
    }
  });

  it("returns exact error message 'Invalid Login Id or Password' on non-existent loginId", async () => {
    const res = await login({
      loginId: "nonexistentuser",
      password: "SomePassword123",
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBe("Invalid Login Id or Password");
    }
  });

  it("allows public signup creating a USER role account", async () => {
    const res = await signup({
      loginId: "testuser1",
      name: "Test User One",
      email: "testuser1@example.com",
      password: "Password123!",
      confirmPassword: "Password123!",
      role: "USER",
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.user.role).toBe("USER");
      expect(res.user.loginId).toBe("testuser1");
    }
  });
});
