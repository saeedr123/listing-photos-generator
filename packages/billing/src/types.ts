// Billing types for Listing Photos Generator.
// All limits, prices, trial rules, VAT treatment, and refund wording come
// from config/plans.json or from admin. Nothing content bearing is hard
// coded here. A null value means not set in admin, never zero and never a
// hidden value. No em dashes and no en dashes are used in this file.

export type PlanSlug = string;

export type BillingInterval = "monthly" | "annual" | null;

export interface PlanEntitlements {
  max_listing_packs: number | null;
  max_storage_packs: number | null;
  ai_credits_per_month: number | null;
  template_access: string;
  mockup_access: string;
  export_formats: string[];
  customization: string;
  platform_access: string[];
  premium_pack_bundles: boolean;
  priority_access: boolean;
  selected_template_slugs?: string[] | null;
}

export interface PlanConfig {
  slug: string;
  name: string;
  price_amount_minor: number | null;
  price_monthly_amount_minor: number | null;
  price_annual_amount_minor: number | null;
  price_currency: string | null;
  billing_interval: BillingInterval;
  entitlements: PlanEntitlements;
  notes?: string[];
}

export interface TrialConfig {
  duration_days: number;
  requires_card: boolean;
  one_per_account: boolean;
  ai_credit_allowance: number | null;
  export_allowance: number | null;
  listing_pack_allowance: number | null;
  note?: string;
}

export interface BillingConfig {
  vat_rate: number | null;
  vat_note: string;
  refund_policy_status: string;
  refund_policy_text: string;
  renewal_reminder_days_before: number | null;
  renewal_reminder_note: string;
}

export interface ChangeLogEntry {
  date: string;
  actor: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  reason: string;
}

export interface PlansConfig {
  version: number;
  note?: string;
  plans: PlanConfig[];
  trial: TrialConfig;
  billing: BillingConfig;
  change_log: ChangeLogEntry[];
}

export type TrialStatus = "active" | "ended" | "converted";

export interface TrialState {
  plan_slug: string;
  starts_at: string;
  ends_at: string;
  status: TrialStatus;
  requires_card: boolean;
  card_taken: boolean;
  ai_credits_used: number;
  exports_used: number;
  packs_created: number;
}

export type SubscriptionStatus = "active" | "cancelled" | "past_due" | "trialing";

export interface SubscriptionState {
  id: string;
  plan_slug: string;
  billing_interval: BillingInterval;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  card_authorized: boolean;
  provider: string;
  provider_subscription_id: string | null;
}

export interface AccountBillingState {
  user_id: string;
  plan_slug: string;
  trial: TrialState | null;
  trials_used: number;
  subscription: SubscriptionState | null;
  packs_created: number;
  ai_credits_used_this_month: number;
  exports_used_this_trial: number;
}

export class BillingError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "BillingError";
    this.code = code;
  }
}

export function newFreeAccount(userId: string): AccountBillingState {
  return {
    user_id: userId,
    plan_slug: "free",
    trial: null,
    trials_used: 0,
    subscription: null,
    packs_created: 0,
    ai_credits_used_this_month: 0,
    exports_used_this_trial: 0,
  };
}
