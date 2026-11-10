// Feature decisions: three open decisions held as admin configurable
// flags with safe current defaults. Nothing here decides for Saeed.
// Each flag records the choice once he makes it; changing a flag
// value alone does not build the alternative behaviour, which is a
// separate build listed in docs/monetization.md section 10.
//
// - reconciliation_mode: "flag_only" (default) or "auto_fix".
//   Flag only means a mismatch between generated copy and the
//   seller's verified facts is flagged for the seller to fix.
// - trial_shape: "per_account_7_days_no_card" (default) or
//   "per_listing_pack". The default matches the trial in
//   config/plans.json: 7 days, no card, one per account.
// - mockup_pricing: "follow_plan_entitlements" (default) or
//   "free_for_all". The default matches canUseMockup in
//   entitlements.ts: basic mockups on Free, full library on Premium.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BillingError } from "./types.ts";

export type ReconciliationMode = "flag_only" | "auto_fix";
export type TrialShape = "per_account_7_days_no_card" | "per_listing_pack";
export type MockupPricing = "follow_plan_entitlements" | "free_for_all";

export interface FeatureDecision {
  key: string;
  name: string;
  current: string;
  default: string;
  options: string[];
  status: string;
  decision_needed: string;
  decided_by: string | null;
  decided_date: string | null;
}

export interface FeatureDecisionsConfig {
  version: number;
  note?: string;
  decisions: FeatureDecision[];
}

export function featureDecisionsPath(): string {
  return join(new URL("../../../config/feature-decisions.json", import.meta.url).pathname, "");
}

export function loadFeatureDecisions(path?: string): FeatureDecisionsConfig {
  const filePath = path ?? featureDecisionsPath();
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch {
    throw new BillingError(
      "feature_decisions_missing",
      "Feature decisions config could not be read. The three open decisions fall back to their safe defaults only when config/feature-decisions.json exists.",
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new BillingError(
      "feature_decisions_invalid",
      "Feature decisions config is not valid JSON. Fix config/feature-decisions.json before changing any decision flag.",
    );
  }
  return validateFeatureDecisions(parsed);
}

export function validateFeatureDecisions(value: unknown): FeatureDecisionsConfig {
  if (typeof value !== "object" || value === null) {
    throw new BillingError("feature_decisions_invalid", "Feature decisions config must be an object.");
  }
  const config = value as FeatureDecisionsConfig;
  if (!Array.isArray(config.decisions) || config.decisions.length === 0) {
    throw new BillingError("feature_decisions_invalid", "Feature decisions config must list at least one decision.");
  }
  const required = ["reconciliation_mode", "trial_shape", "mockup_pricing"];
  for (const key of required) {
    const decision = config.decisions.find((entry) => entry.key === key);
    if (!decision) {
      throw new BillingError("feature_decisions_invalid", "Feature decisions config is missing decision " + key + ".");
    }
    if (!decision.options.includes(decision.current)) {
      throw new BillingError(
        "feature_decisions_invalid",
        "Decision " + key + " has current value " + decision.current + ", which is not one of its options.",
      );
    }
    if (!decision.options.includes(decision.default)) {
      throw new BillingError(
        "feature_decisions_invalid",
        "Decision " + key + " has default value " + decision.default + ", which is not one of its options.",
      );
    }
  }
  return config;
}

export function getDecision(config: FeatureDecisionsConfig, key: string): FeatureDecision {
  const decision = config.decisions.find((entry) => entry.key === key);
  if (!decision) {
    throw new BillingError("feature_decision_not_found", "Feature decision not found: " + key + ".");
  }
  return decision;
}

export function reconciliationMode(config: FeatureDecisionsConfig): ReconciliationMode {
  return getDecision(config, "reconciliation_mode").current as ReconciliationMode;
}

export function trialShape(config: FeatureDecisionsConfig): TrialShape {
  return getDecision(config, "trial_shape").current as TrialShape;
}

export function mockupPricing(config: FeatureDecisionsConfig): MockupPricing {
  return getDecision(config, "mockup_pricing").current as MockupPricing;
}

// Plain language summary of the three decisions and their current
// values, for admin display. A decision still awaiting Saeed is
// labelled as such, never presented as settled.
export function describeFeatureDecisions(config: FeatureDecisionsConfig): string[] {
  return config.decisions.map((decision) => {
    const settled = decision.status === "decided" ? "Decided" : "Awaiting owner decision";
    return decision.name + ": current value " + decision.current + " (default " + decision.default + "). " + settled + ".";
  });
}
