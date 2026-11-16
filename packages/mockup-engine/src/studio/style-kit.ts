// Style kit rules. A style kit holds background colours, accent colour,
// fonts, badge style and wording, text slots, and the ordered list of
// shots for a listing set. Every image reads from the kit, so one shop
// looks consistent.

import type { BackgroundSpec, FontSpec, ShotDefinition, StudioIssue, StyleKit, TextureAsset } from "./types.ts";
import { isFiniteNumber, isHexColour, isSlug, missingLicenceFields, versionIssues } from "./validate-common.ts";

export interface StyleKitValidationContext {
  shots: ShotDefinition[];
  textures: TextureAsset[];
}

function backgroundIssues(background: BackgroundSpec, what: string, context?: StyleKitValidationContext): StudioIssue[] {
  const issues: StudioIssue[] = [];
  const fail = (code: string, message: string) => issues.push({ code, message });
  if (!background || typeof background !== "object") {
    fail("bad-background", `${what}: background is required.`);
    return issues;
  }
  if (background.type === "solid") {
    if (!isHexColour(background.colour)) fail("bad-background-colour", `${what}: a solid background needs a hex colour.`);
  } else if (background.type === "gradient") {
    if (!isHexColour(background.from) || !isHexColour(background.to)) {
      fail("bad-background-colour", `${what}: a gradient background needs two hex colours.`);
    }
    if (!isFiniteNumber(background.angleDeg)) fail("bad-gradient-angle", `${what}: a gradient background needs an angle in degrees.`);
  } else if (background.type === "desk-texture") {
    if (!isSlug(background.textureId)) fail("bad-texture-id", `${what}: a desk texture background needs a texture id.`);
    if (!isHexColour(background.backdropColour)) fail("bad-background-colour", `${what}: a desk texture background needs a backdrop hex colour.`);
    if (context) {
      const texture = context.textures.find((t) => t.id === background.textureId);
      if (!texture) {
        fail("texture-not-found", `${what}: texture ${background.textureId} is not in the registry.`);
      } else {
        const missing = missingLicenceFields(texture.licence);
        if (missing.length > 0) fail("texture-licence-incomplete", `${what}: texture ${texture.id} must not be used. Missing: ${missing.join(", ")}.`);
      }
    }
  } else {
    fail("bad-background-type", `${what}: background type must be solid, gradient or desk-texture.`);
  }
  return issues;
}

function fontIssues(font: FontSpec, name: string, what: string): StudioIssue[] {
  const issues: StudioIssue[] = [];
  if (!font || !font.family || !font.family.trim()) {
    issues.push({ code: "missing-font-family", message: `${what}: the ${name} font needs a family.` });
    return issues;
  }
  if (!isFiniteNumber(font.weight) || font.weight < 100 || font.weight > 900) {
    issues.push({ code: "bad-font-weight", message: `${what}: the ${name} font weight must be from 100 to 900.` });
  }
  // A font file is an asset and needs a licence record. A generic family
  // ships no file, so there is nothing to licence.
  if (font.fileStorageKey) {
    const missing = missingLicenceFields(font.licence);
    if (missing.length > 0) {
      issues.push({ code: "font-licence-incomplete", message: `${what}: the ${name} font file must not be used. Missing: ${missing.join(", ")}.` });
    }
  }
  return issues;
}

export function validateStyleKit(kit: StyleKit, context?: StyleKitValidationContext): StudioIssue[] {
  const issues: StudioIssue[] = [];
  const what = `Style kit ${kit.id || "(no id)"}`;
  const fail = (code: string, message: string) => issues.push({ code, message });

  if (!kit.id || !kit.slug || !kit.name || !kit.name.trim()) fail("missing-identity", `${what}: id, slug and name are required.`);
  issues.push(...versionIssues(what, kit));
  if (typeof kit.isPlaceholder !== "boolean") fail("missing-placeholder-flag", `${what}: isPlaceholder must be true or false.`);
  if (kit.isPlaceholder && (!kit.placeholderNote || !kit.placeholderNote.trim())) {
    fail("missing-placeholder-note", `${what}: a placeholder kit must say what is still a placeholder.`);
  }
  if (kit.isPlaceholder && kit.status === "published") {
    fail("placeholder-published", `${what}: a kit with placeholder values must not be published. Replace the placeholders first.`);
  }
  if (!Array.isArray(kit.backgroundColours) || kit.backgroundColours.length === 0 || kit.backgroundColours.some((c) => !isHexColour(c))) {
    fail("bad-background-colours", `${what}: backgroundColours must be a list of at least one hex colour.`);
  }
  if (!isHexColour(kit.accentColour)) fail("bad-accent-colour", `${what}: accentColour must be a hex colour.`);
  if (!isHexColour(kit.textColour)) fail("bad-text-colour", `${what}: textColour must be a hex colour.`);
  issues.push(...backgroundIssues(kit.background, what, context));

  if (!kit.fonts) {
    fail("missing-fonts", `${what}: headline and body fonts are required.`);
  } else {
    issues.push(...fontIssues(kit.fonts.headline, "headline", what));
    issues.push(...fontIssues(kit.fonts.body, "body", what));
  }

  if (!kit.badge || !["none", "pill", "circle"].includes(kit.badge.style)) {
    fail("bad-badge-style", `${what}: badge style must be none, pill or circle.`);
  } else {
    if (typeof kit.badge.wording !== "string") fail("bad-badge-wording", `${what}: badge wording must be text.`);
    if (!isHexColour(kit.badge.backgroundColour) || !isHexColour(kit.badge.textColour)) {
      fail("bad-badge-colour", `${what}: badge colours must be hex colours.`);
    }
  }

  if (!kit.textSlots || typeof kit.textSlots.headline !== "string" || !Array.isArray(kit.textSlots.featureBullets)) {
    fail("bad-text-slots", `${what}: text slots need a headline and a list of feature bullets.`);
  } else if (kit.textSlots.featureBullets.some((bullet) => typeof bullet !== "string")) {
    fail("bad-text-slots", `${what}: every feature bullet must be text.`);
  }

  if (!Array.isArray(kit.shots) || kit.shots.length === 0) {
    fail("no-shots", `${what}: the ordered shot list must not be empty.`);
  }
  const seen = new Set<string>();
  for (const [index, entry] of (kit.shots || []).entries()) {
    const where = `${what}, shot ${index + 1}`;
    if (!isSlug(entry.shotId)) fail("bad-shot-id", `${where}: shot id is not valid.`);
    if (seen.has(entry.shotId)) fail("duplicate-shot", `${where}: shot ${entry.shotId} is listed twice.`);
    seen.add(entry.shotId);
    if (entry.background !== null) issues.push(...backgroundIssues(entry.background, where, context));
    if ([entry.showHeadline, entry.showBullets, entry.showBadge].some((flag) => typeof flag !== "boolean")) {
      fail("bad-shot-flags", `${where}: showHeadline, showBullets and showBadge must each be true or false.`);
    }
    if (context && !context.shots.some((s) => s.id === entry.shotId)) {
      fail("shot-not-found", `${where}: shot ${entry.shotId} is not in the registry.`);
    }
  }
  return issues;
}

/** The background a shot uses: its own override, or the kit background. */
export function backgroundForShot(kit: StyleKit, shotId: string): BackgroundSpec {
  const entry = kit.shots.find((s) => s.shotId === shotId);
  return entry && entry.background ? entry.background : kit.background;
}

/** A kit can only produce a publishable set when it is published and holds no placeholder values. */
export function kitIsProofOnly(kit: StyleKit): boolean {
  return kit.isPlaceholder || kit.status !== "published";
}
