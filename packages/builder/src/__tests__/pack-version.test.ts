// PackVersion separation tests. Run with: node --test "src/__tests__/*.test.ts"
// Uses only Node built-ins and the package itself. No live database, no
// real secrets. The Prisma client is a test double with two separate in
// memory tables, one per version table, so a test can prove a pack level
// row never lands in the copy level table and the reverse.

import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryPackStore, PackService } from "../packs.ts";
import { PrismaPackStore } from "../prisma-pack-store.ts";
import type { PrismaPackClient } from "../prisma-pack-store.ts";
import { PrismaPackVersionStore } from "../pack-version-store.ts";
import { maidOfHonorFacts } from "../test-product.ts";
import type { ListingPack, PackVersion } from "../types.ts";

const RESOLUTION = {
  platformId: "platform-uuid-etsy",
  packVersionId: "pack-version-uuid-1",
  nichePackId: null,
  nichePackVersionId: null,
  templateIdBySlug: (slug: string) => "template-uuid-" + slug,
};

function samplePackVersion(overrides: Partial<PackVersion> = {}): PackVersion {
  const pack = {
    id: "pack-1",
    userId: "u-1",
    productId: "prod-1",
    productFacts: { ...maidOfHonorFacts },
    platformId: "etsy",
    packVersionId: "etsy_digital_v1",
    nichePackId: null,
    nichePackVersionId: null,
    templateIds: ["hero"],
    mockupIds: [],
    copy: { title: "Maid of Honor Planner, 12 tabs, Google Sheets", description: "A 12 tab planner in Google Sheets.", tags: [], checklist: [], claimsShown: [], generationStatus: "draft" as const },
    images: [],
    files: [],
    status: "draft" as const,
    language: "en",
    edition: "listing-photos-generator" as const,
    hasSampleContent: false,
    createdAt: "2026-11-07T00:00:00.000Z",
    updatedAt: "2026-11-07T00:00:00.000Z",
    deletedAt: null,
  } as ListingPack;
  return {
    id: "pv-1",
    listingPackId: "pack-1",
    versionNumber: 1,
    snapshot: pack,
    createdByUserId: "u-1",
    createdAt: "2026-11-07T00:00:00.000Z",
    note: "Pack created",
    ...overrides,
  };
}

// Two separate tables, as in Postgres. A row written to one must never
// appear in the other, even when the version numbers match.
function makeTables() {
  const packVersionRows: Record<string, unknown>[] = [];
  const copyVersionRows: Record<string, unknown>[] = [];
  const listingPacks = new Map<string, Record<string, unknown>>();
  const products = new Map<string, Record<string, unknown>>();
  let facts: Record<string, unknown>[] = [];
  const copies = new Map<string, Record<string, unknown>>();
  const client: PrismaPackClient = {
    listingPack: {
      upsert: async ({ create }) => { listingPacks.set(String(create["id"]), create); return create; },
      findUnique: async ({ where }) => (listingPacks.get(String(where["id"])) ?? null),
      findMany: async ({ where }) => [...listingPacks.values()].filter((r) => r["user_id"] === where["user_id"]),
    },
    product: {
      upsert: async ({ create }) => { products.set(String(create["id"]), create); return create; },
      findUnique: async ({ where }) => (products.get(String(where["id"])) ?? null),
    },
    productVerifiedFact: {
      deleteMany: async () => { facts = []; return { count: 0 }; },
      create: async ({ data }) => { facts.push(data); return data; },
      findMany: async ({ where }) => facts.filter((f) => f["product_id"] === where["product_id"]),
    },
    listingPackCopy: {
      upsert: async ({ create }) => { copies.set(String(create["listing_pack_id"]), create); return create; },
      findUnique: async ({ where }) => (copies.get(String(where["listing_pack_id"])) ?? null),
    },
    packVersion: {
      create: async ({ data }) => { const row = { ...data, id: "pv-row-" + (packVersionRows.length + 1), created_at: new Date() }; packVersionRows.push(row); return row; },
      findMany: async ({ where }) => packVersionRows.filter((r) => r["listing_pack_id"] === where["listing_pack_id"]).sort((a, b) => Number(a["version_number"]) - Number(b["version_number"])),
      findUnique: async ({ where }) => {
        const key = where["listing_pack_id_version_number"] as { listing_pack_id: string; version_number: number } | undefined;
        return packVersionRows.find((r) => r["listing_pack_id"] === key?.listing_pack_id && r["version_number"] === key?.version_number) ?? null;
      },
    },
    export: { create: async ({ data }) => data, findMany: async () => [] },
    accountDeletionRequest: { create: async ({ data }) => data, findUnique: async () => null, update: async ({ data }) => data },
  };
  // Copy level writer, standing in for the copy worker. It touches only
  // the copy version table, never the pack version table.
  const copyVersionWriter = {
    create: async (data: Record<string, unknown>) => {
      const row = { ...data, id: "copy-version-" + (copyVersionRows.length + 1), created_at: new Date() };
      copyVersionRows.push(row);
      return row;
    },
    findMany: async (where: Record<string, unknown>) => copyVersionRows.filter((r) => r["listing_pack_copy_id"] === where["listing_pack_copy_id"]),
  };
  return { client, packVersionRows, copyVersionRows, copyVersionWriter };
}

test("pack saves write pack versions only to PackVersion, never to the copy table", async () => {
  const { client, packVersionRows, copyVersionRows } = makeTables();
  const packs = new PackService(new PrismaPackStore(client, { resolution: RESOLUTION, platformSlug: "etsy", packVersionSlug: "etsy_digital_v1" }));
  const pack = await packs.createPack({ userId: "u-1", edition: "listing-photos-generator", productFacts: { ...maidOfHonorFacts }, nichePackId: null, useSampleContent: false });
  pack.copy.title = "Maid of Honor Planner, 12 tabs, Google Sheets";
  pack.copy.description = "A 12 tab planner in Google Sheets.";
  await packs.savePack(pack, "u-1", "Edited title");
  assert.equal(packVersionRows.length, 2);
  assert.equal(copyVersionRows.length, 0);
  assert.equal(packVersionRows[0]?.["listing_pack_id"], pack.id);
  assert.equal(packVersionRows[1]?.["change_note"], "Edited title");
  const versions = await packs.listVersions(pack.id);
  assert.equal(versions.length, 2);
  assert.equal(versions[1]?.note, "Edited title");
});

test("a copy version row never appears in pack versions, even with the same version number", async () => {
  const { client, packVersionRows, copyVersionRows, copyVersionWriter } = makeTables();
  const packs = new PackService(new PrismaPackStore(client, { resolution: RESOLUTION, platformSlug: "etsy", packVersionSlug: "etsy_digital_v1" }));
  const pack = await packs.createPack({ userId: "u-1", edition: "listing-photos-generator", productFacts: { ...maidOfHonorFacts }, nichePackId: null, useSampleContent: false });
  // The copy worker writes copy version 1 for this pack's copy row.
  await copyVersionWriter.create({ listing_pack_copy_id: pack.id, version_number: 1, snapshot_json: { title: "Copy only snapshot" }, status: "draft", created_by_user_id: "u-1" });
  // A second pack save writes pack version 2. Same number 1 already exists
  // in the copy table, but the tables are separate, so nothing collides.
  await packs.savePack(pack, "u-1", "Second pack save");
  assert.equal(packVersionRows.length, 2);
  assert.equal(copyVersionRows.length, 1);
  const versions = await packs.listVersions(pack.id);
  assert.equal(versions.length, 2);
  assert.ok(versions.every((v) => v.listingPackId === pack.id));
  assert.ok(!versions.some((v) => (v.snapshot as unknown as { title?: string }).title === "Copy only snapshot"));
  const copyRows = await copyVersionWriter.findMany({ listing_pack_copy_id: pack.id });
  assert.equal(copyRows.length, 1);
  assert.equal(copyRows[0]?.["version_number"], 1);
});

test("PrismaPackVersionStore round trips the whole pack snapshot, note, and lookup by number", async () => {
  const { client, packVersionRows } = makeTables();
  const store = new PrismaPackVersionStore(client);
  await store.createPackVersion(samplePackVersion());
  await store.createPackVersion(samplePackVersion({ id: "pv-2", versionNumber: 2, note: "" }));
  assert.equal(packVersionRows.length, 2);
  // An empty note is stored as null, never as an invented note.
  assert.equal(packVersionRows[1]?.["change_note"], null);
  const listed = await store.listPackVersions("pack-1");
  assert.equal(listed.length, 2);
  assert.equal(listed[0]?.note, "Pack created");
  assert.equal(listed[1]?.note, "");
  // The snapshot is the whole pack, not just the copy.
  assert.equal(listed[0]?.snapshot.copy.title, "Maid of Honor Planner, 12 tabs, Google Sheets");
  assert.equal(listed[0]?.snapshot.productFacts.tabCount, 12);
  assert.deepEqual(listed[0]?.snapshot.templateIds, ["hero"]);
  const second = await store.getPackVersion("pack-1", 2);
  assert.equal(second?.versionNumber, 2);
  assert.equal(await store.getPackVersion("pack-1", 99), null);
  assert.equal((await store.latestPackVersion("pack-1"))?.versionNumber, 2);
  assert.equal(await store.latestPackVersion("missing-pack"), null);
});

test("InMemoryPackStore and PrismaPackStore agree on version order for the same saves", async () => {
  const { client } = makeTables();
  const viaPrisma = new PackService(new PrismaPackStore(client, { resolution: RESOLUTION, platformSlug: "etsy", packVersionSlug: "etsy_digital_v1" }));
  const viaMemory = new PackService(new InMemoryPackStore());
  const packA = await viaPrisma.createPack({ userId: "u-1", edition: "listing-photos-generator", productFacts: { ...maidOfHonorFacts }, nichePackId: null, useSampleContent: false });
  await viaPrisma.savePack(packA, "u-1", "Second");
  const packB = await viaMemory.createPack({ userId: "u-1", edition: "listing-photos-generator", productFacts: { ...maidOfHonorFacts }, nichePackId: null, useSampleContent: false });
  await viaMemory.savePack(packB, "u-1", "Second");
  const a = await viaPrisma.listVersions(packA.id);
  const b = await viaMemory.listVersions(packB.id);
  assert.deepEqual(a.map((v) => [v.versionNumber, v.note]), b.map((v) => [v.versionNumber, v.note]));
});
