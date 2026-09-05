/**
 * src/infrastructure/__tests__/diagnostics.test.ts
 *
 * Unit tests for environment configuration, infrastructure providers, and diagnostics service.
 */

import { describe, it, expect } from "vitest";
import { appEnv, env } from "@/config/env";
import { databaseProvider, storageProvider, authProvider } from "@/infrastructure";
import { getSystemDiagnostics, SCHEMA_VERSION } from "@/services/diagnostics";

describe("Infrastructure Diagnostics & Providers", () => {
  it("validates environment configuration variables", () => {
    expect(env.DATABASE_PROVIDER).toBeDefined();
    expect(env.STORAGE_PROVIDER).toBeDefined();
    expect(env.AUTH_PROVIDER).toBeDefined();
    expect(appEnv).toBeDefined();
  });

  it("retrieves healthy database provider status", async () => {
    expect(databaseProvider.name).toBe("sqlite");
    await expect(databaseProvider.healthCheck()).resolves.not.toThrow();
  });

  it("handles storage provider operations", async () => {
    expect(storageProvider.name).toBe("local");
    const testFile = await storageProvider.upload({
      buffer: Buffer.from("test content"),
      originalName: "test.txt",
      contentType: "text/plain",
      folder: "test",
    });
    expect(testFile.key).toContain("test");
    expect(testFile.url).toContain("/uploads/");
  });

  it("resolves auth provider session", async () => {
    expect(authProvider.name).toBe("demo");
    const session = await authProvider.getSession();
    expect(session?.user.role).toBe("admin");
  });

  it("generates system diagnostics report", async () => {
    const report = await getSystemDiagnostics();
    expect(report.environment).toBe(appEnv);
    expect(report.databaseProvider).toBe("sqlite");
    expect(report.storageProvider).toBe("local");
    expect(report.authProvider).toBe("demo");
    expect(report.connectionStatus).toBe("Connected");
    expect(report.schemaVersion).toBe(SCHEMA_VERSION);
    expect(report.applicationVersion).toBe(env.NEXT_PUBLIC_APP_VERSION);
  });
});
