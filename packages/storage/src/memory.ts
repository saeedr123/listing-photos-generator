// In memory object storage. For tests and as the base for fake providers
// in provider swap tests. Not a production provider.

import { createHash } from "node:crypto";
import {
  assertValidStorageKey,
  assertValidStoragePrefix,
  type ObjectStorage,
  type PutOptions,
  type StoredObject,
  type StoredObjectInfo,
} from "./types.ts";

export function sha256Hex(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

export class InMemoryObjectStorage implements ObjectStorage {
  readonly providerName: string;
  private readonly objects = new Map<string, StoredObject>();
  private readonly now: () => Date;

  constructor(providerName = "memory", now: () => Date = () => new Date()) {
    this.providerName = providerName;
    this.now = now;
  }

  async put(key: string, data: Uint8Array, options: PutOptions): Promise<StoredObjectInfo> {
    assertValidStorageKey(key);
    const copy = new Uint8Array(data);
    const info: StoredObjectInfo = {
      key,
      bytes: copy.byteLength,
      contentType: options.contentType,
      sha256: sha256Hex(copy),
      updatedAt: this.now().toISOString(),
    };
    this.objects.set(key, { info, data: copy });
    return info;
  }

  async get(key: string): Promise<StoredObject | null> {
    assertValidStorageKey(key);
    const found = this.objects.get(key);
    return found ? { info: found.info, data: new Uint8Array(found.data) } : null;
  }

  async head(key: string): Promise<StoredObjectInfo | null> {
    assertValidStorageKey(key);
    return this.objects.get(key)?.info ?? null;
  }

  async delete(key: string): Promise<boolean> {
    assertValidStorageKey(key);
    return this.objects.delete(key);
  }

  async list(prefix: string): Promise<StoredObjectInfo[]> {
    assertValidStoragePrefix(prefix);
    return [...this.objects.values()]
      .map((o) => o.info)
      .filter((info) => info.key.startsWith(prefix))
      .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  }

  async signedReadUrl(): Promise<string | null> {
    return null;
  }
}
