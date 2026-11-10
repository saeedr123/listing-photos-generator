// Billing tests, per PROMPT.md section 16 and section 23.
// Entitlements, trial, Stripe stub, VAT placeholder, cancel and refund.
// No real charge, no real Stripe key, no live payment flow. Prices in the
// test config are test values only, used to check the maths, and are not
// the product price. The shipped config keeps every price null.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BillingError,
  InMemoryBillingStore,
  PrismaBillingStore,
  StripeStubProvider,
  annualSaving,
  buildBillingTerms,
  buildInvoiceDraft,
  buildRenewalReminderEmail,
  canCreatePack,
  canDownloadPack,
  canEditPack,
  canViewPack,
  cancelSubscription,
  createBillingStore,
  createEmailHook,
  describeEmailConfig,
  expireTrial,
  getVatTreatment,
  hasAccessUntilPeriodEnd,
  loadEmailHookConfig,
  loadFeatureDecisions,
  loadPlansConfig,
  mockupPricing,
  newFreeAccount,
  reconciliationMode,
  recordEntitlementChange,
  requestRefund,
  scheduleRenewalReminder,
  scheduleTrialEndReminder,
  sendReminderEmail,
  startTrial,
  trialShape,
  validateFeatureDecisions,
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

describe("billing: Prisma store with a fake Prisma client", () => {
  function makeFakePrismaClient() {
    const subs = [];
    const trials = [];
    const ents = [];
    const ledgers = [];
    const usage = [];
    const refunds = [];
    let n = 0;
    const nextId = (prefix) => prefix + String(++n);
    const stamp = () => new Date("2026-11-07T00:00:00.000Z");
    const byUserDesc = (rows, userId) =>
      rows.filter((row) => row.user_id === userId).sort((a, b) => b.created_at - a.created_at);
    const refundsByUserDesc = (userId) =>
      refunds
        .filter((row) => row.user_id === userId)
        .sort((a, b) => b.requested_at.getTime() - a.requested_at.getTime());
    return {
      subscription: {
        findMany: async ({ where }) => byUserDesc(subs, where.user_id),
        create: async ({ data }) => {
          const row = { id: nextId("sub_"), ...data, created_at: stamp(), updated_at: stamp() };
          subs.push(row);
          return row;
        },
        update: async ({ where, data }) => {
          const row = subs.find((entry) => entry.id === where.id);
          Object.assign(row, data, { updated_at: stamp() });
          return row;
        },
      },
      trial: {
        findMany: async ({ where }) => byUserDesc(trials, where.user_id),
        create: async ({ data }) => {
          const row = { id: nextId("trial_"), ...data, created_at: stamp(), updated_at: stamp() };
          trials.push(row);
          return row;
        },
        update: async ({ where, data }) => {
          const row = trials.find((entry) => entry.id === where.id);
          Object.assign(row, data, { updated_at: stamp() });
          return row;
        },
      },
      userEntitlement: {
        create: async ({ data }) => {
          const row = { id: nextId("ent_"), ...data, created_at: stamp(), updated_at: stamp() };
          ents.push(row);
          return row;
        },
        findMany: async ({ where }) => byUserDesc(ents, where.user_id),
      },
      aICreditLedger: {
        findUnique: async ({ where }) => {
          const key = where.user_id_period_start_period_end;
          return ledgers.find(
            (row) =>
              row.user_id === key.user_id &&
              row.period_start.getTime() === key.period_start.getTime() &&
              row.period_end.getTime() === key.period_end.getTime(),
          ) ?? null;
        },
        create: async ({ data }) => {
          const row = { id: nextId("ledger_"), ...data, created_at: stamp(), updated_at: stamp() };
          ledgers.push(row);
          return row;
        },
        update: async ({ where, data }) => {
          const row = ledgers.find((entry) => entry.id === where.id);
          Object.assign(row, data, { updated_at: stamp() });
          return row;
        },
      },
      aIUsageLog: {
        create: async ({ data }) => {
          const row = { id: nextId("aiuse_"), ...data, created_at: stamp() };
          usage.push(row);
          return row;
        },
        findMany: async ({ where }) => byUserDesc(usage, where.user_id),
      },
      refundRequest: {
        create: async ({ data }) => {
          const row = { id: nextId("refund_"), ...data, created_at: stamp(), updated_at: stamp() };
          refunds.push(row);
          return row;
        },
        findMany: async ({ where }) => refundsByUserDesc(where.user_id),
      },
    };
  }

  function makePrismaStore() {
    return new PrismaBillingStore(makeFakePrismaClient(), {
      planIdBySlug: { free: "plan-free", premium: "plan-premium" },
      planSlugById: { "plan-free": "free", "plan-premium": "premium" },
    });
  }

  it("persists and reads back a subscription, with the documented mapping gap", async () => {
    const store = makePrismaStore();
    assert.equal(await store.getSubscription("user-20"), null);
    const saved = await store.saveSubscription("user-20", {
      id: "sub-20",
      plan_slug: "premium",
      billing_interval: "monthly",
      status: "active",
      current_period_start: "2026-11-01T00:00:00.000Z",
      current_period_end: "2026-12-01T00:00:00.000Z",
      cancel_at_period_end: false,
      cancelled_at: "2026-11-07T00:00:00.000Z",
      card_authorized: true,
      provider: "stripe_stub",
      provider_subscription_id: "stub_subscription_20",
    });
    assert.equal(saved.plan_slug, "premium");
    assert.equal(saved.status, "active");
    assert.equal(saved.current_period_end, "2026-12-01T00:00:00.000Z");
    // Documented gap: no cancelled_at or card_authorized column exists
    // in the Subscription model, so they read back as null and false.
    assert.equal(saved.cancelled_at, null);
    assert.equal(saved.card_authorized, false);
    const again = await store.getSubscription("user-20");
    assert.equal(again.plan_slug, "premium");
    assert.equal(again.provider_subscription_id, "stub_subscription_20");
  });

  it("persists and reads back a trial and an entitlement", async () => {
    const store = makePrismaStore();
    const trial = await store.saveTrial(
      "user-21",
      {
        plan_slug: "premium",
        starts_at: NOW,
        ends_at: "2026-11-14T00:00:00.000Z",
        status: "active",
        requires_card: false,
        card_taken: false,
        ai_credits_used: 0,
        exports_used: 0,
        packs_created: 0,
      },
      { ai_credit_allowance: null, export_allowance: null, listing_pack_allowance: null },
    );
    assert.equal(trial.status, "active");
    assert.equal(trial.ends_at, "2026-11-14T00:00:00.000Z");
    const granted = await store.grantEntitlement({
      userId: "user-21",
      entitlementKey: "max_listing_packs",
      limitValueNumber: 5,
      grantedByUserId: "admin-1",
      grantedReason: "Test grant, not a real entitlement.",
    });
    assert.equal(granted.entitlement_key, "max_listing_packs");
    assert.equal(granted.limit_value_number, 5);
    const listed = await store.listEntitlements("user-21");
    assert.equal(listed.length, 1);
    assert.equal(listed[0].id, granted.id);
  });

  it("records AI usage in the ledger and the usage log, accumulating credits used", async () => {
    const store = makePrismaStore();
    const first = await store.recordAiUsage({
      userId: "user-22",
      operation: "title",
      creditsConsumed: 1,
      periodStartIso: "2026-11-01T00:00:00.000Z",
      periodEndIso: "2026-12-01T00:00:00.000Z",
      creditsGranted: 10,
      provider: "development-stub",
      status: "suggestion",
    });
    assert.equal(first.balance.credits_used, 1);
    assert.equal(first.balance.credits_remaining, 9);
    assert.equal(first.usage.operation, "title");
    const second = await store.recordAiUsage({
      userId: "user-22",
      operation: "description",
      creditsConsumed: 1,
      periodStartIso: "2026-11-01T00:00:00.000Z",
      periodEndIso: "2026-12-01T00:00:00.000Z",
      provider: "development-stub",
      status: "suggestion",
    });
    assert.equal(second.balance.credits_used, 2);
    assert.equal(second.balance.credits_remaining, 8);
    const balance = await store.getAiCreditBalance("user-22", "2026-11-01T00:00:00.000Z", "2026-12-01T00:00:00.000Z");
    assert.equal(balance.credits_used, 2);
    const logs = await store.listAiUsage("user-22");
    assert.equal(logs.length, 2);
  });

  it("persists a refund request in the RefundRequest table", async () => {
    const store = makePrismaStore();
    const log = [];
    const request = requestRefund(testConfig(), newFreeAccount("user-23"), "Charged after I cancelled.", NOW, log);
    const saved = await store.saveRefundRequest(request);
    assert.equal(saved.persisted, true);
    assert.equal(saved.persisted_via, "prisma_refund_request");
    assert.equal(saved.note, null);
    // The row id is database generated, not the "refund_" prefixed id
    // built by requestRefund, which is not a valid UUID.
    assert.notEqual(saved.request.id, request.id);
    assert.equal(saved.request.user_id, "user-23");
    assert.equal(saved.request.status, "pending_admin_review");
    assert.equal(saved.request.reason, "Charged after I cancelled.");
    const listed = await store.listRefundRequests("user-23");
    assert.equal(listed.length, 1);
    assert.equal(listed[0].id, saved.request.id);
    assert.equal(listed[0].status, "pending_admin_review");
    assert.equal(listed[0].requested_at, NOW);
  });

  it("lists refund requests scoped to the requesting user", async () => {
    const store = makePrismaStore();
    const log = [];
    await store.saveRefundRequest(requestRefund(testConfig(), newFreeAccount("user-23"), "Charged after I cancelled.", NOW, log));
    await store.saveRefundRequest(requestRefund(testConfig(), newFreeAccount("user-24"), "Charged twice.", NOW, log));
    const mine = await store.listRefundRequests("user-23");
    assert.equal(mine.length, 1);
    assert.equal(mine[0].user_id, "user-23");
    assert.equal(mine[0].reason, "Charged after I cancelled.");
    const theirs = await store.listRefundRequests("user-24");
    assert.equal(theirs.length, 1);
    assert.equal(theirs[0].reason, "Charged twice.");
    assert.equal((await store.listRefundRequests("user-99")).length, 0);
  });

  it("lists two requests for the same user in requested_at order", async () => {
    const store = makePrismaStore();
    const log = [];
    const first = requestRefund(testConfig(), newFreeAccount("user-23"), "First request.", "2026-11-07T00:00:00.000Z", log);
    const second = requestRefund(testConfig(), newFreeAccount("user-23"), "Second request.", "2026-11-08T00:00:00.000Z", log);
    await store.saveRefundRequest(first);
    await store.saveRefundRequest(second);
    const listed = await store.listRefundRequests("user-23");
    assert.equal(listed.length, 2);
    assert.equal(listed[0].reason, "Second request.");
    assert.equal(listed[0].requested_at, "2026-11-08T00:00:00.000Z");
    assert.equal(listed[1].reason, "First request.");
    assert.equal(listed[1].requested_at, "2026-11-07T00:00:00.000Z");
  });

  it("assembles an account billing state from the stored rows", async () => {
    const store = makePrismaStore();
    await store.saveSubscription("user-24", {
      id: "sub-24",
      plan_slug: "premium",
      billing_interval: "monthly",
      status: "active",
      current_period_start: "2026-11-01T00:00:00.000Z",
      current_period_end: "2026-12-01T00:00:00.000Z",
      cancel_at_period_end: false,
      cancelled_at: null,
      card_authorized: false,
      provider: "stripe_stub",
      provider_subscription_id: null,
    });
    const state = await store.getAccountBillingState("user-24", {
      packs_created: 2,
      ai_credits_used_this_month: 3,
      exports_used_this_trial: 0,
      trials_used: 0,
    });
    assert.equal(state.plan_slug, "premium");
    assert.equal(state.packs_created, 2);
    assert.equal(state.subscription.status, "active");
    assert.equal(state.trial, null);
  });

  it("refuses to save a subscription when the plan id cannot be resolved", async () => {
    const store = new PrismaBillingStore(makeFakePrismaClient(), {});
    await assert.rejects(
      () =>
        store.saveSubscription("user-25", {
          id: "sub-25",
          plan_slug: "premium",
          billing_interval: "monthly",
          status: "active",
          current_period_start: null,
          current_period_end: null,
          cancel_at_period_end: false,
          cancelled_at: null,
          card_authorized: false,
          provider: "stripe_stub",
          provider_subscription_id: null,
        }),
      (error) => error instanceof BillingError && error.code === "plan_id_not_resolved",
    );
  });
});

describe("billing: in memory store from createBillingStore(null)", () => {
  it("persists a subscription and AI usage without a live database", async () => {
    const store = createBillingStore(null);
    assert.ok(store instanceof InMemoryBillingStore);
    await store.saveSubscription("user-26", {
      id: "sub-26",
      plan_slug: "free",
      billing_interval: null,
      status: "active",
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      cancelled_at: null,
      card_authorized: false,
      provider: "stripe_stub",
      provider_subscription_id: null,
    });
    const found = await store.getSubscription("user-26");
    assert.equal(found.plan_slug, "free");
    const used = await store.recordAiUsage({
      userId: "user-26",
      operation: "tags",
      creditsConsumed: 1,
      periodStartIso: "2026-11-01T00:00:00.000Z",
      periodEndIso: "2026-12-01T00:00:00.000Z",
      creditsGranted: 5,
    });
    assert.equal(used.balance.credits_used, 1);
    assert.equal(used.balance.credits_remaining, 4);
  });

  it("persists refund requests in its own in memory table, scoped per user and in requested_at order", async () => {
    const store = createBillingStore(null);
    const log = [];
    const first = await store.saveRefundRequest(requestRefund(testConfig(), newFreeAccount("user-27"), "First request.", NOW, log));
    assert.equal(first.persisted, true);
    assert.equal(first.persisted_via, "in_memory_store");
    assert.equal(first.note, null);
    const second = await store.saveRefundRequest(
      requestRefund(testConfig(), newFreeAccount("user-27"), "Second request.", "2026-11-08T00:00:00.000Z", log),
    );
    await store.saveRefundRequest(requestRefund(testConfig(), newFreeAccount("user-28"), "Other user.", NOW, log));
    const listed = await store.listRefundRequests("user-27");
    assert.equal(listed.length, 2);
    assert.equal(listed[0].reason, "Second request.");
    assert.equal(listed[0].id, second.request.id);
    assert.equal(listed[1].reason, "First request.");
    assert.equal(listed[1].id, first.request.id);
    assert.equal((await store.listRefundRequests("user-28")).length, 1);
  });
});

describe("billing: email hook with no provider configured", () => {
  it("loads an unconfigured hook from an empty env and sends nothing", () => {
    const config = loadEmailHookConfig({});
    assert.equal(config.provider, null);
    assert.equal(config.fromAddress, null);
    assert.equal(config.apiKeyEnvVar, "EMAIL_API_KEY");
    assert.equal(config.apiKeySet, false);
    assert.equal(config.configured, false);
    const hook = createEmailHook(config);
    const attempt = hook.send({
      kind: "account_notice",
      to: "seller@example.com",
      subject: "Test",
      text: "Test.",
    });
    assert.equal(attempt.sent, false);
    assert.equal(attempt.reason, "no_email_provider_configured");
    assert.equal(attempt.messageId, null);
    assert.match(describeEmailConfig(config), /Email is not configured/);
    assert.match(describeEmailConfig(config), /EMAIL_PROVIDER/);
    assert.match(describeEmailConfig(config), /EMAIL_FROM_ADDRESS/);
    assert.match(describeEmailConfig(config), /EMAIL_API_KEY/);
  });

  it("builds a renewal reminder email as a record and leaves it unsent with no provider", () => {
    const subscription = {
      id: "sub-27",
      plan_slug: "premium",
      billing_interval: "monthly",
      status: "active",
      current_period_start: "2026-11-01T00:00:00.000Z",
      current_period_end: "2026-12-01T00:00:00.000Z",
      cancel_at_period_end: false,
      cancelled_at: null,
      card_authorized: true,
      provider: "stripe_stub",
      provider_subscription_id: "stub_subscription_27",
    };
    const reminder = scheduleRenewalReminder("user-27", subscription, 7, NOW);
    const hook = createEmailHook(loadEmailHookConfig({}));
    const email = buildRenewalReminderEmail(reminder, {
      to: "seller@example.com",
      renewalDateText: "2026-12-01",
      priceText: "Price not set yet",
      cancelMethodText: "Cancel any time in your account.",
    });
    assert.equal(email.kind, "renewal_reminder");
    assert.match(email.text, /2026-12-01/);
    assert.match(email.text, /Price not set yet/);
    const outcome = sendReminderEmail(hook, reminder, email);
    assert.equal(outcome.attempt.sent, false);
    assert.equal(outcome.reminder.sent, false);
    assert.equal(outcome.reminder.status, "scheduled");
  });

  it("builds a trial end reminder email stating the plan returns to Free with no charge", () => {
    const config = testConfig();
    const started = startTrial(config, newFreeAccount("user-28"), NOW);
    const reminder = scheduleTrialEndReminder("user-28", started.trial, 1, NOW);
    const hook = createEmailHook(loadEmailHookConfig({}));
    const outcome = sendReminderEmail(
      hook,
      reminder,
      {
        kind: "trial_end_reminder",
        to: "seller@example.com",
        subject: "Your trial ends on 2026-11-14",
        text: "Your trial ends on 2026-11-14. Your plan returns to Free. No charge happens without clear authorization.",
      },
    );
    assert.equal(outcome.attempt.sent, false);
    assert.equal(outcome.reminder.sent, false);
  });

  it("returns not implemented, not sent, when a provider is named but no send step exists", () => {
    const config = loadEmailHookConfig({
      EMAIL_PROVIDER: "example-provider",
      EMAIL_FROM_ADDRESS: "noreply@example.com",
      EMAIL_API_KEY: "placeholder-not-a-real-key",
    });
    assert.equal(config.configured, true);
    const hook = createEmailHook(config);
    const attempt = hook.send({
      kind: "renewal_reminder",
      to: "seller@example.com",
      subject: "Renewal",
      text: "Renewal.",
    });
    assert.equal(attempt.sent, false);
    assert.equal(attempt.reason, "email_provider_not_implemented");
  });
});

describe("billing: feature decisions hold the safe defaults", () => {
  it("loads flag only, per account trial, and plan entitlements from config", () => {
    const config = loadFeatureDecisions();
    assert.equal(reconciliationMode(config), "flag_only");
    assert.equal(trialShape(config), "per_account_7_days_no_card");
    assert.equal(mockupPricing(config), "follow_plan_entitlements");
    for (const decision of config.decisions) {
      assert.equal(decision.current, decision.default);
      assert.equal(decision.status, "awaiting_owner_decision");
      assert.equal(decision.decided_by, null);
    }
  });

  it("rejects a decision value that is not one of its options", () => {
    const bad = {
      version: 1,
      decisions: [
        {
          key: "reconciliation_mode",
          name: "Reconciliation",
          current: "invented_value",
          default: "flag_only",
          options: ["flag_only", "auto_fix"],
          status: "awaiting_owner_decision",
          decision_needed: "Test.",
          decided_by: null,
          decided_date: null,
        },
      ],
    };
    assert.throws(
      () => validateFeatureDecisions(bad),
      (error) => error instanceof BillingError && error.code === "feature_decisions_invalid",
    );
  });
});
