// Versioned JSON documents on top of object storage.
// Used for admin managed records: model registry entries, shots, style
// kits. Every change writes a new version object. Nothing is edited in
// place and nothing is deleted, so rollback is always possible. Seed
// documents (the versions kept in the repository) are read only and sit
// under the stored versions.

import type { ObjectStorage } from "./types.ts";

export interface VersionedDoc {
  id: string;
  version: number;
}

export interface VersionedDocStoreOptions<T extends VersionedDoc> {
  storage: ObjectStorage;
  /** Key prefix for this collection, for example registry/models. */
  collection: string;
  /** Read only baseline documents, for example the JSON files in the repository. */
  seeds?: T[];
}

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;

export function isValidDocId(id: string): boolean {
  return ID_PATTERN.test(id);
}

function versionKey(collection: string, id: string, version: number): string {
  return `${collection}/${id}/v${String(version).padStart(6, "0")}.json`;
}

export class VersionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VersionConflictError";
  }
}

export class VersionedDocStore<T extends VersionedDoc> {
  private readonly storage: ObjectStorage;
  private readonly collection: string;
  private readonly seeds: T[];

  constructor(options: VersionedDocStoreOptions<T>) {
    this.storage = options.storage;
    this.collection = options.collection.replace(/\/+$/, "");
    this.seeds = options.seeds ?? [];
  }

  private async storedVersions(id: string): Promise<T[]> {
    const infos = await this.storage.list(`${this.collection}/${id}/`);
    const docs: T[] = [];
    for (const info of infos) {
      const object = await this.storage.get(info.key);
      if (!object) continue;
      docs.push(JSON.parse(new TextDecoder().decode(object.data)) as T);
    }
    return docs;
  }

  /** Every version of one document, oldest first. Stored versions win over a seed with the same number. */
  async history(id: string): Promise<T[]> {
    if (!isValidDocId(id)) return [];
    const byVersion = new Map<number, T>();
    for (const seed of this.seeds) {
      if (seed.id === id) byVersion.set(seed.version, seed);
    }
    for (const doc of await this.storedVersions(id)) {
      byVersion.set(doc.version, doc);
    }
    return [...byVersion.values()].sort((a, b) => a.version - b.version);
  }

  async latest(id: string): Promise<T | null> {
    const history = await this.history(id);
    return history.length > 0 ? history[history.length - 1] : null;
  }

  async getVersion(id: string, version: number): Promise<T | null> {
    return (await this.history(id)).find((doc) => doc.version === version) ?? null;
  }

  async ids(): Promise<string[]> {
    const ids = new Set<string>(this.seeds.map((seed) => seed.id));
    const prefix = `${this.collection}/`;
    for (const info of await this.storage.list(prefix)) {
      const rest = info.key.slice(prefix.length);
      const id = rest.split("/")[0];
      if (id) ids.add(id);
    }
    return [...ids].sort();
  }

  /** The latest version of every document, sorted by id. */
  async listLatest(): Promise<T[]> {
    const docs: T[] = [];
    for (const id of await this.ids()) {
      const doc = await this.latest(id);
      if (doc) docs.push(doc);
    }
    return docs;
  }

  /**
   * Store a new version. The version must be exactly one above the
   * current latest (or 1 for a new document), so two edits can never
   * overwrite each other and history can never have a gap.
   */
  async saveNewVersion(doc: T): Promise<T> {
    if (!isValidDocId(doc.id)) {
      throw new Error(`Document id ${JSON.stringify(doc.id)} is not valid. Use lower case letters, digits and hyphens.`);
    }
    const current = await this.latest(doc.id);
    const expected = current ? current.version + 1 : 1;
    if (doc.version !== expected) {
      throw new VersionConflictError(
        `Version conflict for ${doc.id}: expected version ${expected}, got ${doc.version}. Reload and try again.`,
      );
    }
    const key = versionKey(this.collection, doc.id, doc.version);
    if (await this.storage.head(key)) {
      throw new VersionConflictError(`Version ${doc.version} of ${doc.id} already exists.`);
    }
    await this.storage.put(key, new TextEncoder().encode(JSON.stringify(doc)), { contentType: "application/json" });
    return doc;
  }
}
