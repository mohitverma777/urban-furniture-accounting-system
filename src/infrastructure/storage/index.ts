/**
 * src/infrastructure/storage/index.ts
 *
 * Storage provider factory & exports.
 */

import { env } from "@/config/env";
import type { StorageProvider } from "./provider";
import { localStorageProvider } from "./local";
import { cloudStorageProvider } from "./cloud";

export * from "./provider";
export { LocalStorageProvider } from "./local";
export { CloudStorageProvider } from "./cloud";

export function getStorageProvider(): StorageProvider {
  switch (env.STORAGE_PROVIDER) {
    case "local":
      return localStorageProvider;
    case "cloud":
      return cloudStorageProvider;
    default:
      throw new Error(`Unsupported storage provider: ${env.STORAGE_PROVIDER}`);
  }
}

export const storageProvider = getStorageProvider();
