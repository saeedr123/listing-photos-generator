// Object storage tests: the interface, the local file adapter, the
// provider registry, and versioned documents. The provider swap test
// follows the rule in docs/architecture.md section 9.4: register a fake
// second provider and show the core still works through the interface.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  InMemoryObjectStorage,
  LocalFileObjectStorage,
  StorageKeyError,
  StorageNotConfiguredError,
  VersionConflictError,
  VersionedDocStore,
  assertValidStorageKey,
  createObjectStorage,
  registerObjectStorageProvider,
  registeredObjectStorageProviders,
  resolveObjectStorageConfig,
  VercelBlobObjectStorage,
} from "../packages/storage/src/index.ts";
import { BlobNotFoundError } from "@vercel/blob";

const bytes = (text) => new TextEncoder().encode(text);

async function exerciseStorage(storage) {
  const info = await storage.put("models/a/one.glb", bytes("hello"), { contentType: "model/gltf-binary" });
  assert.equal(info.bytes, 5);
  assert.equal(info.sha256, "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
  await storage.put("models/b.glb", bytes("b"), { contentType: "model/gltf-binary" });
  await storage.put("textures/t.jpg", bytes("t"), { contentType: "image/jpeg" });
  const got = await storage.get("models/a/one.glb");
  assert.equal(new TextDecoder().decode(got.data), "hello");
  assert.equal(got.info.contentType, "model/gltf-binary");
  assert.deepEqual((await storage.list("models/")).map((i) => i.key), ["models/a/one.glb", "models/b.glb"]);
  assert.equal((await storage.head("models/b.glb")).bytes, 1);
  assert.equal(await storage.head("models/missing.glb"), null);
  assert.equal(await storage.get("models/missing.glb"), null);
  assert.equal(await storage.delete("models/b.glb"), true);
  assert.equal(await storage.delete("models/b.glb"), false);
  assert.deepEqual((await storage.list("models/")).map((i) => i.key), ["models/a/one.glb"]);
  // Overwrite replaces the object and its checksum.
  const again = await storage.put("models/a/one.glb", bytes("changed"), { contentType: "model/gltf-binary" });
  assert.notEqual(again.sha256, info.sha256);
  assert.equal(await storage.signedReadUrl("models/a/one.glb", 60), null);
}

describe("object storage interface", () => {
  it("in memory adapter passes the interface contract", async () => {
    await exerciseStorage(new InMemoryObjectStorage());
  });

  it("local file adapter passes the same contract", async () => {
    const dir = mkdtempSync(join(tmpdir(), "lpg-storage-"));
    try {
      await exerciseStorage(new LocalFileObjectStorage(dir));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects keys that could leave the storage root", async () => {
    const dir = mkdtempSync(join(tmpdir(), "lpg-storage-"));
    try {
      const storage = new LocalFileObjectStorage(dir);
      for (const key of ["../outside.txt", "a/../../b", "/absolute", "a//b", "", "a/./b", "a b", "a\\b", "..", "x/..hidden"]) {
        assert.throws(() => assertValidStorageKey(key), StorageKeyError, key);
        await assert.rejects(() => storage.put(key, bytes("x"), { contentType: "text/plain" }), undefined, key);
      }
      assertValidStorageKey("registry/models/laptop-generic/v000001.json");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("storage provider registry", () => {
  it("development with no provider named uses the local file adapter", () => {
    const config = resolveObjectStorageConfig({ NODE_ENV: "development" }, "/tmp/some-dir");
    assert.equal(config.provider, "local_file");
    assert.equal(config.localDir, "/tmp/some-dir");
  });

  it("production with no provider named is not configured, it never picks one by itself", () => {
    assert.throws(() => resolveObjectStorageConfig({ NODE_ENV: "production" }, "/tmp/some-dir"), StorageNotConfiguredError);
  });

  it("an unregistered provider name throws, it never falls back", () => {
    const config = resolveObjectStorageConfig({ OBJECT_STORAGE_PROVIDER: "not_a_real_provider", NODE_ENV: "production" }, null);
    assert.throws(() => createObjectStorage(config), /not registered/);
  });

  it("a fake second provider registered by name is used through the interface", async () => {
    const calls = [];
    class FakeCloudStorage extends InMemoryObjectStorage {
      constructor() {
        super("fake_cloud");
      }
      async put(key, data, options) {
        calls.push(`put ${key}`);
        return super.put(key, data, options);
      }
    }
    registerObjectStorageProvider("fake_cloud", () => new FakeCloudStorage());
    assert.ok(registeredObjectStorageProviders().includes("fake_cloud"));
    const storage = createObjectStorage(resolveObjectStorageConfig({ OBJECT_STORAGE_PROVIDER: "fake_cloud", NODE_ENV: "production" }, null));
    assert.equal(storage.providerName, "fake_cloud");
    const store = new VersionedDocStore({ storage, collection: "registry/things" });
    await store.saveNewVersion({ id: "thing", version: 1, value: "a" });
    assert.deepEqual(calls, ["put registry/things/thing/v000001.json"]);
    assert.equal((await store.latest("thing")).value, "a");
  });
});

describe("versioned documents", () => {
  const seeds = [{ id: "seeded", version: 1, value: "from the repository" }];

  it("seeds are the baseline and stored versions sit on top", async () => {
    const store = new VersionedDocStore({ storage: new InMemoryObjectStorage(), collection: "registry/docs", seeds });
    assert.equal((await store.latest("seeded")).value, "from the repository");
    await store.saveNewVersion({ id: "seeded", version: 2, value: "edited in admin" });
    assert.equal((await store.latest("seeded")).value, "edited in admin");
    assert.deepEqual((await store.history("seeded")).map((d) => d.version), [1, 2]);
    assert.equal((await store.getVersion("seeded", 1)).value, "from the repository");
  });

  it("a new version must be exactly one above the latest", async () => {
    const store = new VersionedDocStore({ storage: new InMemoryObjectStorage(), collection: "registry/docs", seeds });
    await assert.rejects(() => store.saveNewVersion({ id: "seeded", version: 1, value: "x" }), VersionConflictError);
    await assert.rejects(() => store.saveNewVersion({ id: "seeded", version: 3, value: "x" }), VersionConflictError);
    await assert.rejects(() => store.saveNewVersion({ id: "fresh", version: 2, value: "x" }), VersionConflictError);
    await store.saveNewVersion({ id: "fresh", version: 1, value: "x" });
    assert.deepEqual(await store.ids(), ["fresh", "seeded"]);
    assert.deepEqual((await store.listLatest()).map((d) => d.id), ["fresh", "seeded"]);
  });

  it("history is never overwritten", async () => {
    const storage = new InMemoryObjectStorage();
    const store = new VersionedDocStore({ storage, collection: "registry/docs" });
    await store.saveNewVersion({ id: "doc", version: 1, value: "one" });
    await store.saveNewVersion({ id: "doc", version: 2, value: "two" });
    await store.saveNewVersion({ id: "doc", version: 3, value: "one again" });
    assert.deepEqual((await store.history("doc")).map((d) => d.value), ["one", "two", "one again"]);
    assert.equal((await storage.list("registry/docs/doc/")).length, 3);
  });

  it("rejects an id that is not a safe slug", async () => {
    const store = new VersionedDocStore({ storage: new InMemoryObjectStorage(), collection: "registry/docs" });
    await assert.rejects(() => store.saveNewVersion({ id: "../escape", version: 1 }), /not valid/);
    await assert.rejects(() => store.saveNewVersion({ id: "Has Spaces", version: 1 }), /not valid/);
  });
});

// A fake of the @vercel/blob calls the adapter makes, with the real
// library's behaviour: head throws BlobNotFoundError, get returns null on
// a missing blob, list pages with a cursor. Records every option passed.
function fakeBlobClient() {
  const blobs = new Map();
  const calls = [];
  return {
    calls,
    blobs,
    async put(pathname, body, options) {
      calls.push(["put", pathname, options]);
      blobs.set(pathname, { data: new Uint8Array(body), contentType: options.contentType, uploadedAt: new Date("2026-11-18T12:00:00Z"), access: options.access });
      return { pathname };
    },
    async head(pathname, options) {
      calls.push(["head", pathname, options]);
      const b = blobs.get(pathname);
      if (!b) throw new BlobNotFoundError();
      return { pathname, size: b.data.byteLength, contentType: b.contentType, uploadedAt: b.uploadedAt };
    },
    async get(pathname, options) {
      calls.push(["get", pathname, options]);
      const b = blobs.get(pathname);
      if (!b) return null;
      const stream = new ReadableStream({ start(c) { c.enqueue(b.data.slice(0, 2)); c.enqueue(b.data.slice(2)); c.close(); } });
      return { statusCode: 200, stream, blob: { pathname, size: b.data.byteLength, contentType: b.contentType, uploadedAt: b.uploadedAt } };
    },
    async del(pathname, options) {
      calls.push(["del", pathname, options]);
      blobs.delete(pathname);
    },
    async list(options) {
      calls.push(["list", options.prefix, options]);
      const all = [...blobs.keys()].filter((k) => k.startsWith(options.prefix)).sort().reverse();
      const start = options.cursor ? Number(options.cursor) : 0;
      const pageSize = 1; // force pagination in the test
      const page = all.slice(start, start + pageSize);
      const hasMore = start + pageSize < all.length;
      return { blobs: page.map((k) => ({ pathname: k, size: blobs.get(k).data.byteLength, uploadedAt: blobs.get(k).uploadedAt })), cursor: hasMore ? String(start + pageSize) : undefined, hasMore };
    },
  };
}

describe("Vercel Blob adapter", () => {
  it("passes the same interface contract, through a fake of the Blob calls", async () => {
    const client = fakeBlobClient();
    await exerciseStorage(new VercelBlobObjectStorage({ token: "test-token-not-real", client }));
  });

  it("stores every object private, with no random suffix, and sends the token", async () => {
    const client = fakeBlobClient();
    const storage = new VercelBlobObjectStorage({ token: "test-token-not-real", client });
    await storage.put("registry/models/laptop/v1.json", bytes("{}"), { contentType: "application/json" });
    const [, , options] = client.calls.find((c) => c[0] === "put");
    assert.equal(options.access, "private");
    assert.equal(options.addRandomSuffix, false);
    assert.equal(options.allowOverwrite, true);
    assert.equal(options.token, "test-token-not-real");
    await storage.get("registry/models/laptop/v1.json");
    assert.equal(client.calls.find((c) => c[0] === "get")[2].useCache, false);
    assert.equal(await storage.signedReadUrl("registry/models/laptop/v1.json", 60), null);
  });

  it("is chosen by name from config and refuses to start without a token", () => {
    const config = resolveObjectStorageConfig({ OBJECT_STORAGE_PROVIDER: "vercel_blob", NODE_ENV: "production" }, null);
    assert.equal(config.blobToken, null);
    assert.throws(() => createObjectStorage(config), StorageNotConfiguredError);
    const ok = createObjectStorage(resolveObjectStorageConfig({ OBJECT_STORAGE_PROVIDER: "vercel_blob", BLOB_READ_WRITE_TOKEN: "test-token-not-real", NODE_ENV: "production" }, null));
    assert.equal(ok.providerName, "vercel_blob");
    assert.ok(registeredObjectStorageProviders().includes("vercel_blob"));
  });

  it("rejects unsafe keys before calling Blob", async () => {
    const client = fakeBlobClient();
    const storage = new VercelBlobObjectStorage({ token: "test-token-not-real", client });
    await assert.rejects(() => storage.put("../escape", bytes("x"), { contentType: "text/plain" }), StorageKeyError);
    assert.equal(client.calls.length, 0);
  });

  it("versioned documents work on top of it", async () => {
    const storage = new VercelBlobObjectStorage({ token: "test-token-not-real", client: fakeBlobClient() });
    const docs = new VersionedDocStore({ storage, collection: "registry/docs", seeds: [{ id: "seeded", version: 1, value: "from the repository" }] });
    await docs.saveNewVersion({ id: "seeded", version: 2, value: "edited in admin" });
    await docs.saveNewVersion({ id: "fresh", version: 1, value: "x" });
    assert.equal((await docs.latest("seeded")).value, "edited in admin");
    assert.deepEqual((await docs.history("seeded")).map((d) => d.version), [1, 2]);
    assert.deepEqual(await docs.ids(), ["fresh", "seeded"]);
    await assert.rejects(() => docs.saveNewVersion({ id: "seeded", version: 2, value: "again" }), VersionConflictError);
  });
});
