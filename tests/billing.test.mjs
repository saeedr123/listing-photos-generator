// Billing tests, per PROMPT.md section 16 and section 23.
// Entitlements, trial, Stripe stub, VAT placeholder, cancel and refund.
// No real charge, no real Stripe key, no live payment flow. Prices in the
// test config are test values only, used to check the maths, and are not
// the product price. The shipped config keeps every price null.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BillingError,
  StripeStubProvider,
  annualSaving,
  buildBillingTerms,
  buildInvoiceDraft,
  canCreatePack,
  canDownloadPack,
  canEditPack,
  canViewPack,
  cancelSubscription,
  expireTrial,
  getVatTreatment,
  hasAccessUntilPeriodEnd,
  loadPlansConfig,
  newFreeAccount,
  recordEntitlementChange,
  requestRefund,
  scheduleRenewalReminder,
  startTrial,
} from "../packages/billing/src/index.ts";

const NOW = "2026-11-07T00:00:00.000Z";
const AFTER_TRIAL = "2026-11-15T00:00:00.000Z";

// Test config only. Prices here are test values to check the annual saving
// maths. They are not the product price. The shipped config keeps prices
// null until Ali sets them.
function testConfig() {
  return {
    version: 1,
    plans: [
      {
        slug: "free",
        name: "Free",
        price_amount_minor: null,
        price_monthly_amount_minor: null,
        price_annual_amount_minor: null,
        price_currency: null,
        billing_interval: null,
        entitlements: {
          max_listing_packs: 1,
          max_storage_packs: null,
          ai_credits_per_month: null,
          template_access: "selected",
          mockup_access: "basic",
          export_formats: ["jpg"],
          customization: "basic",
          platform_access: ["etsy"],
          premium_pack_bundles: false,
          priority_access: false,
          selected_template_slugs: ["hero", "features-grid"],
        },
      },
      {
        slug: "premium",
        name: "Premium",
        price_amount_minor: null,
        price_monthly_amount_minor: 1000,
        price_annual_amount_minor: 10000,
        price_currency: "EUR",
        billing_interval: "monthly",
        entitlements: {
          max_listing_packs: null,
          max_storage_packs: null,
          ai_credits_per_month: null,
          template_access: "all",
          mockup_access: "full",
          export_formats: ["jpg"],
          customization: "advanced",
          platform_access: ["etsy"],
          premium_pack_bundles: true,
          priority_access: true,
          selected_template_slugs: null,
        },
      },
    ],
    trial: {
      duration_days: 7,
      requires_card: false,
      one_per_account: true,
      ai_credit_allowance: null,
      export_allowance: null,
      listing_pack_allowance: null,
    },
    billing: {
      vat_rate: null,
      vat_note: "VAT treatment to be confirmed with the accountant before launch.",
      refund_policy_status: "placeholder",
      refund_policy_text: "Refund policy placeholder. Final wording is to be confirmed.",
      renewal_reminder_days_before: null,
      renewal_reminder_note: "Set in admin before launch.",
    },
    change_log: [],
  };
}

describe("billing: shipped config", () => {
  it("loads config/plans.json with prices null and trial 7 days, no card, one per account", () => {
    const config = loadPlansConfig();
    assert.equal(config.trial.duration_days, 7);
    assert.equal(config.trial.requires_card, false);
    assert.equal(config.trial.one_per_account, true);
    const premium = config.plans.find((plan) => plan.slug === "premium");
    assert.equal(premium.price_amount_minor, null);
    assert.equal(premium.price_monthly_amount_minor, null);
    assert.equal(premium.price_annual_amount_minor, null);
    assert.equal(premium.price_currency, null);
    assert.equal(config.billing.vat_rate, null);
    assert.equal(config.billing.refund_policy_status, "placeholder");
    const free = config.plans.find((plan) => plan.slug === "free");
    assert.equal(free.entitlements.max_listing_packs, 1);
    assert.equal(free.entitlements.template_access, "selected");
    assert.equal(free.entitlements.mockup_access, "basic");
    assert.equal(premium.entitlements.template_access, "all");
    assert.equal(premium.entitlements.mockup_access, "full");
  });

  it("annual saving is null while the shipped price is null", () => {
    const config = loadPlansConfig();
    assert.equal(annualSaving(config), null);
  });
});

describe("billing: free pack count limit", () => {
  it("allows the first free pack and blocks the second pack", () => {
    const config = testConfig();
    const first = newFreeAccount("user-1");
    assert.equal(canCreatePack(config, first, NOW).allowed, true);
    const used = { ...first, packs_created: 1 };
    const second = canCreatePack(config, used, NOW);
    assert.equal(second.allowed, false);
    assert.match(second.reason, /1 complete pack/);
  });
});

describe("billing: trial", () => {
  it("starts a 7 day trial with no card and ends it after 7 days", () => {
    const config = testConfig();
    const started = startTrial(config, newFreeAccount("user-2"), NOW);
    assert.equal(started.trial.status, "active");
    assert.equal(started.trial.ends_at, "2026-11-14T00:00:00.000Z");
    assert.equal(started.trial.requires_card, false);
  });

  it("allows only one trial per account", () => {
    const config = testConfig();
    const started = startTrial(config, newFreeAccount("user-3"), NOW);
    assert.throws(
      () => startTrial(config, started, NOW),
      (error) => error instanceof BillingError && error.code === "trial_already_used",
    );
    const ended = expireTrial(config, started, AFTER_TRIAL);
    assert.equal(ended.downgraded, true);
    assert.throws(
      () => startTrial(config, ended.state, AFTER_TRIAL),
      (error) => error instanceof BillingError && error.code === "trial_already_used",
    );
  });

  it("downgrades to Free at trial end with no charge when no card was taken", () => {
    const config = testConfig();
    const started = startTrial(config, newFreeAccount("user-4"), NOW);
    const ended = expireTrial(config, started, AFTER_TRIAL);
    assert.equal(ended.downgraded, true);
    assert.equal(ended.charged, false);
    assert.equal(ended.state.plan_slug, "free");
    assert.equal(ended.state.trial.status, "ended");
  });

  it("does not charge at trial end when a card was taken but no separate authorization was given", () => {
    const config = testConfig();
    const started = startTrial(config, newFreeAccount("user-5"), NOW, { cardTaken: true });
    const ended = expireTrial(config, started, AFTER_TRIAL);
    assert.equal(ended.charged, false);
    assert.equal(ended.state.plan_slug, "free");
  });
});

describe("billing: premium lock after trial end, viewing never locks", () => {
  it("keeps viewing and downloading open but locks premium editing after trial end", () => {
    const config = testConfig();
    const started = startTrial(config, newFreeAccount("user-6"), NOW);
    assert.equal(canEditPack(config, started, NOW, true).allowed, true);
    const ended = expireTrial(config, started, AFTER_TRIAL);
    assert.equal(canViewPack(ended.state, "user-6", "user-6").allowed, true);
    assert.equal(canDownloadPack(ended.state).allowed, true);
    assert.equal(canEditPack(config, ended.state, AFTER_TRIAL, true).allowed, false);
    assert.equal(canEditPack(config, ended.state, AFTER_TRIAL, false).allowed, true);
  });
});

describe("billing: cancel", () => {
  it("keeps end of period access after cancel, with a clear record", () => {
    const account = newFreeAccount("user-7");
    account.plan_slug = "premium";
    account.subscription = {
      id: "sub-1",
      plan_slug: "premium",
      billing_interval: "monthly",
      status: "active",
      current_period_start: "2026-11-01T00:00:00.000Z",
      current_period_end: "2026-12-01T00:00:00.000Z",
      cancel_at_period_end: false,
      cancelled_at: null,
      card_authorized: true,
      provider: "stripe_stub",
      provider_subscription_id: "stub_subscription_1",
    };
    const result = cancelSubscription(account, "2026-11-07T00:00:00.000Z");
    assert.equal(result.state.subscription.status, "cancelled");
    assert.equal(result.state.subscription.cancel_at_period_end, true);
    assert.equal(result.state.subscription.current_period_end, "2026-12-01T00:00:00.000Z");
    assert.equal(result.record.access_until, "2026-12-01T00:00:00.000Z");
    assert.equal(hasAccessUntilPeriodEnd(result.state, "2026-11-20T00:00:00.000Z"), true);
    assert.equal(hasAccessUntilPeriodEnd(result.state, "2026-12-02T00:00:00.000Z"), false);
  });

  it("refuses to cancel when there is no active subscription", () => {
    assert.throws(
      () => cancelSubscription(newFreeAccount("user-8"), NOW),
      (error) => error instanceof BillingError && error.code === "no_active_subscription",
    );
  });
});

describe("billing: no charge without authorization and price null blocks checkout", () => {
  it("blocks checkout when the price is null, with a clear message", () => {
    const config = loadPlansConfig();
    const provider = new StripeStubProvider();
    assert.throws(
      () =>
        provider.createCheckoutSession(config, {
          user_id: "user-9",
          plan_slug: "premium",
          billing_interval: "monthly",
          authorized: true,
        }),
      (error) => error instanceof BillingError && error.code === "price_not_set" && /Price not set yet/.test(error.message),
    );
    const terms = buildBillingTerms(config, { planSlug: "premium", includeTrial: true });
    assert.equal(terms.price_set, false);
    assert.equal(terms.can_proceed_to_payment, false);
    assert.match(terms.lines.join(" "), /Price not set yet/);
    assert.match(terms.trial_text, /7 days/);
    assert.match(terms.trial_text, /no card required/);
  });

  it("refuses a charge without authorization even when a price is set in the test config", () => {
    const config = testConfig();
    const provider = new StripeStubProvider();
    assert.throws(
      () =>
        provider.createCheckoutSession(config, {
          user_id: "user-10",
          plan_slug: "premium",
          billing_interval: "monthly",
          authorized: false,
        }),
      (error) => error instanceof BillingError && error.code === "charge_not_authorized",
    );
  });

  it("stub returns a no charge record when price is set and authorization is given, and never charges", () => {
    const config = testConfig();
    const provider = new StripeStubProvider();
    const result = provider.createSubscription(config, {
      user_id: "user-11",
      plan_slug: "premium",
      billing_interval: "annual",
      authorized: true,
    });
    assert.equal(result.mode, "DEVELOPMENT STUB ONLY");
    assert.equal(result.status, "stub_no_charge");
    assert.equal(result.charge_amount_minor, 0);
  });

  it("annual saving maths uses config values only: 1000 monthly and 10000 annual gives 833 monthly equivalent and 2000 saving", () => {
    const saving = annualSaving(testConfig());
    assert.equal(saving.monthly_equivalent_minor, 833);
    assert.equal(saving.annual_total_minor, 10000);
    assert.equal(saving.saving_minor, 2000);
    assert.equal(saving.saving_percent, 17);
  });
});

describe("billing: VAT, reminders, refunds, change log", () => {
  it("leaves the VAT rate null with an accountant confirmation note, and invoice VAT is null", () => {
    const config = loadPlansConfig();
    const vat = getVatTreatment(config);
    assert.equal(vat.vat_rate, null);
    assert.equal(vat.status, "awaiting_accountant_confirmation");
    const invoice = buildInvoiceDraft({ subtotal_minor: 1000, currency: "EUR", customer_country: "DE" });
    assert.equal(invoice.vat_rate, null);
    assert.equal(invoice.vat_amount_minor, null);
    assert.equal(invoice.total_minor, 1000);
    assert.equal(invoice.status, "draft_awaiting_vat_confirmation");
  });

  it("schedules a renewal reminder as a record, not a sent email", () => {
    const subscription = {
      id: "sub-2",
      plan_slug: "premium",
      billing_interval: "monthly",
      status: "active",
      current_period_start: "2026-11-01T00:00:00.000Z",
      current_period_end: "2026-12-01T00:00:00.000Z",
      cancel_at_period_end: false,
      cancelled_at: null,
      card_authorized: true,
      provider: "stripe_stub",
      provider_subscription_id: "stub_subscription_2",
    };
    const reminder = scheduleRenewalReminder("user-12", subscription, 7, NOW);
    assert.equal(reminder.status, "scheduled");
    assert.equal(reminder.sent, false);
    assert.equal(reminder.channel, "record_only");
    assert.equal(reminder.scheduled_for, "2026-11-24T00:00:00.000Z");
  });

  it("logs a refund request as pending admin review", () => {
    const config = testConfig();
    const log = [];
    const request = requestRefund(config, newFreeAccount("user-13"), "Charged after I cancelled.", NOW, log);
    assert.equal(request.status, "pending_admin_review");
    assert.equal(log.length, 1);
    assert.equal(log[0].id, request.id);
  });

  it("records an entitlement change in the change log with a version bump", () => {
    const config = testConfig();
    const next = recordEntitlementChange(config, {
      date: "2026-11-07",
      actor: "admin",
      field: "plans.free.entitlements.max_listing_packs",
      old_value: "1",
      new_value: "1",
      reason: "Test entry, no change in value.",
    });
    assert.equal(next.version, 2);
    assert.equal(next.change_log.length, 1);
    assert.equal(config.version, 1);
    assert.equal(config.change_log.length, 0);
  });
});
