// Billing terms disclosure, in plain language.
// Trial length, what happens at trial end, monthly and annual prices,
// renewal date, and cancel method must be shown before trial start and
// before any payment, on the checkout and account pages. Prices come from
// config only. A null price is shown as not set, never as zero and never
// hidden. No dark patterns, no hidden renewal, no pre ticked consent.

import { getPlan } from "./config.ts";
import type { BillingInterval, PlansConfig } from "./types.ts";

export interface AnnualSaving {
  monthly_amount_minor: number;
  annual_total_minor: number;
  monthly_equivalent_minor: number;
  saving_minor: number;
  saving_percent: number;
}

// Annual saving, from config values only. Returns null when either price
// is not set, so no saving is shown until Ali sets both prices.
export function annualSaving(config: PlansConfig): AnnualSaving | null {
  const premium = getPlan(config, "premium");
  const monthly = premium.price_monthly_amount_minor;
  const annual = premium.price_annual_amount_minor;
  if (monthly === null || annual === null || monthly <= 0) {
    return null;
  }
  const monthlyEquivalent = Math.round(annual / 12);
  const saving = monthly * 12 - annual;
  return {
    monthly_amount_minor: monthly,
    annual_total_minor: annual,
    monthly_equivalent_minor: monthlyEquivalent,
    saving_minor: saving,
    saving_percent: Math.round((saving / (monthly * 12)) * 100),
  };
}

export function formatMinorAmount(amountMinor: number | null, currency: string | null): string {
  if (amountMinor === null || currency === null) {
    return "Price not set yet";
  }
  const major = (amountMinor / 100).toFixed(2);
  return major + " " + currency;
}

export function renewalDate(periodStartIso: string, interval: BillingInterval): string | null {
  if (interval === null) {
    return null;
  }
  const start = new Date(periodStartIso);
  const next = new Date(start);
  if (interval === "monthly") {
    next.setMonth(next.getMonth() + 1);
  } else {
    next.setFullYear(next.getFullYear() + 1);
  }
  return next.toISOString();
}

export interface BillingTerms {
  price_set: boolean;
  can_proceed_to_payment: boolean;
  lines: string[];
  monthly_price_text: string;
  annual_price_text: string;
  annual_saving_text: string | null;
  renewal_text: string;
  cancel_text: string;
  trial_text: string;
}

export function buildBillingTerms(
  config: PlansConfig,
  opts: {
    planSlug: string;
    billingInterval?: BillingInterval;
    periodStartIso?: string | null;
    includeTrial?: boolean;
  },
): BillingTerms {
  const plan = getPlan(config, opts.planSlug);
  const priceSet =
    plan.price_amount_minor !== null ||
    plan.price_monthly_amount_minor !== null ||
    plan.price_annual_amount_minor !== null;
  const monthlyText = formatMinorAmount(plan.price_monthly_amount_minor, plan.price_currency);
  const annualText = formatMinorAmount(plan.price_annual_amount_minor, plan.price_currency);
  const saving = annualSaving(config);
  const annualSavingText =
    saving === null
      ? null
      : "Annual: " +
        formatMinorAmount(saving.annual_total_minor, plan.price_currency) +
        " per year, which is " +
        formatMinorAmount(saving.monthly_equivalent_minor, plan.price_currency) +
        " per month. You save " +
        formatMinorAmount(saving.saving_minor, plan.price_currency) +
        " a year compared with paying monthly.";
  const interval = opts.billingInterval ?? plan.billing_interval;
  const renewalIso =
    opts.periodStartIso && interval ? renewalDate(opts.periodStartIso, interval) : null;
  const renewalText =
    renewalIso === null
      ? "Renewal date: not set yet. No renewal date is shown until a price and a billing interval are set."
      : "Renewal date: " + renewalIso.slice(0, 10) + ".";
  const cancelText =
    "Cancel any time in your account, in a small number of clicks. You do not need to contact support to cancel. Cancelling keeps your access until the end of the current period, then your plan returns to Free. You keep viewing and downloading packs you created.";
  const trial = config.trial;
  const trialText = opts.includeTrial
    ? "Trial: " +
      String(trial.duration_days) +
      " days, " +
      (trial.requires_card ? "card required to start" : "no card required to start") +
      ", one trial per account. At trial end you downgrade to Free automatically, with no charge if no card was taken, and with a charge only after clear authorization if a card was taken. You keep viewing and downloading packs you created. Premium editing, premium templates, premium mockups, and premium exports lock until you subscribe."
    : "";
  const lines: string[] = [];
  if (opts.includeTrial) {
    lines.push(trialText);
  }
  if (priceSet) {
    lines.push("Monthly price: " + monthlyText + " per month.");
    lines.push("Annual price: " + annualText + " per year.");
    if (annualSavingText) {
      lines.push(annualSavingText);
    }
  } else {
    lines.push("Price not set yet. No payment can be taken until the owner sets a price. Checkout is blocked until then.");
  }
  lines.push(renewalText);
  lines.push(cancelText);
  lines.push("Refund policy: " + config.billing.refund_policy_text);
  return {
    price_set: priceSet,
    can_proceed_to_payment: priceSet,
    lines,
    monthly_price_text: monthlyText,
    annual_price_text: annualText,
    annual_saving_text: annualSavingText,
    renewal_text: renewalText,
    cancel_text: cancelText,
    trial_text: trialText,
  };
}
