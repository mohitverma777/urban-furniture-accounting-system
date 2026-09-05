/**
 * src/services/diagnostics.ts
 *
 * Diagnostic service for system health and infrastructure configuration.
 */

import { appEnv, env } from "@/config/env";
import { databaseProvider } from "@/infrastructure/database";
import { storageProvider } from "@/infrastructure/storage";
import { authProvider } from "@/infrastructure/auth";

export interface DiagnosticReport {
  environment: string;
  nodeEnv: string;
  databaseProvider: string;
  storageProvider: string;
  authProvider: string;
  connectionStatus: "Connected" | "Error" | "Degraded";
  connectionError?: string;
  applicationVersion: string;
  schemaVersion: string;
  timestamp: string;
}

export const SCHEMA_VERSION = "0000_high_groot";

export async function getSystemDiagnostics(): Promise<DiagnosticReport> {
  let connectionStatus: "Connected" | "Error" | "Degraded" = "Connected";
  let connectionError: string | undefined;

  try {
    await databaseProvider.healthCheck();
  } catch (err) {
    connectionStatus = "Error";
    connectionError = err instanceof Error ? err.message : String(err);
  }

  return {
    environment: appEnv,
    nodeEnv: env.NODE_ENV,
    databaseProvider: databaseProvider.name,
    storageProvider: storageProvider.name,
    authProvider: authProvider.name,
    connectionStatus,
    connectionError,
    applicationVersion: env.NEXT_PUBLIC_APP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    timestamp: new Date().toISOString(),
  };
}
