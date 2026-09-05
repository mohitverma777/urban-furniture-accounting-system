/**
 * src/config/env.ts
 *
 * Centralized, Zod-validated environment configuration.
 *
 * Rules:
 *  - All env access throughout the codebase must go through this module.
 *  - Fails fast at startup when required variables are missing or invalid.
 *  - In production, rejects unsafe configurations (local SQLite file, missing
 *    credentials, hardcoded URLs).
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

const DatabaseProviderSchema = z.enum(["sqlite", "turso", "postgres"]);
const StorageProviderSchema = z.enum(["local", "cloud"]);
const AuthProviderSchema = z.enum(["demo", "production"]);
const NodeEnvSchema = z.enum(["development", "test", "production"]);
const AppEnvSchema = z.enum(["development", "test", "production"]);

// ---------------------------------------------------------------------------
// Raw schema (always required)
// ---------------------------------------------------------------------------

const BaseEnvSchema = z.object({
  NODE_ENV: NodeEnvSchema.default("development"),
  APP_ENV: AppEnvSchema.optional(),

  // Provider switches — default to local/demo for development
  DATABASE_PROVIDER: DatabaseProviderSchema.default("sqlite"),
  STORAGE_PROVIDER: StorageProviderSchema.default("local"),
  AUTH_PROVIDER: AuthProviderSchema.default("demo"),

  // Allow local/demo providers in production build for demo/standalone deployments
  ALLOW_DEMO_PROD: z.enum(["true", "false"]).default("true"),

  // Application
  NEXT_PUBLIC_APP_NAME: z.string().default("Urban Furniture Accounting"),
  NEXT_PUBLIC_APP_VERSION: z.string().default("0.1.0"),

  // SQLite (local development only)
  SQLITE_DB_PATH: z.string().optional(),

  // Turso (production)
  TURSO_DATABASE_URL: z.string().optional(),
  TURSO_AUTH_TOKEN: z.string().optional(),

  // PostgreSQL (production alternative)
  DATABASE_URL: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Production safety refinement
// ---------------------------------------------------------------------------

const EnvSchema = BaseEnvSchema.superRefine((data, ctx) => {
  const effectiveEnv = data.APP_ENV ?? data.NODE_ENV;
  const isProd = effectiveEnv === "production";
  const strictProd = isProd && data.ALLOW_DEMO_PROD === "false";

  if (strictProd) {
    // Production must declare an explicit database provider
    if (data.DATABASE_PROVIDER === "sqlite") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "DATABASE_PROVIDER=sqlite is not allowed in production. " +
          "Use 'turso' or 'postgres'.",
        path: ["DATABASE_PROVIDER"],
      });
    }

    // Turso requires both URL and auth token
    if (data.DATABASE_PROVIDER === "turso") {
      if (!data.TURSO_DATABASE_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "TURSO_DATABASE_URL is required when DATABASE_PROVIDER=turso",
          path: ["TURSO_DATABASE_URL"],
        });
      }
      if (!data.TURSO_AUTH_TOKEN) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "TURSO_AUTH_TOKEN is required when DATABASE_PROVIDER=turso",
          path: ["TURSO_AUTH_TOKEN"],
        });
      }
    }

    // PostgreSQL requires a connection string
    if (data.DATABASE_PROVIDER === "postgres" && !data.DATABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "DATABASE_URL is required when DATABASE_PROVIDER=postgres",
        path: ["DATABASE_URL"],
      });
    }

    // Production must not use local storage for attachments
    if (data.STORAGE_PROVIDER === "local") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "STORAGE_PROVIDER=local is not allowed in production. Use 'cloud'.",
        path: ["STORAGE_PROVIDER"],
      });
    }

    // Production must not use the demo auth provider
    if (data.AUTH_PROVIDER === "demo") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "AUTH_PROVIDER=demo is not allowed in production. Use 'production'.",
        path: ["AUTH_PROVIDER"],
      });
    }
  }
});

// ---------------------------------------------------------------------------
// Parse & export — fails fast if invalid
// ---------------------------------------------------------------------------

const _parsed = EnvSchema.safeParse(process.env);

if (!_parsed.success) {
  console.error("❌ Invalid environment configuration:");
  console.error(_parsed.error.flatten().fieldErrors);
  throw new Error(
    "Invalid environment configuration. See errors above and fix your .env file."
  );
}

export const env = _parsed.data;

export const appEnv = env.APP_ENV ?? env.NODE_ENV;

export const isProduction = appEnv === "production";
export const isDevelopment = appEnv === "development";
export const isTest = appEnv === "test";

export const isDemoAuth = env.AUTH_PROVIDER === "demo";
export const isSqliteDb = env.DATABASE_PROVIDER === "sqlite";
export const isTursoDb = env.DATABASE_PROVIDER === "turso";
export const isPostgresDb = env.DATABASE_PROVIDER === "postgres";
export const isLocalStorage = env.STORAGE_PROVIDER === "local";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Env = z.infer<typeof EnvSchema>;
export type DatabaseProvider = z.infer<typeof DatabaseProviderSchema>;
export type StorageProvider = z.infer<typeof StorageProviderSchema>;
export type AuthProvider = z.infer<typeof AuthProviderSchema>;
