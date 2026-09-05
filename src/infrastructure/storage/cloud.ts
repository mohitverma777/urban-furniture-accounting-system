/**
 * src/infrastructure/storage/cloud.ts
 *
 * Cloud storage provider (S3 / R2) placeholder.
 */

import type { StorageObject, StorageProvider } from "./provider";

export class CloudStorageProvider implements StorageProvider {
  readonly name = "cloud" as const;

  async upload(): Promise<StorageObject> {
    throw new Error("Cloud storage provider is not yet configured with S3/R2 credentials.");
  }

  async get(): Promise<StorageObject | null> {
    throw new Error("Cloud storage provider is not yet configured.");
  }

  async delete(): Promise<void> {
    throw new Error("Cloud storage provider is not yet configured.");
  }

  async list(): Promise<StorageObject[]> {
    throw new Error("Cloud storage provider is not yet configured.");
  }
}

export const cloudStorageProvider = new CloudStorageProvider();
