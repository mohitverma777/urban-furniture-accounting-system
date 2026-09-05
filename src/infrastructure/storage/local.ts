/**
 * src/infrastructure/storage/local.ts
 *
 * Local disk implementation of StorageProvider writing to public/uploads.
 */

import { promises as fs } from "node:fs";
import { join, resolve } from "node:path";
import type { StorageObject, StorageProvider, UploadInput } from "./provider";

export class LocalStorageProvider implements StorageProvider {
  readonly name = "local" as const;
  private uploadDir: string;

  constructor(uploadDir?: string) {
    this.uploadDir = uploadDir ?? resolve(process.cwd(), "public", "uploads");
  }

  private async ensureDir(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }

  async upload(input: UploadInput): Promise<StorageObject> {
    const folder = input.folder ? input.folder.replace(/^\/+|\/+$/g, "") : "";
    const targetDir = folder ? join(this.uploadDir, folder) : this.uploadDir;
    await this.ensureDir(targetDir);

    const filename = `${Date.now()}_${input.originalName.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
    const filePath = join(targetDir, filename);
    await fs.writeFile(filePath, input.buffer);

    const relativeKey = folder ? `${folder}/${filename}` : filename;
    const url = `/uploads/${relativeKey}`;

    return {
      key: relativeKey,
      url,
      contentType: input.contentType,
      sizeBytes: input.buffer.length,
      uploadedAt: new Date().toISOString(),
    };
  }

  async get(key: string): Promise<StorageObject | null> {
    const filePath = join(this.uploadDir, key);
    try {
      const stats = await fs.stat(filePath);
      return {
        key,
        url: `/uploads/${key}`,
        contentType: "application/octet-stream",
        sizeBytes: stats.size,
        uploadedAt: stats.mtime.toISOString(),
      };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = join(this.uploadDir, key);
    try {
      await fs.unlink(filePath);
    } catch {
      // Ignore if file does not exist
    }
  }

  async list(folder: string): Promise<StorageObject[]> {
    const targetDir = folder ? join(this.uploadDir, folder) : this.uploadDir;
    try {
      const files = await fs.readdir(targetDir, { withFileTypes: true });
      const results: StorageObject[] = [];
      for (const file of files) {
        if (file.isFile()) {
          const filePath = join(targetDir, file.name);
          const stats = await fs.stat(filePath);
          const key = folder ? `${folder}/${file.name}` : file.name;
          results.push({
            key,
            url: `/uploads/${key}`,
            contentType: "application/octet-stream",
            sizeBytes: stats.size,
            uploadedAt: stats.mtime.toISOString(),
          });
        }
      }
      return results;
    } catch {
      return [];
    }
  }
}

export const localStorageProvider = new LocalStorageProvider();
