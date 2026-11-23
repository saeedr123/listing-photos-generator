// Object storage interface.
// PROMPT.md section 23 leaves the object storage provider undecided, so
// the core talks only to this interface. A provider is one registered
// implementation, named by config (OBJECT_STORAGE_PROVIDER), never a
// hard coded import in the core. See docs/architecture.md section 9.4.

export interface StoredObjectInfo {
  key: string;
  bytes: number;
  contentType: string;
  sha256: string;
  updatedAt: string;
}

export interface StoredObject {
  info: StoredObjectInfo;
  data: Uint8Array;
}

export interface PutOptions {
  contentType: string;
}

export interface ObjectStorage {
  /** The registered provider name this instance was created under. */
  readonly providerName: string;
  put(key: string, data: Uint8Array, options: PutOptions): Promise<StoredObjectInfo>;
  get(key: string): Promise<StoredObject | null>;
  head(key: string): Promise<StoredObjectInfo | null>;
  delete(key: string): Promise<boolean>;
  /** Every object whose key starts with the prefix, sorted by key. */
  list(prefix: string): Promise<StoredObjectInfo[]>;
  /**
   * A time limited read URL, where the provider supports one. The local
   * file adapter returns null: its objects are served through an
   * application route, not a signed URL.
   */
  signedReadUrl(key: string, expiresInSeconds: number): Promise<string | null>;
}

export class StorageKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageKeyError";
  }
}

export class StorageNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageNotConfiguredError";
  }
}

const KEY_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * Keys are forward slash separated segments of letters, digits, dots,
 * underscores and hyphens. No empty segment, no leading slash, no dot
 * segments, so a key can never escape the storage root.
 */
export function assertValidStorageKey(key: string): void {
  if (typeof key !== "string" || key.length === 0 || key.length > 512) {
    throw new StorageKeyError("Storage key must be a string of 1 to 512 characters.");
  }
  for (const segment of key.split("/")) {
    if (!KEY_SEGMENT.test(segment) || segment === "." || segment === ".." || segment.includes("..")) {
      throw new StorageKeyError(`Storage key has an invalid segment: ${JSON.stringify(segment)}.`);
    }
  }
}

export function assertValidStoragePrefix(prefix: string): void {
  if (prefix === "") return;
  const trimmed = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
  assertValidStorageKey(trimmed);
}
