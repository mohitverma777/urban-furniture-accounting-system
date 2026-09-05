/**
 * src/auth/validation.ts
 *
 * Zod validation schemas for authentication forms.
 *
 * Rules:
 *   Login ID: required, 6-12 chars, unique (checked in service)
 *   Email:    required, valid format, unique (checked in service)
 *   Password: required, >8 chars, 1 lowercase, 1 uppercase, 1 special char
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Password validation
// ---------------------------------------------------------------------------

export const passwordSchema = z
  .string()
  .min(9, "Password must be more than 8 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase character")
  .regex(/[A-Z]/, "Password must contain at least one uppercase character")
  .regex(
    /[^a-zA-Z0-9]/,
    "Password must contain at least one special character"
  );

// ---------------------------------------------------------------------------
// Sign Up
// ---------------------------------------------------------------------------

export const signupSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100),
    loginId: z
      .string()
      .min(6, "Login ID must be at least 6 characters")
      .max(12, "Login ID must be at most 12 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Login ID may only contain letters, numbers, and underscores"
      ),
    email: z.string().email("Invalid email format"),
    password: passwordSchema,
    confirmPassword: z.string(),
    /** Public sign-up always creates USER role.
     *  ADMIN can create ACCOUNTANT/ADMIN via admin panel. */
    role: z.enum(["ADMIN", "ACCOUNTANT", "USER"]).default("USER"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignupInput = z.infer<typeof signupSchema>;

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  loginId: z.string().min(1, "Login ID is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Forgot Password
// ---------------------------------------------------------------------------

export const forgotPasswordSchema = z.object({
  loginId: z.string().min(1, "Login ID is required"),
  email: z.string().email("Invalid email format"),
  newPassword: passwordSchema,
  confirmNewPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmNewPassword, {
  message: "Passwords do not match",
  path: ["confirmNewPassword"],
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// ---------------------------------------------------------------------------
// Admin Create User
// ---------------------------------------------------------------------------

export const adminCreateUserSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100),
    loginId: z
      .string()
      .min(6, "Login ID must be at least 6 characters")
      .max(12, "Login ID must be at most 12 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Login ID may only contain letters, numbers, and underscores"
      ),
    email: z.string().email("Invalid email format"),
    password: passwordSchema,
    confirmPassword: z.string(),
    role: z.enum(["ADMIN", "ACCOUNTANT", "USER"]),
    contactId: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
