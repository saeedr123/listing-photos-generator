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
} from "../packages/storage/src/index.ts";

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
