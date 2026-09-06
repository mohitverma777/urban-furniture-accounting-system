"use server";

import { signup, login, logout, resetPassword, adminCreateUser, listUsers, toggleUserActive } from "./service";
import { requireRole } from "./permissions";
import { getCurrentUser } from "./session";
import type { SignupInput, LoginInput, ForgotPasswordInput, AdminCreateUserInput } from "./validation";

// ---------------------------------------------------------------------------
// Public Actions
// ---------------------------------------------------------------------------

export async function signupAction(input: SignupInput) {
  return signup(input);
}

export async function loginAction(input: LoginInput) {
  return login(input);
}

export async function logoutAction() {
  await logout();
}

export async function forgotPasswordAction(input: ForgotPasswordInput) {
  return resetPassword(input);
}

export const resetPasswordAction = forgotPasswordAction;

export async function getMeAction() {
  return getCurrentUser();
}

// ---------------------------------------------------------------------------
// Admin-Only Actions
// ---------------------------------------------------------------------------

export async function adminCreateUserAction(input: AdminCreateUserInput) {
  await requireRole("ADMIN");
  return adminCreateUser(input);
}

export async function listUsersAction() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "ACCOUNTANT")) {
    throw new Error("Forbidden: Requires ADMIN or ACCOUNTANT role");
  }
  const users = listUsers();
  return { success: true, users };
}

export async function toggleUserActiveAction(userId: string, active: boolean) {
  await requireRole("ADMIN");
  toggleUserActive(userId, active);
  return { success: true };
}

