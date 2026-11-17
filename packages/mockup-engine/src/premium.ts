// Premium quality check, per PROMPT.md section 9.
// Premium means realistic perspective, soft realistic shadows and depth,
// and a lifestyle or desk scene, not a flat basic rectangle with a plain
// background. A flat basic rectangle with a plain background FAILS the
// premium label, even if the screen inside it is crisp.

import type { HumanReviewSignOff, MockupDefinition, PremiumCheckResult } from "./types.ts";

export const HUMAN_REVIEW_CRITERION = "recorded human visual review sign-off";

/**
 * A sign-off counts only when it is complete and the decision is
 * approved: who reviewed, when, who approved, and when. An empty or
 * rejected record is the same as no record.
 */
export function hasApprovedHumanReview(signOff: HumanReviewSignOff | null | undefined): boolean {
  if (!signOff) return false;
  return (
    signOff.decision === "approved" &&
    Boolean(signOff.reviewedBy && signOff.reviewedBy.trim()) &&
    Boolean(signOff.reviewedAt && signOff.reviewedAt.trim()) &&
    Boolean(signOff.approvedBy && signOff.approvedBy.trim()) &&
    Boolean(signOff.approvedAt && signOff.approvedAt.trim())
  );
}

export function checkPremium(mockup: MockupDefinition): PremiumCheckResult {
  const failed: string[] = [];
  const c = mockup.premiumCriteria;
  if (!c.realisticPerspective) failed.push("realistic perspective");
  if (!c.softRealisticShadows) failed.push("soft realistic shadows");
  if (!c.depth) failed.push("depth");
  if (!c.lifestyleOrDeskScene) failed.push("lifestyle or desk scene");
  if (!c.realisticMaterialsAndEdges) failed.push("realistic materials and edges");
  if (!c.screenCrispAtExportSize) failed.push("screen crisp at export size");
  if (mockup.warpRequired && mockup.qualityLabel === "premium") {
    failed.push("tilted frame needs a warp test before it can be called premium");
  }
  if (mockup.qualityLabel === "premium" && !hasApprovedHumanReview(mockup.humanReview)) {
    failed.push(HUMAN_REVIEW_CRITERION);
  }
  const passes = failed.length === 0 && mockup.qualityLabel === "premium";
  if (!passes && mockup.qualityLabel === "premium") {
    return {
      passesPremium: false,
      label: "basic",
      failedCriteria: failed,
      message: `Mockup ${mockup.id} is labelled premium but fails: ${failed.join(", ")}. Label it basic until every premium point is met.`,
    };
  }
  if (mockup.qualityLabel === "basic") {
    return {
      passesPremium: false,
      label: "basic",
      failedCriteria: failed,
      message: `Mockup ${mockup.id} is a basic frame, not premium. It may be used as a basic frame, but must never be labelled premium.`,
    };
  }
  return {
    passesPremium: true,
    label: "premium",
    failedCriteria: [],
    message: `Mockup ${mockup.id} meets every premium criterion and carries an approved human visual review sign-off.`,
  };
}

/** A frame with no licence record, where a licence is required, must stay in draft. */
export function licenceGate(mockup: MockupDefinition): { canEnable: boolean; message: string } {
  const licence = mockup.licence;
  const isOwnBuilt = licence.licenceType === "own-built, owned outright";
  if (isOwnBuilt) {
    return { canEnable: true, message: `Mockup ${mockup.id} is built in house and owned outright. No third party licence is required.` };
  }
  if (!licence.source || !licence.licenceType || !licence.licenceDate || !licence.licenceStorageLocation) {
    return {
      canEnable: false,
      message: `Mockup ${mockup.id} has an incomplete licence record. A frame with no licence record must not be enabled in the live library.`,
    };
  }
  return { canEnable: true, message: `Mockup ${mockup.id} has a complete licence record.` };
}
