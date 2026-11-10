// AI credit limits. Amounts come from config/plans.json only. A null value
// means Ali has not decided the amount, never zero and never a hidden
// amount. No credit amount is invented here.

import type { AiProviderConfig, CreditState } from "./types.ts";

export interface PlansConfigShape {
  plans: Array<{
    slug: string;
    entitlements: { ai_credits_per_month: number | null };
  }>;
  trial: { ai_credit_allowance: number | null };
}

// Monthly AI credit limit for a plan slug, or null when not set in admin.
export function getCreditLimit(planSlug: string, plans: PlansConfigShape): number | null {
  const plan = plans.plans.find((entry) => entry.slug === planSlug);
  if (!plan) {
    return null;
  }
  return plan.entitlements.ai_credits_per_month;
}

// Trial AI credit allowance, or null when not set in admin.
export function getTrialCreditAllowance(plans: PlansConfigShape): number | null {
  return plans.trial.ai_credit_allowance;
}

// Can one more suggestion be generated with this credit state? False when
// the limit is not set in admin yet, and false when the limit is reached.
export function canUseCredit(credits: CreditState): { allowed: boolean; reason: string } {
  if (credits.limit === null) {
    return { allowed: false, reason: "AI credit limit not set in admin yet." };
  }
  if (credits.used === null) {
    return { allowed: true, reason: "Usage is not recorded yet. Limit is " + credits.limit + " credits per month." };
  }
  if (credits.used >= credits.limit) {
    return {
      allowed: false,
      reason: "AI credit limit reached for this month: " + credits.used + " of " + credits.limit + " used.",
    };
  }
  return { allowed: true, reason: "" };
}

// Credits left this month, or null when the limit is not set in admin.
export function creditsRemaining(credits: CreditState): number | null {
  if (credits.limit === null || credits.used === null) {
    return null;
  }
  return Math.max(0, credits.limit - credits.used);
}

// Dashboard wording for the monthly AI credit count. Always states the
// limit plainly, or plainly states that it is not set.
export function formatCreditDisplay(credits: CreditState): string {
  if (credits.limit === null) {
    return "AI credit limit not set in admin yet.";
  }
  if (credits.used === null) {
    return "AI credits used this month: not recorded yet. Monthly limit: " + credits.limit + ".";
  }
  return "AI credits used this month: " + credits.used + " of " + credits.limit + ".";
}

export type AiGenerationGateCode =
  | "credit_limit_not_set"
  | "provider_not_configured"
  | "credit_limit_reached"
  | null;

// Production generation gate. AI generation is allowed only when both
// parts are in place: a real provider is configured, and the monthly
// credit limit is set in admin and not yet reached. Either part missing
// blocks generation.
//
// This gate is separate from generateCopy on purpose. generateCopy
// still runs the local development stub when no provider is chosen,
// so local work and the existing tests keep working. Production wiring
// must call this gate before generateCopy, and must refuse generation
// when it returns allowed false. The development stub is local work
// only and must never be presented as a real AI provider.
export function aiGenerationGate(
  credits: CreditState,
  providerConfig: AiProviderConfig,
): { allowed: boolean; code: AiGenerationGateCode; reason: string } {
  if (credits.limit === null) {
    return { allowed: false, code: "credit_limit_not_set", reason: "AI credit limit not set in admin yet." };
  }
  if (providerConfig.provider === null || providerConfig.provider === "") {
    return {
      allowed: false,
      code: "provider_not_configured",
      reason: "No AI provider is configured. The provider choice is an open decision for Ali, and no real provider call is made until he chooses one.",
    };
  }
  if (credits.used !== null && credits.used >= credits.limit) {
    return {
      allowed: false,
      code: "credit_limit_reached",
      reason: "AI credit limit reached for this month: " + credits.used + " of " + credits.limit + " used.",
    };
  }
  return { allowed: true, code: null, reason: "" };
}
