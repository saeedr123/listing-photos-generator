// End to end flow test: the same steps a seller takes in the builder, run
// against the services the UI calls. Register, create a profile, create a
// pack from the test product, run reconciliation, fix a mismatch, export,
// share a read only link, and confirm a second user cannot open the pack.

import test from "node:test";
import assert from "node:assert/strict";
import { AuthService } from "../../../auth/src/auth-service.ts";
import { LocalStubAuthProvider } from "../../../auth/src/stub-provider.ts";
import { InMemoryAuditStore, newAuditEvent } from "../../../auth/src/audit.ts";
import { canEditPack, canViewPack } from "../access-control.ts";
import { InMemoryPackStore, PackService } from "../packs.ts";
import { createShareLink, InMemoryShareLinkStore, resolveShareLink, revokeShareLink, addReviewComment } from "../share-link.ts";
import { maidOfHonorFacts } from "../test-product.ts";
import { clearSampleContent } from "../sample-content.ts";

test("full seller flow: register, pack, reconcile, fix, export, share", async () => {
  const audit = new InMemoryAuditStore();
  const auth = new AuthService({
    provider: new LocalStubAuthProvider({ defaultEdition: "listing-photos-generator" }),
    auditStore: audit,
  });
  const packs = new PackService(
    new InMemoryPackStore(),
    async (input) => {
      await audit.append(
        newAuditEvent({
          actorId: input.actorId,
          actorRole: input.actorRole,
          action: input.action as "export.failed",
          targetType: input.targetType,
          targetId: input.targetId,
          reason: input.reason ?? null,
          detail: input.detail ?? {},
        }),
      );
    },
  );
  const shares = new InMemoryShareLinkStore();

  // 1. Register and sign in.
  const registered = await auth.register({ email: "flow@example.com", password: "a strong password", name: "Flow Seller" }, "127.0.0.1");
  assert.equal(registered.ok, true);
  const sellerId = registered.user?.id as string;

  // 2. Create a pack from the real test product facts.
  const pack = await packs.createPack({
    userId: sellerId,
    edition: "listing-photos-generator",
    productFacts: { ...maidOfHonorFacts },
    nichePackId: "wedding-and-events",
    useSampleContent: false,
  });
  assert.equal(pack.status, "draft");
  assert.equal(pack.productFacts.tabCount, 12);

  // 3. Seller edits the copy and types a wrong tab count. Reconciliation
  //    must catch it and block export.
  pack.copy.title = "Maid of Honor Planner, 20 tabs, Google Sheets";
  pack.copy.description = "A 20 tab planner in Google Sheets.";
  pack.copy.claimsShown = ["12 interactive tabs"];
  await packs.savePack(pack, sellerId, "Edited title");
  const blocked = await packs.runReconciliation(pack.id);
  assert.equal(blocked?.canExport, false);
  const exportBlocked = await packs.requestExport(pack.id, sellerId, "full_pack");
  assert.equal(exportBlocked?.record.status, "failed");
  assert.match(exportBlocked?.record.errorMessage ?? "", /blocked/);

  // 4. Seller fixes the copy to the real count. Export is now allowed.
  pack.copy.title = "Maid of Honor Planner, 12 tabs, Google Sheets";
  pack.copy.description = "A 12 tab planner in Google Sheets.";
  await packs.savePack(pack, sellerId, "Fixed tab count");
  const passed = await packs.runReconciliation(pack.id);
  assert.equal(passed?.canExport, true);
  const exportOk = await packs.requestExport(pack.id, sellerId, "full_pack");
  assert.equal(exportOk?.record.status, "queued");
  assert.equal(exportOk?.record.shortestSidePx, 2000);
  assert.equal(exportOk?.record.fileFormat, "jpg");

  // 5. Version history: two saves plus creation plus restores are recorded.
  const versions = await packs.listVersions(pack.id);
  assert.ok(versions.length >= 3);
  const restored = await packs.restoreVersion(pack.id, 1, sellerId);
  assert.ok(restored);
  assert.equal((restored as { copy: { title: string } }).copy.title, "");

  // 6. Share link: read only, viewable, commentable, revocable.
  const created = await createShareLink(shares, { listingPackId: pack.id, userId: sellerId, purpose: "review", expiresInDays: 30 });
  assert.ok(created.token.length > 20);
  assert.notEqual(created.link.tokenHash, created.token);
  const resolved = await resolveShareLink(shares, created.token);
  assert.equal(resolved?.usable, true);
  assert.equal(resolved?.link.viewCount, 1);
  const comment = await addReviewComment(shares, { shareLinkId: created.link.id, listingPackId: pack.id, authorLabel: "Partner", text: "Title looks clear." });
  assert.equal(comment.text, "Title looks clear.");
  assert.equal(await revokeShareLink(shares, created.link.tokenHash), true);
  const afterRevoke = await resolveShareLink(shares, created.token);
  assert.equal(afterRevoke?.usable, false);

  // 7. A second user cannot view or edit the pack.
  const other = await auth.register({ email: "other@example.com", password: "a strong password" }, "127.0.0.1");
  const otherId = other.user?.id as string;
  assert.equal(canViewPack({ id: otherId, role: "user" }, pack), false);
  assert.equal(canEditPack({ id: otherId, role: "user" }, pack), false);
  assert.equal(canViewPack({ id: sellerId, role: "user" }, pack), true);

  // 8. Audit log holds the export failure, with time, actor, and action,
  //    and no product content.
  const events = await audit.list();
  const failed = events.find((e) => e.action === "export.failed");
  assert.ok(failed);
  assert.equal(failed?.actorId, sellerId);
  assert.ok(JSON.stringify(failed?.detail ?? {}).includes("full_pack"));
});

test("sample pack cannot export until sample content is replaced in one action", async () => {
  const packs = new PackService(new InMemoryPackStore());
  const pack = await packs.createPack({
    userId: "u-sample",
    edition: "listing-photos-generator",
    productFacts: maidOfHonorFacts,
    nichePackId: null,
    useSampleContent: true,
  });
  assert.equal(pack.hasSampleContent, true);
  const blocked = await packs.requestExport(pack.id, "u-sample", "full_pack");
  assert.equal(blocked?.record.status, "failed");

  const cleared = clearSampleContent(pack.copy, pack.productFacts);
  pack.copy = cleared.copy;
  pack.productFacts = { ...cleared.facts, ...maidOfHonorFacts, claims: [] };
  pack.productFacts.productName = "Maid of Honor Planner";
  pack.copy.title = "Maid of Honor Planner, 12 tabs, Google Sheets";
  pack.copy.description = "A 12 tab planner in Google Sheets.";
  pack.hasSampleContent = false;
  await packs.savePack(pack, "u-sample", "Replaced sample content");
  const passed = await packs.runReconciliation(pack.id);
  assert.equal(passed?.canExport, true);
});

test("account deletion request is recorded with a completion record", async () => {
  const packs = new PackService(new InMemoryPackStore());
  const request = await packs.requestAccountDeletion("u-del", "user", "Closing my shop.");
  assert.equal(request.status, "requested");
  const completed = await packs.completeAccountDeletion(request.id, "system");
  assert.equal(completed?.status, "hard_deleted");
  assert.ok(completed?.hardDeletedAt);
  assert.match(completed?.completionNote ?? "", /deleted on request/);
});
