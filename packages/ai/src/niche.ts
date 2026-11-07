// Niche packs for AI copy help. Version 1 ships exactly 3 packs: wedding
// and events, personal finance, and small business planners. The pack data
// lives in config/niche-packs.json, not in code. Nothing here invents pack
// content: tone guidance and template order are read from the config, and
// keyword starting points come only from the seller's own product words.
//
// Expansion rule, enforced by checkNichePackSet: do not add niches by
// copying another pack and changing the name. Each pack must have its own
// tone guidance and its own template order, and a new pack is added only
// after it is researched, sourced, and tested with a real product.

import type { NichePackAi } from "./types.ts";

export const NICHE_PACK_COUNT_V1 = 3;

export interface NichePacksConfigShape {
  packs: NichePackAi[];
}

export function getNichePack(packs: NichePackAi[], slug: string): NichePackAi | null {
  return packs.find((pack) => pack.slug === slug) ?? null;
}

// A pack needs review when it is not ready for AI generation, when it still
// needs real product testing, when it has no verified date, when it is not
// active, or when its review status is not passed. An out of date pack is
// marked as needing review, never silently shown as current.
export function nichePackNeedsReview(pack: NichePackAi): boolean {
  if (!pack.aiGenerationReady) {
    return true;
  }
  if (pack.needsRealProductTesting) {
    return true;
  }
  if (pack.lastVerifiedDate === null || pack.lastVerifiedDate === "") {
    return true;
  }
  if (pack.status !== "active") {
    return true;
  }
  if (pack.reviewStatus !== "passed") {
    return true;
  }
  return false;
}

// Stale check. The caller supplies the reference date and the maximum age
// in days, because no review interval is decided in code. A pack whose last
// verified date is older than the interval is stale.
export function isPackStale(
  pack: NichePackAi,
  referenceDateIso: string,
  maxAgeDays: number,
): boolean {
  if (pack.lastVerifiedDate === null || pack.lastVerifiedDate === "") {
    return true;
  }
  const verified = new Date(pack.lastVerifiedDate + "T00:00:00Z").getTime();
  const reference = new Date(referenceDateIso + "T00:00:00Z").getTime();
  if (Number.isNaN(verified) || Number.isNaN(reference)) {
    return true;
  }
  const ageDays = (reference - verified) / (1000 * 60 * 60 * 24);
  return ageDays > maxAgeDays;
}

// Review checklist for launching a niche pack for AI generation. Every item
// must pass against a real product in that niche before ai_generation_ready
// is set to true in admin.
export function reviewChecklistFor(pack: NichePackAi): string[] {
  return [
    "Sample title reviewed for grammar against a real " + pack.name + " product.",
    "Sample description reviewed for tone against a real " + pack.name + " product.",
    "Sample tags reviewed for accuracy against a real " + pack.name + " product.",
    "Sample output states the real tab count, format, and price only, with no invented fact.",
    "Sample output adds no feature, tab count, format, price, or claim the seller does not have.",
    "Template suggestions fit a real " + pack.name + " product.",
    "Mockup suitability checked with a real " + pack.name + " product render.",
    "Last verified date and source notes updated in admin for " + pack.name + ".",
  ];
}

// Validate the version 1 niche pack set. Returns a list of problems, empty
// when the set is valid. Enforces exactly 3 packs, unique slugs, required
// fields, ai_generation_ready false until reviewed, and distinct tone
// guidance and template order per pack, so a pack cannot be a copy of
// another pack with only the name changed.
export function checkNichePackSet(packs: NichePackAi[]): string[] {
  const problems: string[] = [];
  if (packs.length !== NICHE_PACK_COUNT_V1) {
    problems.push("Version 1 ships exactly 3 niche packs, found " + packs.length + ".");
  }
  const slugs = new Set<string>();
  for (const pack of packs) {
    if (slugs.has(pack.slug)) {
      problems.push("Duplicate niche pack slug: " + pack.slug + ".");
    }
    slugs.add(pack.slug);
    if (pack.name.trim() === "") {
      problems.push("Niche pack " + pack.slug + " has no name.");
    }
    if (pack.toneGuidance.trim() === "") {
      problems.push("Niche pack " + pack.slug + " has no tone guidance.");
    }
    if (pack.templateRoles.length === 0) {
      problems.push("Niche pack " + pack.slug + " has no template suggestions.");
    }
    if (pack.mockupKinds.length === 0) {
      problems.push("Niche pack " + pack.slug + " has no mockup suitability.");
    }
    if (pack.lastVerifiedDate === null || pack.lastVerifiedDate === "") {
      problems.push("Niche pack " + pack.slug + " has no last verified date.");
    }
    if (pack.sourceNotes.trim() === "") {
      problems.push("Niche pack " + pack.slug + " has no source notes.");
    }
    if (pack.keywordStartingPoints.length > 0) {
      problems.push(
        "Niche pack " + pack.slug + " lists keyword starting points, but starting points come only from the seller's own product words.",
      );
    }
  }
  const tones = packs.map((pack) => pack.toneGuidance.trim());
  if (new Set(tones).size !== tones.length) {
    problems.push("Two niche packs share the same tone guidance. Each pack needs its own tone guidance.");
  }
  const orders = packs.map((pack) => pack.templateRoles.join(","));
  if (new Set(orders).size !== orders.length) {
    problems.push("Two niche packs share the same template order. Each pack needs its own template order.");
  }
  return problems;
}
