// Integration tests for the Wave 2 merge points. No live database, no
// real secrets, no live site. Prisma adapters are tested against
// in memory test doubles that implement the same delegate methods a
// real PrismaClient would expose, clearly marked as test doubles.

import { describe, expect, it, afterAll } from "vitest";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import rootCopy from "../config/site-copy.json";
import { siteCopy } from "../apps/web/src/config/site-copy.ts";
import { builderPackToDbRows, dbRowsToBuilderPack } from "../packages/builder/src/db-adapter.ts";
import { InMemoryPackStore, PackService } from "../packages/builder/src/packs.ts";
import { createRealExportRunner } from "../packages/builder/src/export-runner.ts";
import { PrismaPackStore } from "../packages/builder/src/prisma-pack-store.ts";
import type { PrismaPackClient } from "../packages/builder/src/prisma-pack-store.ts";
import { maidOfHonorFacts } from "../packages/builder/src/test-product.ts";
import { AuthService } from "../packages/auth/src/auth-service.ts";
import { PrismaAuthProvider } from "../packages/auth/src/prisma-provider.ts";
import type { PrismaAuthClient } from "../packages/auth/src/prisma-provider.ts";
import { loadRootConfig } from "../packages/admin/src/root-config.ts";

const repoRoot = new URL("..", import.meta.url).pathname;

describe("merge (a): copy single source", () => {
  it("the builder supplement reads the root config, it is not a second copy", () => {
    expect(siteCopy.builder.heading).toBe(rootCopy.builder.heading);
    expect(siteCopy.auth.loginHeading).toBe(rootCopy.auth.loginHeading);
    expect(siteCopy.profile.heading).toBe(rootCopy.profile.heading);
    expect(siteCopy.settings.deletionHeading).toBe(rootCopy.settings.deletionHeading);
    expect(siteCopy.share.heading).toBe(rootCopy.share.heading);
    expect(siteCopy.errors.packNotFound).toBe(rootCopy.errors.packNotFound);
    expect(siteCopy.brand).toBe(rootCopy.brand.name);
    expect(siteCopy.demoNotice).toBe(rootCopy.demoNotice);
  });
});

describe("merge (b): builder working shape to flat DB row shape", () => {
  it("round trips facts, copy, and template ids without inventing values", () => {
    const packs = new PackService(new InMemoryPackStore());
    return packs.createPack({ userId: "u-1", edition: "listing-photos-generator", productFacts: { ...maidOfHonorFacts }, nichePackId: "wedding-and-events", useSampleContent: false }).then((pack) => {
      pack.templateIds = ["hero", "features-grid"];
      pack.mockupIds = ["laptop-alone"];
      pack.copy.title = "Maid of Honor Planner, 12 tabs, Google Sheets";
      pack.copy.description = "A 12 tab planner in Google Sheets.";
      const rows = builderPackToDbRows(pack, { platformId: "platform-uuid-etsy", packVersionId: "pack-version-uuid-1", nichePackId: null, nichePackVersionId: null, templateIdBySlug: (slug) => "template-uuid-" + slug });
      expect(rows.listingPack.platform_id).toBe("platform-uuid-etsy");
      expect(rows.listingPack.template_id).toBe("template-uuid-hero");
      expect(rows.extra.templateIds).toEqual(["hero", "features-grid"]);
      expect(rows.facts.find((f) => f.fact_key === "tab_count")?.fact_value_number).toBe(12);
      expect(rows.facts.filter((f) => f.fact_key === "claim").length).toBe(3);
      const back = dbRowsToBuilderPack({ listingPack: rows.listingPack, product: rows.product, facts: rows.facts, copy: rows.copy, images: rows.images, files: [], extraTemplateIds: rows.extra.templateIds, extraMockupIds: rows.extra.mockupIds, hasSampleContent: false, platformSlug: "etsy", packVersionSlug: "etsy_digital_v1" });
      expect(back.productFacts.tabCount).toBe(12);
      expect(back.productFacts.priceListMinor).toBe(1397);
      expect(back.copy.title).toBe("Maid of Honor Planner, 12 tabs, Google Sheets");
      expect(back.templateIds).toEqual(["hero", "features-grid"]);
      expect(back.mockupIds).toEqual(["laptop-alone"]);
    });
  });

  it("a null tab count writes no fact row, never an invented value", () => {
    const pack = { id: "p-1", userId: "u-1", productId: "prod-1", productFacts: { ...maidOfHonorFacts, tabCount: null }, platformId: "etsy", packVersionId: "etsy_digital_v1", nichePackId: null, nichePackVersionId: null, templateIds: [], mockupIds: [], copy: { title: "", description: "", tags: [], checklist: [], claimsShown: [], generationStatus: "draft" as const }, images: [], files: [], status: "draft" as const, language: "en", edition: "listing-photos-generator" as const, hasSampleContent: false, createdAt: "2026-11-07T00:00:00.000Z", updatedAt: "2026-11-07T00:00:00.000Z", deletedAt: null };
    const rows = builderPackToDbRows(pack, { platformId: "platform-uuid-etsy", packVersionId: "pack-version-uuid-1", nichePackId: null, nichePackVersionId: null, templateIdBySlug: () => null });
    expect(rows.facts.some((f) => f.fact_key === "tab_count")).toBe(false);
  });
});

describe("merge (c): admin reads the root config at build time", () => {
  it("loads plans, niche packs, and the Etsy pack from config, not a mirror", () => {
    const config = loadRootConfig(repoRoot);
    expect((config.plans as { trial: { duration_days: number } }).trial.duration_days).toBe(7);
    expect((config.nichePacks as { packs: unknown[] }).packs.length).toBe(3);
    expect(config.platformPacks.some((p) => p.file === "etsy.v1.json")).toBe(true);
  });
});

describe("merge (d): Prisma adapters round trip with a test double, no live Postgres", () => {
  it("auth register and login work through the Prisma provider", async () => {
    const users = new Map<string, Record<string, unknown>>();
    const sessions = new Map<string, Record<string, unknown>>();
    const client: PrismaAuthClient = {
      user: {
        create: async ({ data }) => { const row = { id: "user-1", email: data["email"], name: data["name"] ?? null, password_hash: data["password_hash"], role: "user", edition: data["edition"], email_verified_at: null, locale: "en", created_at: new Date(), updated_at: new Date(), deleted_at: null }; users.set(String(data["email"]), row); return row as never; },
        findUnique: async ({ where }) => { const found = [...users.values()].find((u) => u["email"] === where["email"] || u["id"] === where["id"]) ?? null; return found as never; },
        update: async ({ where, data }) => { const row = [...users.values()].find((u) => u["id"] === where["id"]) as Record<string, unknown>; Object.assign(row, data); return row as never; },
      },
      authIdentity: { create: async () => ({ id: "identity-1" }) },
      session: {
        create: async ({ data }) => { const row = { id: "session-1", user_id: data["user_id"], session_token_hash: data["session_token_hash"], expires_at: data["expires_at"], last_seen_at: null, created_at: new Date(), revoked_at: null }; sessions.set(String(data["session_token_hash"]), row); return row as never; },
        findUnique: async ({ where }) => (sessions.get(String(where["session_token_hash"])) ?? null) as never,
        update: async ({ where, data }) => { const row = [...sessions.values()].find((s) => s["id"] === where["id"]) as Record<string, unknown>; Object.assign(row, data); return row as never; },
        updateMany: async () => ({ count: 0 }),
      },
    };
    const auth = new AuthService({ provider: new PrismaAuthProvider(client) });
    const registered = await auth.register({ email: "prisma@example.com", password: "a strong password", name: "Prisma Seller" }, "127.0.0.1");
    expect(registered.ok).toBe(true);
    const stored = users.get("prisma@example.com") as Record<string, unknown>;
    expect(String(stored["password_hash"])).not.toContain("a strong password");
    const loggedIn = await auth.login({ email: "prisma@example.com", password: "a strong password" }, "127.0.0.1");
    expect(loggedIn.ok).toBe(true);
    const session = await auth.getSession(loggedIn.sessionToken as string);
    expect(session?.user.email).toBe("prisma@example.com");
  });

  it("pack save and read work through the Prisma pack store", async () => {
    const listingPacks = new Map<string, Record<string, unknown>>();
    const products = new Map<string, Record<string, unknown>>();
    let facts: Record<string, unknown>[] = [];
    const copies = new Map<string, Record<string, unknown>>();
    const versions: Record<string, unknown>[] = [];
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
      listingPackCopyVersion: {
        create: async ({ data }) => { const row = { ...data, id: "version-1", created_at: new Date() }; versions.push(row); return row; },
        findMany: async ({ where }) => versions.filter((v) => v["listing_pack_copy_id"] === where["listing_pack_copy_id"]),
      },
      export: { create: async ({ data }) => data, findMany: async () => [] },
      accountDeletionRequest: { create: async ({ data }) => data, findUnique: async () => null, update: async ({ data }) => data },
    };
    const store = new PrismaPackStore(client, { resolution: { platformId: "platform-uuid-etsy", packVersionId: "pack-version-uuid-1", nichePackId: null, nichePackVersionId: null, templateIdBySlug: (slug) => "template-uuid-" + slug }, platformSlug: "etsy", packVersionSlug: "etsy_digital_v1" });
    const packs = new PackService(store);
    const pack = await packs.createPack({ userId: "u-prisma", edition: "listing-photos-generator", productFacts: { ...maidOfHonorFacts }, nichePackId: null, useSampleContent: false });
    pack.templateIds = ["hero"];
    pack.copy.title = "Maid of Honor Planner, 12 tabs, Google Sheets";
    pack.copy.description = "A 12 tab planner in Google Sheets.";
    await packs.savePack(pack, "u-prisma", "Edited title");
    const read = await packs.getPack(pack.id);
    expect(read?.productFacts.tabCount).toBe(12);
    expect(read?.copy.title).toBe("Maid of Honor Planner, 12 tabs, Google Sheets");
    expect(read?.templateIds).toEqual(["hero"]);
  });
});

describe("merge (e): real export engine wired into the builder export flow", () => {
  const outRoot = join(repoRoot, "tests", ".tmp-merge-export");
  afterAll(() => { rmSync(outRoot, { recursive: true, force: true }); });
  it("a passing pack exports with the real engine and a failing runner preserves the pack", async () => {
    const fixture = JSON.parse(readFileSync(join(repoRoot, "tests", "fixtures", "maid-of-honor-facts.json"), "utf8")) as { tabNames: string[] };
    const runner = createRealExportRunner({
      templatesDir: join(repoRoot, "packages", "template-engine", "templates"),
      mockupsDir: join(repoRoot, "packages", "mockup-engine", "mockups"),
      outputDir: outRoot,
      proofMode: true,
      tabNames: fixture.tabNames,
      renderWidthPx: 3000,
      renderHeightPx: 2000,
    });
    const packs = new PackService(new InMemoryPackStore(), undefined, { exportRunner: runner });
    const pack = await packs.createPack({ userId: "u-export", edition: "listing-photos-generator", productFacts: { ...maidOfHonorFacts }, nichePackId: "wedding-and-events", useSampleContent: false });
    pack.templateIds = ["hero"];
    pack.copy.title = "Maid of Honor Planner, 12 tabs, Google Sheets";
    pack.copy.description = "A 12 tab planner in Google Sheets.";
    pack.copy.tags = ["maid of honor"];
    pack.copy.checklist = ["Check the tab count matches the real product."];
    await packs.savePack(pack, "u-export", "Ready to export");
    const result = await packs.requestExport(pack.id, "u-export", "full_pack");
    expect(result?.record.status).toBe("ready");
    expect(result?.record.imageCount).toBe(1);
    expect(existsSync(join(outRoot, pack.id, "01-hero.jpg"))).toBe(true);
    expect(existsSync(join(outRoot, pack.id, "manifest.json"))).toBe(true);
    const manifest = JSON.parse(readFileSync(join(outRoot, pack.id, "manifest.json"), "utf8")) as { proofMode: boolean };
    expect(manifest.proofMode).toBe(true);
    const stillThere = await packs.getPack(pack.id);
    expect(stillThere?.id).toBe(pack.id);

    const failing = new PackService(new InMemoryPackStore(), undefined, { exportRunner: async () => { throw new Error("Export failed while drawing the images."); } });
    const pack2 = await failing.createPack({ userId: "u-export", edition: "listing-photos-generator", productFacts: { ...maidOfHonorFacts }, nichePackId: null, useSampleContent: false });
    pack2.templateIds = ["hero"];
    pack2.copy.title = "Maid of Honor Planner, 12 tabs, Google Sheets";
    pack2.copy.description = "A 12 tab planner in Google Sheets.";
    await failing.savePack(pack2, "u-export", "Ready");
    const failed = await failing.requestExport(pack2.id, "u-export", "full_pack");
    expect(failed?.record.status).toBe("failed");
    expect(failed?.record.errorMessage).toMatch(/not changed/);
    expect((await failing.getPack(pack2.id))?.id).toBe(pack2.id);
  });
});
