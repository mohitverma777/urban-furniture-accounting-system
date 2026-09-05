/**
 * src/infrastructure/index.ts
 *
 * Provider registry barrel.
 *
 * Re-exports all provider interfaces so that services and actions can import
 * from a single location:
 *
 *   import type { DatabaseProvider } from "@/infrastructure";
 */

export type {
  DatabaseProvider,
  DatabaseProviderFactory,
  QueryRow,
  RawQueryResult,
  TransactionContext,
} from "./database/provider";

export type {
  AuthProvider,
  AuthProviderFactory,
  Session,
  Permission,
} from "./auth/provider";

export {
  DEMO_USERS,
  hasPermission,
  requirePermission,
} from "./auth/provider";

export type {
  StorageProvider,
  StorageProviderFactory,
  StorageObject,
  UploadInput,
} from "./storage/provider";
