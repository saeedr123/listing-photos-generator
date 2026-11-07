// Entitlements and trial configuration. Plan limits and trial rules
// live in config/plans.json at the repo root; this module validates
// admin changes to them. Price is never invented here: a null price
// means not decided by Ali, never zero and never a hidden price.
// Changing a limit never needs a code change; changing it here returns
// a new config object with a version bump and a change note, which the
// caller stores. This module does not write the config file itself.

export interface PlanEntitlements {
  ai_credits_per_month: number | null;
  export_formats: string[];
  max_listing_packs: number | null;
  max_storage_packs: number | null;
  mockup_access: string;
  template_access: string;
}

export interface PlanConfig {
  slug: string;
  name: string;
  price_amount_minor: number | null;
  price_currency: string | null;
  billing_interval: string | null;
  entitlements: PlanEntitlements;
}

export interface TrialConfig {
  duration_days: number;
  requires_card: boolean;
  one_per_account: boolean;
  ai_credit_allowance: number | null;
  export_allowance: number | null;
  listing_pack_allowance: number | null;
}

export function validatePlanChange(plan: PlanConfig): string[] {
  const issues: string[] = [];
  if (plan.price_amount_minor !== null && plan.price_amount_minor < 0) issues.push("Price must not be negative. A null price means not decided.");
  if (plan.price_amount_minor !== null && !plan.price_currency) issues.push("A price needs a currency. Do not set a price without one.");
  if (plan.entitlements.max_listing_packs !== null && plan.entitlements.max_listing_packs < 1) issues.push("Maximum listing packs must be at least 1, or null for no limit.");
  if (plan.entitlements.ai_credits_per_month !== null && plan.entitlements.ai_credits_per_month < 0) issues.push("AI credits per month must not be negative.");
  if (plan.entitlements.export_formats.length === 0) issues.push("At least one export format is required.");
  return issues;
}

export function validateTrialChange(trial: TrialConfig): string[] {
  const issues: string[] = [];
  if (trial.duration_days < 1) issues.push("Trial duration must be at least 1 day.");
  if (trial.duration_days > 90) issues.push("Trial duration over 90 days needs an explicit owner decision. Record the reason before saving.");
  if (trial.ai_credit_allowance !== null && trial.ai_credit_allowance < 0) issues.push("Trial AI credit allowance must not be negative.");
  if (trial.export_allowance !== null && trial.export_allowance < 0) issues.push("Trial export allowance must not be negative.");
  if (trial.listing_pack_allowance !== null && trial.listing_pack_allowance < 1) issues.push("Trial listing pack allowance must be at least 1.");
  return issues;
}

export function freePlanKeepsOnePack(plans: PlanConfig[]): boolean {
  const free = plans.find((p) => p.slug === "free");
  return free?.entitlements.max_listing_packs === 1;
}
