// Billing provider registry tests: the billing core works through the
// BillingProvider interface in packages/billing/src/provider.ts, the
// stub is one registered implementation, and a second provider can be
// registered through config without editing the core. No real charge,
// no real Stripe key, no live payment flow. The fake second provider
// exists only in this test file. Prices in the test config are test
// values only, used to check the flow, and are not the product price.
// The shipped config keeps every price null.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BillingError,
  StripeStubProvider,
  billingProviderName,
  createBillingProvider,
  createEmailHook,
  listBillingProviders,
  listEmailProviders,
  loadEmailHookConfig,
  loadPlansConfig,
  registerBillingProvider,
  registerEmailProvider,
  resolveBillingProvider,
} from "../packages/billing/src/index.ts";
import {
  DevelopmentStubProvider,
  createProvider,
  listAiProviders,
  registerAiProvider,
} from "../packages/ai/src/index.ts";
import {
  LocalStubAuthProvider,
  listAuthProviders,
  registerAuthProvider,
  resolveAuthProvider,
} from "../packages/auth/src/index.ts";

const ROOT = new URL("../", import.meta.url).pathname;

// Test config only. Prices here are test values to check the flow.
// They are not the product price. The shipped config keeps prices
// null until Ali sets them.
function testConfig() {
  return {
    version: 1,
    billing_provider: "stripe_stub",
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

const checkoutRequest = {
  user_id: "user-provider-1",
  plan_slug: "premium",
  billing_interval: "monthly",
  authorized: true,
};

describe("billing provider: shipped config names the stub through config", () => {
  it("loads billing_provider stripe_stub from config/plans.json", () => {
    const config = loadPlansConfig();
    assert.equal(config.billing_provider, "stripe_stub");
    assert.equal(billingProviderName(config), "stripe_stub");
  });

  it("resolves the stub through the registry and the stub charges 0", () => {
    const config = testConfig();
    const provider = createBillingProvider(config);
    assert.equal(provider.name, "stripe_stub");
    assert.ok(provider instanceof StripeStubProvider);
    assert.ok(listBillingProviders().includes("stripe_stub"));
    const result = provider.createSubscription(config, checkoutRequest);
    assert.equal(result.provider, "stripe_stub");
    assert.equal(result.mode, "DEVELOPMENT STUB ONLY");
    assert.equal(result.status, "stub_no_charge");
    assert.equal(result.charge_amount_minor, 0);
    assert.ok(result.subscription_id.startsWith("stub_subscription_"));
  });

  it("falls back to the stub when billing_provider is null", () => {
    const config = testConfig();
    config.billing_provider = null;
    assert.equal(billingProviderName(config), "stripe_stub");
    assert.equal(createBillingProvider(config).name, "stripe_stub");
  });

  it("throws for a provider name with no registered implementation, instead of silently using the stub", () => {
    assert.throws(
      () => resolveBillingProvider("no_such_provider"),
      (error) => error instanceof BillingError && error.code === "billing_provider_not_configured",
    );
    const config = testConfig();
    config.billing_provider = "no_such_provider";
    assert.throws(
      () => createBillingProvider(config),
      (error) => error instanceof BillingError && error.code === "billing_provider_not_configured",
    );
  });
});

describe("billing provider: a second provider registers through config only", () => {
  it("calls the fake second provider through the interface and still charges 0", () => {
    // Fake provider, test only. It implements the same BillingProvider
    // interface and charges nothing. No core file is edited to add it.
    const fakeCalls = [];
    class FakeSecondProvider {
      name = "fake_second";
      createCheckoutSession(config, request) {
        fakeCalls.push({ method: "createCheckoutSession", plan: request.plan_slug });
        return {
          provider: this.name,
          mode: "FAKE TEST ONLY",
          status: "stub_no_charge",
          checkout_session_id: "fake_checkout_1",
          subscription_id: null,
          charge_amount_minor: 0,
          note: "Fake test provider, no charge.",
        };
      }
      createSubscription(config, request) {
        fakeCalls.push({ method: "createSubscription", plan: request.plan_slug });
        return {
          provider: this.name,
          mode: "FAKE TEST ONLY",
          status: "stub_no_charge",
          checkout_session_id: null,
          subscription_id: "fake_subscription_1",
          charge_amount_minor: 0,
          note: "Fake test provider, no charge.",
        };
      }
    }
    registerBillingProvider("fake_second", () => new FakeSecondProvider());
    assert.ok(listBillingProviders().includes("fake_second"));
    const config = testConfig();
    config.billing_provider = "fake_second";
    const provider = createBillingProvider(config);
    assert.equal(provider.name, "fake_second");
    assert.ok(!(provider instanceof StripeStubProvider));
    const checkout = provider.createCheckoutSession(config, checkoutRequest);
    assert.equal(checkout.provider, "fake_second");
    assert.equal(checkout.charge_amount_minor, 0);
    assert.equal(checkout.checkout_session_id, "fake_checkout_1");
    const subscription = provider.createSubscription(config, checkoutRequest);
    assert.equal(subscription.subscription_id, "fake_subscription_1");
    assert.equal(subscription.charge_amount_minor, 0);
    assert.deepEqual(fakeCalls, [
      { method: "createCheckoutSession", plan: "premium" },
      { method: "createSubscription", plan: "premium" },
    ]);
    // The stub is still registered and still the default afterwards.
    assert.equal(createBillingProvider(testConfig()).name, "stripe_stub");
  });

  it("the provider interface file does not import Stripe code directly", () => {
    const source = readFileSync(`${ROOT}packages/billing/src/provider.ts`, "utf8");
    const importLines = source.split("\n").filter((line) => /^\s*import[\s(]/.test(line));
    assert.ok(!importLines.some((line) => line.includes("stripe")), "provider.ts must not import Stripe code");
    assert.ok(!source.includes('from "./stripe-stub'), "provider.ts must not import stripe-stub.ts");
    assert.ok(!source.includes("STRIPE_SECRET_KEY"), "provider.ts must not name a Stripe secret");
    assert.ok(source.includes("BillingProvider"), "provider.ts defines the BillingProvider interface");
    assert.ok(source.includes("registerBillingProvider"), "provider.ts defines the registry");
  });
});

describe("provider registries: email and AI accept a registered second provider", () => {
  it("calls a registered fake email sender through the hook", () => {
    registerEmailProvider("fake-email", (message) => ({
      sent: true,
      provider: "fake-email",
      messageId: "fake_msg_1",
      reason: "sent_by_fake_test_provider",
      note: "Fake test provider.",
    }));
    assert.ok(listEmailProviders().includes("fake-email"));
    const config = loadEmailHookConfig({
      EMAIL_PROVIDER: "fake-email",
      EMAIL_FROM_ADDRESS: "noreply@example.com",
      EMAIL_API_KEY: "placeholder-not-a-real-key",
    });
    assert.equal(config.configured, true);
    const hook = createEmailHook(config);
    const attempt = hook.send({
      kind: "account_notice",
      to: "seller@example.com",
      subject: "Test",
      text: "Test.",
    });
    assert.equal(attempt.sent, true);
    assert.equal(attempt.provider, "fake-email");
    assert.equal(attempt.messageId, "fake_msg_1");
  });

  it("calls a registered fake AI provider through the AI interface", async () => {
    class FakeAiProvider {
      kind = "fake-ai";
      name = "fake-ai";
      async generate() {
        return { text: "Fake suggestion.", tags: null, checklist: null };
      }
    }
    registerAiProvider("fake-ai", () => new FakeAiProvider());
    assert.ok(listAiProviders().includes("fake-ai"));
    const provider = createProvider({
      provider: "fake-ai",
      model: null,
      budgetCap: null,
      budgetCapCurrency: null,
      creditsPerSuggestion: 1,
    });
    assert.equal(provider.name, "fake-ai");
    assert.ok(!(provider instanceof DevelopmentStubProvider));
    const output = await provider.generate({
      purpose: "title",
      facts: {
        productName: "Test Planner",
        format: "Sheets",
        formatDetail: "Google Sheets",
        tabCount: null,
        priceListMinor: null,
        priceLaunchMinor: null,
        currency: null,
        claims: [],
        features: [],
      },
      limits: { titleMaxChars: 140, tagMaxCount: 13, tagMaxChars: 20 },
      promptText: "Test prompt.",
      promptVersion: "1",
      promptSlug: "title-v1",
      nicheTone: null,
      nichePackSlug: null,
    });
    assert.equal(output.text, "Fake suggestion.");
    // An unregistered named AI provider still throws, as before.
    assert.throws(
      () =>
        createProvider({
          provider: "no_such_ai_provider",
          model: null,
          budgetCap: null,
          budgetCapCurrency: null,
          creditsPerSuggestion: 1,
        }),
      /not configured/,
    );
  });

  it("resolves a registered auth provider through the auth registry", () => {
    registerAuthProvider("email", () => new LocalStubAuthProvider({ defaultEdition: "listing-photos-generator" }));
    assert.ok(listAuthProviders().includes("email"));
    const provider = resolveAuthProvider("email");
    assert.equal(provider.name, "email");
    assert.ok(provider instanceof LocalStubAuthProvider);
    assert.throws(() => resolveAuthProvider("sso"), /not registered/);
  });
});
