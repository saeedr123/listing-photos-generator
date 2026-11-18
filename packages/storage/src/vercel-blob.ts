// Vercel Blob object storage, for hosting on Vercel.
// Decided by the owner on 2026-11-18 (docs/deployment-vercel.md).
//
// Every object is stored PRIVATE: it is never served from a public URL.
// The app reads it with the store token and serves it through its own
// routes, which check sign-in. Keys map to Blob pathnames one to one, with
// no random suffix, so versioned documents keep stable keys.
//
// The token comes from BLOB_READ_WRITE_TOKEN, which Vercel sets when a
// Blob store is connected to the project. It is never logged.
//
// Checksums: Blob does not keep a SHA-256 of the content. put() and get()
// compute it from the bytes. head() and list() do not read the bytes, so
// they report sha256 as an empty string, meaning not known. Nothing in the
// app reads the checksum from head() or list().

import { sha256Hex } from "./memory.ts";
import {
  assertValidStorageKey,
  assertValidStoragePrefix,
  StorageNotConfiguredError,
  type ObjectStorage,
  type PutOptions,
  type StoredObject,
  type StoredObjectInfo,
} from "./types.ts";

/** The part of the @vercel/blob API this adapter uses. Tests pass a fake. */
export interface VercelBlobClient {
  put(
    pathname: string,
    body: Buffer,
    options: { access: "private"; contentType: string; addRandomSuffix: false; allowOverwrite: true; token: string },
  ): Promise<{ pathname: string }>;
  head(pathname: string, options: { token: string }): Promise<{ pathname: string; size: number; contentType: string; uploadedAt: Date }>;
  get(
    pathname: string,
    options: { access: "private"; useCache: false; token: string },
  ): Promise<
    | { statusCode: 200; stream: ReadableStream<Uint8Array>; blob: { pathname: string; size: number; contentType: string; uploadedAt: Date } }
    | { statusCode: 304; stream: null }
    | null
  >;
  del(pathname: string, options: { token: string }): Promise<void>;
  list(options: { prefix: string; cursor?: string; limit: number; token: string }): Promise<{
    blobs: Array<{ pathname: string; size: number; uploadedAt: Date }>;
    cursor?: string;
    hasMore: boolean;
  }>;
}

export const VERCEL_BLOB_PROVIDER = "vercel_blob";

// @vercel/blob 2.8.2 throws BlobNotFoundError ("Vercel Blob: The requested
// blob does not exist") and does not set error.name, so check the class
// name and the message.
function isNotFound(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.constructor?.name === "BlobNotFoundError" || /requested blob does not exist/i.test(error.message);
}

async function readAll(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    total += value.byteLength;
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}

async function loadDefaultClient(): Promise<VercelBlobClient> {
  const blob = await import("@vercel/blob");
  return blob as unknown as VercelBlobClient;
}

export class VercelBlobObjectStorage implements ObjectStorage {
  readonly providerName = VERCEL_BLOB_PROVIDER;
  private readonly token: string;
  private clientPromise: Promise<VercelBlobClient> | null;

  constructor(options: { token: string; client?: VercelBlobClient }) {
    if (!options.token) {
      throw new StorageNotConfiguredError(
        "The vercel_blob storage provider needs BLOB_READ_WRITE_TOKEN. Connect a Blob store to the Vercel project.",
      );
    }
    this.token = options.token;
    this.clientPromise = options.client ? Promise.resolve(options.client) : null;
  }

  private client(): Promise<VercelBlobClient> {
    if (!this.clientPromise) this.clientPromise = loadDefaultClient();
    return this.clientPromise;
  }

  async put(key: string, data: Uint8Array, options: PutOptions): Promise<StoredObjectInfo> {
    assertValidStorageKey(key);
    const client = await this.client();
    await client.put(key, Buffer.from(data), {
      access: "private",
      contentType: options.contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
      token: this.token,
    });
    return {
      key,
      bytes: data.byteLength,
      contentType: options.contentType,
      sha256: sha256Hex(data),
      updatedAt: new Date().toISOString(),
    };
  }

  async get(key: string): Promise<StoredObject | null> {
    assertValidStorageKey(key);
    const client = await this.client();
    let result;
    try {
      result = await client.get(key, { access: "private", useCache: false, token: this.token });
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
    if (!result || result.statusCode !== 200) return null;
    const data = await readAll(result.stream);
    return {
      info: {
        key,
        bytes: data.byteLength,
        contentType: result.blob.contentType,
        sha256: sha256Hex(data),
        updatedAt: new Date(result.blob.uploadedAt).toISOString(),
      },
      data,
    };
  }

  async head(key: string): Promise<StoredObjectInfo | null> {
    assertValidStorageKey(key);
    const client = await this.client();
    try {
      const meta = await client.head(key, { token: this.token });
      return { key, bytes: meta.size, contentType: meta.contentType, sha256: "", updatedAt: new Date(meta.uploadedAt).toISOString() };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async delete(key: string): Promise<boolean> {
    const existed = (await this.head(key)) !== null;
    if (!existed) return false;
    const client = await this.client();
    await client.del(key, { token: this.token });
    return true;
  }

  async list(prefix: string): Promise<StoredObjectInfo[]> {
    assertValidStoragePrefix(prefix);
    const client = await this.client();
    const out: StoredObjectInfo[] = [];
    let cursor: string | undefined;
    do {
      const page = await client.list({ prefix, cursor, limit: 1000, token: this.token });
      for (const blob of page.blobs) {
        out.push({
          key: blob.pathname,
          bytes: blob.size,
          contentType: "",
          sha256: "",
          updatedAt: new Date(blob.uploadedAt).toISOString(),
        });
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return out.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  }

  async signedReadUrl(): Promise<string | null> {
    // Private blobs are served through the app's own routes.
    return null;
  }
}
