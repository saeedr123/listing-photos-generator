// Local file object storage. DEVELOPMENT ONLY.
// Objects are files under one root directory, with a small JSON sidecar
// per object for content type and checksum. This is not a production
// provider: no signed access, no replication, no lifecycle rules. The
// production provider waits for the storage decision in PROMPT.md
// section 23.

import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { sha256Hex } from "./memory.ts";
import {
  assertValidStorageKey,
  assertValidStoragePrefix,
  type ObjectStorage,
  type PutOptions,
  type StoredObject,
  type StoredObjectInfo,
} from "./types.ts";

const META_SUFFIX = ".lpgmeta";

export class LocalFileObjectStorage implements ObjectStorage {
  readonly providerName = "local_file";
  private readonly root: string;

  constructor(rootDir: string) {
    if (!rootDir) throw new Error("LocalFileObjectStorage needs a root directory.");
    this.root = resolve(rootDir);
  }

  private pathFor(key: string): string {
    assertValidStorageKey(key);
    if (key.endsWith(META_SUFFIX)) {
      throw new Error(`Storage key must not end with ${META_SUFFIX}.`);
    }
    const full = resolve(this.root, ...key.split("/"));
    if (full !== this.root && !full.startsWith(this.root + sep)) {
      throw new Error("Storage key resolves outside the storage root.");
    }
    return full;
  }

  async put(key: string, data: Uint8Array, options: PutOptions): Promise<StoredObjectInfo> {
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    const info: StoredObjectInfo = {
      key,
      bytes: data.byteLength,
      contentType: options.contentType,
      sha256: sha256Hex(data),
      updatedAt: new Date().toISOString(),
    };
    // Write to a temporary name first, then rename, so a failed write
    // never leaves a half written object in place of a good one.
    const tmp = `${path}.tmp-${process.pid}-${Date.now()}`;
    await writeFile(tmp, data);
    await rename(tmp, path);
    await writeFile(path + META_SUFFIX, JSON.stringify(info));
    return info;
  }

  async head(key: string): Promise<StoredObjectInfo | null> {
    const path = this.pathFor(key);
    try {
      const meta = JSON.parse(await readFile(path + META_SUFFIX, "utf8")) as StoredObjectInfo;
      await stat(path);
      return meta;
    } catch {
      return null;
    }
  }

  async get(key: string): Promise<StoredObject | null> {
    const info = await this.head(key);
    if (!info) return null;
    const data = await readFile(this.pathFor(key));
    return { info, data: new Uint8Array(data) };
  }

  async delete(key: string): Promise<boolean> {
    const path = this.pathFor(key);
    const existed = (await this.head(key)) !== null;
    await rm(path, { force: true });
    await rm(path + META_SUFFIX, { force: true });
    return existed;
  }

  async list(prefix: string): Promise<StoredObjectInfo[]> {
    assertValidStoragePrefix(prefix);
    const found: StoredObjectInfo[] = [];
    const walk = async (dir: string): Promise<void> => {
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
        } else if (entry.name.endsWith(META_SUFFIX)) {
          const key = relative(this.root, full.slice(0, -META_SUFFIX.length)).split(sep).join("/");
          if (!key.startsWith(prefix)) continue;
          const info = await this.head(key);
          if (info) found.push(info);
        }
      }
    };
    await walk(this.root);
    return found.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  }

  async signedReadUrl(): Promise<string | null> {
    return null;
  }
}
