/**
 * src/infrastructure/storage/provider.ts
 *
 * Abstract file/attachment storage provider interface.
 *
 * LOCAL (development):  STORAGE_PROVIDER=local
 *   → Writes files to a local directory (e.g. public/uploads).
 *
 * CLOUD (production):   STORAGE_PROVIDER=cloud
 *   → Delegates to an S3-compatible bucket (Cloudflare R2, AWS S3, etc.)
 *
 * Business logic must NEVER depend on concrete storage implementations.
 */

// ---------------------------------------------------------------------------
// Storage item types
// ---------------------------------------------------------------------------

export interface StorageObject {
  /** Provider-relative key / path for this object. */
  key: string;
  /** Public URL to access the object (may be signed / expiring). */
  url: string;
  /** MIME type of the stored object. */
  contentType: string;
  /** Size in bytes. */
  sizeBytes: number;
  /** ISO-8601 upload timestamp. */
  uploadedAt: string;
}

export interface UploadInput {
  /** The file buffer to upload. */
  buffer: Buffer;
  /** Original file name (used for extension detection). */
  originalName: string;
  /** MIME type. */
  contentType: string;
  /** Optional folder/prefix to organize objects. */
  folder?: string;
}

// ---------------------------------------------------------------------------
// Storage provider interface
// ---------------------------------------------------------------------------

export interface StorageProvider {
  readonly name: "local" | "cloud";

  /**
   * Upload a file and return storage metadata.
   */
  upload(input: UploadInput): Promise<StorageObject>;

  /**
   * Get metadata and a (possibly signed) URL for an existing object.
   * Returns null if the object does not exist.
   */
  get(key: string): Promise<StorageObject | null>;

  /**
   * Delete an object by key.
   */
  delete(key: string): Promise<void>;

  /**
   * List objects in a folder prefix.
   */
  list(folder: string): Promise<StorageObject[]>;
}

// ---------------------------------------------------------------------------
// Factory signature
// ---------------------------------------------------------------------------

export type StorageProviderFactory = () => StorageProvider;
