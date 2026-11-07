// Admin package tests: versioning, feature flags, governance, licence
// gate, entitlements, analytics, and export monitoring. No live
// database, no real secrets, no product content in any assertion.

import test from "node:test";
import assert from "node:assert/strict";
import { nextVersion, publishVersion, rollbackVersion, onlyOnePublished } from "../versioning.ts";
import type { VersionedItem } from "../versioning.ts";
import { isEnabled, setFlag } from "../feature-flags.ts";
import { checkPackGovernance } from "../governance.ts";
import { checkLicence, validateMockupAddFlow } from "../licence.ts";
import { validatePlanChange, validateTrialChange, freePlanKeepsOnePack } from "../entitlements.ts";
import { summarizeUsage, exportMonitoring } from "../analytics.ts";
import type { AnalyticsEvent } from "../analytics.ts";
import { loadRootConfig } from "../root-config.ts";
import { join } from "node:path";

function item(): VersionedItem {
  return { id: "hero", kind: "template", slug: "hero", name: "Hero", version: 1, status: "published", changeNote: "Proof template v1.", previousVersion: null, createdBy: "admin-1", createdAt: "2026-11-07", publishedAt: "2026-11-07", publishedBy: "admin-1" };
}

test("versioning: every change creates a new version and publish needs a note", () => {
  const next = nextVersion(item(), "New layout.", "admin-1");
  assert.equal(next.version, 2);
  assert.equal(next.status, "draft");
  assert.equal(next.previousVersion, 1);
  assert.equal(publishVersion(next, "admin-1").status, "published");
  assert.throws(() => nextVersion(item(), "  ", "admin-1"), /version note/);
  assert.throws(() => publishVersion({ ...item(), changeNote: "" }, "admin-1"), /version note/);
  const rolled = rollbackVersion(next, item(), "Layout broke the preview.", "admin-1");
  assert.equal(rolled.version, 3);
  assert.equal(rolled.status, "preview");
  assert.match(rolled.changeNote, /Rollback to version 1/);
  assert.equal(onlyOnePublished([item(), publishVersion(next, "admin-1")]), false);
});

test("feature flags: plan flag overrides global, default is enabled", () => {
  let flags = setFlag([], { targetKind: "template", targetId: "hero", scope: "global", enabled: false, updatedBy: "admin-1" });
  assert.equal(isEnabled(flags, "template", "hero", "free"), false);
  flags = setFlag(flags, { targetKind: "template", targetId: "hero", scope: "plan:premium", enabled: true, updatedBy: "admin-1" });
  assert.equal(isEnabled(flags, "template", "hero", "premium"), true);
  assert.equal(isEnabled(flags, "template", "hero", "free"), false);
  assert.equal(isEnabled(flags, "template", "other", "free"), true);
});

test("governance: missing source, reviewer, and stale date are flagged", () => {
  const check = checkPackGovernance({ id: "p1", slug: "etsy", name: "Etsy", kind: "platform-pack", source: null, sourceNotes: null, lastVerifiedDate: "2026-11-05", reviewer: null, status: "draft" }, 30, "2026-11-07");
  assert.equal(check.needsReview, true);
  assert.ok(check.reasons.length >= 2);
  const fresh = checkPackGovernance({ id: "p2", slug: "etsy", name: "Etsy", kind: "platform-pack", source: "https://help.etsy.com", sourceNotes: "Checked 2026-11-05.", lastVerifiedDate: "2026-11-05", reviewer: "admin-1", status: "draft" }, 30, "2026-11-07");
  assert.equal(fresh.needsReview, false);
  assert.equal(fresh.daysSinceVerified, 2);
});

test("licence gate: a frame with no licence record must not be enabled", () => {
  assert.equal(checkLicence(null, "premium", "pass").canEnable, false);
  assert.equal(checkLicence({ source: "Built in house", licenceType: "own-built, owned outright", licenceDate: "2026-11-07", licenceStorageLocation: "packages/mockup-engine/frames/laptop-alone.svg" }, "premium", "pass").canEnable, true);
  assert.equal(checkLicence({ source: "Built in house", licenceType: "own-built, owned outright", licenceDate: "2026-11-07", licenceStorageLocation: "x" }, "premium", "not_tested").canEnable, false);
  const flow = validateMockupAddFlow({ frameUploaded: true, screenAreaMarked: true, orientationsSet: true, nichePacksSet: true, previewedWithRealRender: true, licence: null, qualityLabel: "basic", crispTestStatus: "pass" });
  assert.equal(flow.readyToEnable, false);
});

test("entitlements: negative price and zero pack limit are rejected, free keeps one pack", () => {
  const bad = validatePlanChange({ slug: "free", name: "Free", price_amount_minor: -1, price_currency: null, billing_interval: null, entitlements: { ai_credits_per_month: null, export_formats: ["jpg"], max_listing_packs: 0, max_storage_packs: null, mockup_access: "basic", template_access: "selected" } });
  assert.ok(bad.length >= 2);
  assert.deepEqual(validateTrialChange({ duration_days: 0, requires_card: false, one_per_account: true, ai_credit_allowance: null, export_allowance: null, listing_pack_allowance: null }), ["Trial duration must be at least 1 day."]);
  assert.equal(freePlanKeepsOnePack([{ slug: "free", name: "Free", price_amount_minor: null, price_currency: null, billing_interval: null, entitlements: { ai_credits_per_month: null, export_formats: ["jpg"], max_listing_packs: 1, max_storage_packs: null, mockup_access: "basic", template_access: "selected" } }]), true);
});

test("analytics: counts only, no product content, export breakdown by template and format", () => {
  const events: AnalyticsEvent[] = [
    { id: "1", type: "signup", userId: "u1", templateId: null, mockupId: null, platformId: null, packVersionId: null, format: null, plan: "free", durationMs: null, createdAt: "2026-11-07" },
    { id: "2", type: "trial_started", userId: "u1", templateId: null, mockupId: null, platformId: null, packVersionId: null, format: null, plan: "premium", durationMs: null, createdAt: "2026-11-07" },
    { id: "3", type: "trial_converted", userId: "u1", templateId: null, mockupId: null, platformId: null, packVersionId: null, format: null, plan: "premium", durationMs: null, createdAt: "2026-11-07" },
    { id: "4", type: "export_ready", userId: "u1", templateId: "hero", mockupId: "laptop-alone", platformId: "etsy", packVersionId: "etsy_digital_v1", format: "jpg", plan: "premium", durationMs: 1200, createdAt: "2026-11-07" },
    { id: "5", type: "export_failed", userId: "u1", templateId: "hero", mockupId: "laptop-alone", platformId: "etsy", packVersionId: "etsy_digital_v1", format: "jpg", plan: "premium", durationMs: 800, createdAt: "2026-11-07" },
    { id: "6", type: "ai_credit_used", userId: "u1", templateId: null, mockupId: null, platformId: null, packVersionId: null, format: null, plan: "premium", durationMs: null, createdAt: "2026-11-07" },
  ];
  const summary = summarizeUsage(events);
  assert.equal(summary.signups, 1);
  assert.equal(summary.trialStarts, 1);
  assert.equal(summary.trialConversions, 1);
  assert.equal(summary.trialConversionRate, 1);
  assert.equal(summary.exportSuccessRate, 0.5);
  assert.equal(summary.aiCreditsUsed, 1);
  const monitoring = exportMonitoring(events);
  assert.equal(monitoring.totalExports, 2);
  assert.equal(monitoring.byTemplate["hero"].ready, 1);
  assert.equal(monitoring.byTemplate["hero"].failed, 1);
  assert.equal(monitoring.byFormat["jpg"].successRate, 0.5);
  assert.equal(monitoring.averageExportTimeMs, 1000);
});

test("admin reads the root config at build time, not a mirrored copy", () => {
  const repoRoot = join(new URL(".", import.meta.url).pathname, "../../../..");
  const config = loadRootConfig(repoRoot);
  assert.equal((config.plans as { trial: { duration_days: number } }).trial.duration_days, 7);
  assert.equal((config.nichePacks as { packs: unknown[] }).packs.length, 3);
  assert.ok(config.platformPacks.some((p) => p.file === "etsy.v1.json"));
  assert.equal((config.siteCopy as { brand: { name: string } }).brand.name, "Listing Photos Generator");
});
