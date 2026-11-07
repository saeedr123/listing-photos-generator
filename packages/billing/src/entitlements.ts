// Entitlements: free and premium access rules.
// Every limit comes from config/plans.json. Nothing is hard coded here
// except the rule shapes themselves. A null numeric limit means the limit
// is not set in admin yet, never unlimited and never zero. Callers must
// show the not set state in the dashboard instead of inventing a number.

import { getPlan } from "./config.ts";
import type { AccountBillingState, PlanEntitlements, PlansConfig } from "./types.ts";

export function getEntitlements(config: PlansConfig, slug: string): PlanEntitlements {
  return getPlan(config, slug).entitlements;
}

export type EffectivePlanSource = "trial" | "plan";

export interface EffectivePlan {
  plan_slug: string;
  source: EffectivePlanSource;
  trial_active: boolean;
}

export function isTrialActive(state: AccountBillingState, nowIso: string): boolean {
  if (!state.trial || state.trial.status !== "active") {
    return false;
  }
  return new Date(nowIso).getTime() < new Date(state.trial.ends_at).getTime();
}

// During an active trial the user has premium access. At trial end the
// effective plan falls back to the stored plan, normally free. The trial
// never changes the stored plan by itself; expireTrial does the downgrade.
export function resolveEffectivePlan(
  state: AccountBillingState,
  nowIso: string,
): EffectivePlan {
  if (isTrialActive(state, nowIso)) {
    return { plan_slug: "premium", source: "trial", trial_active: true };
  }
  return { plan_slug: state.plan_slug, source: "plan", trial_active: false };
}

export interface GateResult {
  allowed: boolean;
  reason: string;
}

// Free pack count limit. The free limit is a count, one complete pack, not
// a watermark and not a licence trap. Premium has no pack count set in
// config yet, so a null limit means no count limit is set in admin, and the
// gate allows creation while recording that the limit is not set.
export function canCreatePack(
  config: PlansConfig,
  state: AccountBillingState,
  nowIso: string,
): GateResult {
  const effective = resolveEffectivePlan(state, nowIso);
  const entitlements = getEntitlements(config, effective.plan_slug);
  const limit = entitlements.max_listing_packs;
  if (limit === null) {
    return {
      allowed: true,
      reason: "No pack count limit is set in admin for the " + effective.plan_slug + " plan yet.",
    };
  }
  if (state.packs_created >= limit) {
    return {
      allowed: false,
      reason:
        "Free plan includes " +
        String(limit) +
        " complete pack. You have used " +
        String(state.packs_created) +
        ". Start a trial or subscribe to Premium to create another pack.",
    };
  }
  return {
    allowed: true,
    reason:
      "Pack " +
      String(state.packs_created + 1) +
      " of " +
      String(limit) +
      " on the " +
      effective.plan_slug +
      " plan.",
  };
}

// Template access. Free uses the selected template set from admin.
// Premium and trial use all templates. The selected list itself lives in
// config, so admin can change it without a code change. If no selected
// list is set in admin, a free user has no selected template to use, and
// the gate says so instead of guessing a list.
export function canUseTemplate(
  config: PlansConfig,
  state: AccountBillingState,
  nowIso: string,
  templateSlug: string,
): GateResult {
  const effective = resolveEffectivePlan(state, nowIso);
  const entitlements = getEntitlements(config, effective.plan_slug);
  if (entitlements.template_access === "all") {
    return { allowed: true, reason: "All templates are included on the " + effective.plan_slug + " plan." };
  }
  const selected = entitlements.selected_template_slugs ?? null;
  if (selected === null) {
    return {
      allowed: false,
      reason: "No selected template set is configured in admin yet, so no template can be confirmed as free. Ask an admin to set the free template set.",
    };
  }
  if (selected.includes(templateSlug)) {
    return { allowed: true, reason: "Template " + templateSlug + " is in the free selected set." };
  }
  return {
    allowed: false,
    reason: "Template " + templateSlug + " is a premium template. Start a trial or subscribe to Premium to use it.",
  };
}

// Mockup access. Free uses basic mockups only. Premium and trial use the
// full library, including premium frames. A basic frame is never labelled
// premium, and a premium frame is never offered as free.
export function canUseMockup(
  config: PlansConfig,
  state: AccountBillingState,
  nowIso: string,
  mockupKind: "basic" | "premium",
): GateResult {
  const effective = resolveEffectivePlan(state, nowIso);
  const entitlements = getEntitlements(config, effective.plan_slug);
  if (entitlements.mockup_access === "full") {
    return { allowed: true, reason: "Full mockup library is included on the " + effective.plan_slug + " plan." };
  }
  if (mockupKind === "basic") {
    return { allowed: true, reason: "Basic mockups are included on the free plan." };
  }
  return {
    allowed: false,
    reason: "Premium mockups need Premium. Start a trial or subscribe to Premium to use premium frames.",
  };
}

// Export format access. Version 1 exports JPG only, per the Etsy pack.
export function canExportFormat(
  config: PlansConfig,
  state: AccountBillingState,
  nowIso: string,
  format: string,
): GateResult {
  const effective = resolveEffectivePlan(state, nowIso);
  const entitlements = getEntitlements(config, effective.plan_slug);
  if (entitlements.export_formats.includes(format.toLowerCase())) {
    return { allowed: true, reason: "Export format " + format + " is included on the " + effective.plan_slug + " plan." };
  }
  return {
    allowed: false,
    reason: "Export format " + format + " is not included on the " + effective.plan_slug + " plan.",
  };
}

// AI credits. A null monthly limit means the count is not set in admin
// yet. The dashboard must show that state in plain words, not a number.
export function aiCreditsRemaining(
  config: PlansConfig,
  state: AccountBillingState,
  nowIso: string,
): { limit: number | null; used: number; remaining: number | null; message: string } {
  const effective = resolveEffectivePlan(state, nowIso);
  const entitlements = getEntitlements(config, effective.plan_slug);
  const limit = entitlements.ai_credits_per_month;
  if (limit === null) {
    return {
      limit: null,
      used: state.ai_credits_used_this_month,
      remaining: null,
      message: "AI credit limit not set in admin yet.",
    };
  }
  const remaining = Math.max(0, limit - state.ai_credits_used_this_month);
  return {
    limit,
    used: state.ai_credits_used_this_month,
    remaining,
    message: String(remaining) + " of " + String(limit) + " AI credits left this month.",
  };
}

// Viewing and downloading are never locked. The owner can always view and
// download a pack they created, on any plan, during a trial, after a trial
// ends, after cancelling, and after a subscription lapses. This rule is
// unconditional: no plan check, no trial check, and no payment check can
// turn it off.
export function canViewPack(_state: AccountBillingState, _packOwnerId: string, _userId: string): GateResult {
  return { allowed: true, reason: "You can always view a listing pack you created." };
}

export function canDownloadPack(_state: AccountBillingState): GateResult {
  return { allowed: true, reason: "You can always download a pack you created, including packs made during a trial." };
}

// Editing is the part that locks. Premium editing, premium templates,
// premium mockups, and premium exports lock when the effective plan is
// free. Basic editing of a free pack stays open.
export function canEditPack(
  config: PlansConfig,
  state: AccountBillingState,
  nowIso: string,
  requiresPremium: boolean,
): GateResult {
  const effective = resolveEffectivePlan(state, nowIso);
  if (!requiresPremium) {
    return { allowed: true, reason: "Basic editing is included on the " + effective.plan_slug + " plan." };
  }
  if (effective.plan_slug === "premium") {
    return { allowed: true, reason: "Premium editing is included during the trial or on Premium." };
  }
  return {
    allowed: false,
    reason: "Premium editing is locked. This pack uses premium features. Start a trial or subscribe to Premium to edit it. You can still view and download it.",
  };
}

// Storage limit, from config. Null means not set in admin yet.
export function storageLimit(config: PlansConfig, slug: string): { limit: number | null; message: string } {
  const entitlements = getEntitlements(config, slug);
  if (entitlements.max_storage_packs === null) {
    return { limit: null, message: "Pack storage limit not set in admin yet." };
  }
  return { limit: entitlements.max_storage_packs, message: "Pack storage limit: " + String(entitlements.max_storage_packs) + " packs." };
}
