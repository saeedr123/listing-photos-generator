// Mockup library registry: load, validate, and manage mockup definitions.
// Admin add flow, per PROMPT.md section 7.3: upload a frame, mark the
// screen area, set allowed orientations and niche packs, preview with a real
// product render, then enable. No code change and no deploy. Duplicate,
// edit, hide, and rollback are version operations, not edits in place.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { MockupDefinition } from "./types.ts";
import { checkPremium } from "./premium.ts";
import { licenceGate } from "./premium.ts";

export interface MockupIssue {
  code: string;
  message: string;
}

export function loadMockupFile(path: string): MockupDefinition {
  return JSON.parse(readFileSync(path, "utf8")) as MockupDefinition;
}

export function loadMockups(dir: string): MockupDefinition[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => loadMockupFile(join(dir, f)));
}

export function validateMockup(mockup: MockupDefinition): MockupIssue[] {
  const issues: MockupIssue[] = [];
  const fail = (code: string, message: string) => issues.push({ code, message });
  if (!mockup.id || !mockup.slug || !mockup.name) {
    fail("missing-identity", "Mockup is missing id, slug, or name.");
  }
  if (!mockup.frameFile) fail("missing-frame", `Mockup ${mockup.id}: frameFile is required.`);
  if (!mockup.screenAreas || mockup.screenAreas.length === 0) {
    fail("no-screen-area", `Mockup ${mockup.id}: at least one screen area is required.`);
  }
  for (const area of mockup.screenAreas || []) {
    if (area.x < 0 || area.y < 0 || area.w <= 0 || area.h <= 0 || area.x + area.w > 1000 || area.y + area.h > 1000) {
      fail("screen-out-of-frame", `Mockup ${mockup.id}: a screen area is outside the 0 to 1000 frame.`);
    }
  }
  if (!mockup.allowedScreenOrientations || mockup.allowedScreenOrientations.length === 0) {
    fail("no-orientations", `Mockup ${mockup.id}: allowedScreenOrientations must not be empty.`);
  }
  if (mockup.crispTestStatus !== "pass" && mockup.status === "published") {
    fail("crisp-not-passed", `Mockup ${mockup.id}: a published mockup must pass the crisp render test.`);
  }
  const premium = checkPremium(mockup);
  if (mockup.status === "published" && mockup.qualityLabel === "premium" && !premium.passesPremium) {
    fail("premium-check-failed", premium.message);
  }
  const licence = licenceGate(mockup);
  if (mockup.status === "published" && !licence.canEnable) {
    fail("licence-incomplete", licence.message);
  }
  if (!mockup.nichePacks || mockup.nichePacks.length === 0) {
    fail("no-niche-packs", `Mockup ${mockup.id}: nichePacks must not be empty.`);
  }
  return issues;
}

/** Easy add flow validation: the five admin steps, in order. */
export function validateAddFlow(input: {
  frameUploaded: boolean;
  screenAreaMarked: boolean;
  orientationsSet: boolean;
  nichePacksSet: boolean;
  previewedWithRealRender: boolean;
}): { readyToEnable: boolean; missingSteps: string[] } {
  const missing: string[] = [];
  if (!input.frameUploaded) missing.push("Upload a frame.");
  if (!input.screenAreaMarked) missing.push("Mark the screen area.");
  if (!input.orientationsSet) missing.push("Set allowed orientations.");
  if (!input.nichePacksSet) missing.push("Set niche packs.");
  if (!input.previewedWithRealRender) missing.push("Preview it with a real product render.");
  return { readyToEnable: missing.length === 0, missingSteps: missing };
}

export function getMockupById(mockups: MockupDefinition[], id: string): MockupDefinition | undefined {
  return mockups.find((m) => m.id === id);
}

export function getMockupsForNiche(mockups: MockupDefinition[], niche: string): MockupDefinition[] {
  return mockups.filter((m) => m.status === "published" && m.nichePacks.includes(niche));
}

/** Rollback creates a new version from an older snapshot, never overwriting history. */
export function rollbackMockupToVersion(
  current: MockupDefinition,
  olderSnapshot: MockupDefinition,
  reason: string,
): MockupDefinition {
  return {
    ...olderSnapshot,
    version: current.version + 1,
    status: "preview",
    previousVersion: current.version,
    changeNote: `Rollback to version ${olderSnapshot.version}: ${reason}`,
    updatedAt: new Date().toISOString().slice(0, 10),
  };
}
