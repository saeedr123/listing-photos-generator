// Object storage provider registry and config resolver.
// The provider name comes from config (OBJECT_STORAGE_PROVIDER). An
// unknown or unregistered name throws. It never falls back to another
// provider and pretends to be the named one.

import { LocalFileObjectStorage } from "./local-file.ts";
import { VERCEL_BLOB_PROVIDER, VercelBlobObjectStorage } from "./vercel-blob.ts";
import { StorageNotConfiguredError, type ObjectStorage } from "./types.ts";

export interface ObjectStorageConfig {
  provider: string;
  localDir: string | null;
  bucket: string | null;
  region: string | null;
  /** Vercel Blob read-write token, from BLOB_READ_WRITE_TOKEN. Never logged. */
  blobToken: string | null;
}

export type ObjectStorageFactory = (config: ObjectStorageConfig) => ObjectStorage;

const factories = new Map<string, ObjectStorageFactory>();

export function registerObjectStorageProvider(name: string, factory: ObjectStorageFactory): void {
  if (!name.trim()) throw new Error("A storage provider needs a name.");
  factories.set(name, factory);
}

export function registeredObjectStorageProviders(): string[] {
  return [...factories.keys()].sort();
}

export const LOCAL_FILE_PROVIDER = "local_file";

registerObjectStorageProvider(LOCAL_FILE_PROVIDER, (config) => {
  if (!config.localDir) {
    throw new StorageNotConfiguredError(
      "The local_file storage provider needs OBJECT_STORAGE_LOCAL_DIR, or a default local directory from the caller.",
    );
  }
  return new LocalFileObjectStorage(config.localDir);
});

registerObjectStorageProvider(VERCEL_BLOB_PROVIDER, (config) => new VercelBlobObjectStorage({ token: config.blobToken ?? "" }));

export interface StorageEnv {
  OBJECT_STORAGE_PROVIDER?: string;
  OBJECT_STORAGE_LOCAL_DIR?: string;
  OBJECT_STORAGE_BUCKET?: string;
  OBJECT_STORAGE_REGION?: string;
  BLOB_READ_WRITE_TOKEN?: string;
  NODE_ENV?: string;
}

/**
 * Read the storage config from env.
 * - A named provider is used as named.
 * - No name, outside production: the local file adapter, for development.
 * - No name, in production: not configured. Production never picks a
 *   provider by itself.
 */
export function resolveObjectStorageConfig(env: StorageEnv, defaultLocalDir: string | null): ObjectStorageConfig {
  const named = (env.OBJECT_STORAGE_PROVIDER ?? "").trim();
  if (!named && env.NODE_ENV === "production") {
    throw new StorageNotConfiguredError(
      "Object storage is not configured. Set OBJECT_STORAGE_PROVIDER. No production storage provider has been chosen yet (PROMPT.md section 23).",
    );
  }
  return {
    provider: named || LOCAL_FILE_PROVIDER,
    localDir: (env.OBJECT_STORAGE_LOCAL_DIR ?? "").trim() || defaultLocalDir,
    bucket: (env.OBJECT_STORAGE_BUCKET ?? "").trim() || null,
    region: (env.OBJECT_STORAGE_REGION ?? "").trim() || null,
    blobToken: (env.BLOB_READ_WRITE_TOKEN ?? "").trim() || null,
  };
}

export function createObjectStorage(config: ObjectStorageConfig): ObjectStorage {
  const factory = factories.get(config.provider);
  if (!factory) {
    throw new StorageNotConfiguredError(
      `Object storage provider ${JSON.stringify(config.provider)} is not registered. Registered: ${registeredObjectStorageProviders().join(", ") || "none"}.`,
    );
  }
  return factory(config);
}
