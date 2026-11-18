// Integration tests against a real PostgreSQL database.
//
// Skipped unless DATABASE_URL is set and the Prisma client is generated.
// Point DATABASE_URL at a THROWAWAY database: these tests create users,
// packs and exports. Migrations must be applied first:
//   npx prisma migrate deploy --schema prisma/schema.prisma
//
// What they prove: the auth provider and the pack store work against
// the real schema, with the real generated client, not only against
// test doubles.

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

const DATABASE_URL = process.env.DATABASE_URL || "";
let PrismaClient = null;
try {
  ({ PrismaClient } = await import("@prisma/client"));
} catch {
  PrismaClient = null;
}
const enabled = Boolean(DATABASE_URL && PrismaClient);

const { AuthService } = await import("../packages/auth/src/auth-service.ts");
const { PrismaAuthProvider } = await import("../packages/auth/src/prisma-provider.ts");
const { PackService } = await import("../packages/builder/src/packs.ts");
const { PrismaPackStore } = await import("../packages/builder/src/prisma-pack-store.ts");
const { seedReferenceData } = await import("../packages/builder/src/reference-seed.ts");
const { maidOfHonorFacts } = await import("../packages/builder/src/test-product.ts");

const definition = JSON.parse(readFileSync(new URL("../config/platform-packs/etsy.v1.json", import.meta.url), "utf8"));
const unique = () => randomUUID().slice(0, 8);

describe("real database", { skip: !enabled && "DATABASE_URL not set or Prisma client not generated" }, () => {
  let prisma;
  let auth;
  let adminId;
  let resolution;

  before(async () => {
    prisma = new PrismaClient();
    auth = new AuthService({ provider: new PrismaAuthProvider(prisma) });
    const admin = await auth.register({ email: `admin-${unique()}@example.test`, password: "Integration-Test-Pass-1" }, "127.0.0.1");
    assert.equal(admin.ok, true, admin.message);
    adminId = admin.user.id;
    resolution = await seedReferenceData(prisma, { definition, platformName: "Etsy", createdByUserId: adminId });
  });

  after(async () => {
    await prisma?.$disconnect();
  });

  it("the reference seed is idempotent", async () => {
    const again = await seedReferenceData(prisma, { definition, platformName: "Etsy", createdByUserId: adminId });
    assert.equal(again.platformId, resolution.platformId);
    assert.equal(again.packVersionId, resolution.packVersionId);
  });

  it("register, log in, read the session, log out", async () => {
    const email = `seller-${unique()}@example.test`;
    const registered = await auth.register({ email, password: "Integration-Test-Pass-1" }, "10.0.0.1");
    assert.equal(registered.ok, true, registered.message);
    const duplicate = await auth.register({ email, password: "Integration-Test-Pass-1" }, "10.0.0.2");
    assert.equal(duplicate.ok, false);
    const wrong = await auth.login({ email, password: "wrong-password-123" }, "10.0.0.3");
    assert.equal(wrong.ok, false);
    const login = await auth.login({ email, password: "Integration-Test-Pass-1" }, "10.0.0.3");
    assert.equal(login.ok, true, login.message);
    const session = await auth.getSession(login.sessionToken);
    assert.equal(session?.user.email, email);
    // The token itself is never stored, only its hash.
    const stored = await prisma.session.findMany({ where: { user_id: registered.user.id } });
    assert.ok(stored.length >= 1);
    assert.ok(stored.every((row) => row.session_token_hash !== login.sessionToken));
    await auth.logout(login.sessionToken);
    assert.equal(await auth.getSession(login.sessionToken), null);
  });

  it("create, save, read back and list a pack, with version history", async () => {
    const seller = await auth.register({ email: `packs-${unique()}@example.test`, password: "Integration-Test-Pass-1" }, "10.0.1.1");
    const packs = new PackService(new PrismaPackStore(prisma, { resolution }));
    const pack = await packs.createPack({ userId: seller.user.id, edition: "listing-photos-generator", productFacts: { ...maidOfHonorFacts }, nichePackId: null, useSampleContent: false });
    pack.copy.title = "Maid of Honor Planner, 12 tabs, Google Sheets";
    pack.copy.description = "A 12 tab planner in Google Sheets.";
    pack.copy.tags = ["maid of honor"];
    pack.templateIds = ["hero", "features-grid"];
    await packs.savePack(pack, seller.user.id, "Copy added");

    const read = await packs.getPack(pack.id);
    assert.ok(read, "pack reads back");
    assert.equal(read.userId, seller.user.id);
    assert.equal(read.copy.title, pack.copy.title);
    assert.deepEqual(read.copy.tags, ["maid of honor"]);
    assert.equal(read.productFacts.tabCount, maidOfHonorFacts.tabCount);
    assert.deepEqual(read.templateIds, ["hero", "features-grid"]);
    const versions = await packs.listVersions(pack.id);
    assert.deepEqual(versions.map((v) => v.versionNumber), [1, 2]);
    const list = await packs.listPacks(seller.user.id);
    assert.deepEqual(list.map((p) => p.id), [pack.id]);
  });

  it("an export stores its reconciliation check and points at it", async () => {
    const seller = await auth.register({ email: `export-${unique()}@example.test`, password: "Integration-Test-Pass-1" }, "10.0.2.1");
    const packs = new PackService(new PrismaPackStore(prisma, { resolution }), undefined, { exportRunner: async () => ({ imageCount: 7 }) });
    const pack = await packs.createPack({ userId: seller.user.id, edition: "listing-photos-generator", productFacts: { ...maidOfHonorFacts }, nichePackId: null, useSampleContent: false });
    pack.copy.title = "Maid of Honor Planner, 12 tabs, Google Sheets";
    await packs.savePack(pack, seller.user.id, "Ready");
    const result = await packs.requestExport(pack.id, seller.user.id, "full_pack");
    assert.ok(result);
    const rows = await prisma.export.findMany({ where: { listing_pack_id: pack.id } });
    assert.equal(rows.length, 1);
    const check = await prisma.reconciliationCheck.findUnique({ where: { id: rows[0].reconciliation_check_id } });
    assert.ok(check, "the export points at a stored check");
    assert.equal(check.listing_pack_id, pack.id);
    const exports = await packs.listExports(pack.id);
    assert.equal(exports.length, 1);
    assert.equal(exports[0].status, result.record.status);
  });
});
