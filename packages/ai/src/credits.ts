// AI credit limits. Amounts come from config/plans.json only. A null value
// means Ali has not decided the amount, never zero and never a hidden
// amount. No credit amount is invented here.

import type { CreditState } from "./types.ts";

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
