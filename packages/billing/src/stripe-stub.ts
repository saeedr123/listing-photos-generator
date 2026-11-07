// Stripe provider interface and development stub.
// DEVELOPMENT STUB ONLY. No real Stripe keys, no real charges, no live
// payment flow, no spending. The stub records what would have happened and
// returns a stub record with charge amount zero. It never calls the network
// and never stores a real payment method. A live provider replaces this
// stub only after Ali decides the price, the Stripe account, and the VAT
// treatment, and only after a separate go ahead for payments.

import { BillingError } from "./types.ts";
import type { BillingInterval, PlansConfig } from "./types.ts";

export interface CheckoutRequest {
  user_id: string;
  plan_slug: string;
  billing_interval: BillingInterval;
  // Clear, separate authorization to charge. Trial start alone is never
  // authorization. A checkout without authorized true is refused.
  authorized: boolean;
  authorization_note?: string;
}

export interface CheckoutResult {
  provider: string;
  mode: string;
  status: "stub_no_charge" | "blocked";
  checkout_session_id: string | null;
  subscription_id: string | null;
  charge_amount_minor: number;
  note: string;
}

export interface BillingProvider {
  name: string;
  createCheckoutSession(config: PlansConfig, request: CheckoutRequest): CheckoutResult;
  createSubscription(
    config: PlansConfig,
    request: CheckoutRequest,
  ): CheckoutResult;
}

export const STUB_NOTICE =
  "DEVELOPMENT STUB ONLY. No real charge was made, no real Stripe key was used, and no live payment flow ran.";

export function newStubId(prefix: string): string {
  const random = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : String(Date.now()) + "-" + String(Math.floor(Math.random() * 1000000));
  return "stub_" + prefix + "_" + random;
}

export class StripeStubProvider implements BillingProvider {
  name = "stripe_stub";
  log: CheckoutResult[] = [];

  private guard(config: PlansConfig, request: CheckoutRequest): void {
    const plan = config.plans.find((candidate) => candidate.slug === request.plan_slug);
    if (!plan) {
      throw new BillingError("plan_not_found", "Plan not found: " + request.plan_slug + ".");
    }
    const priceSet =
      plan.price_amount_minor !== null ||
      plan.price_monthly_amount_minor !== null ||
      plan.price_annual_amount_minor !== null;
    if (!priceSet) {
      throw new BillingError(
        "price_not_set",
        "Price not set yet. Checkout is blocked. No payment can be taken until the owner sets a price. The price is decided by Ali, not by this stub.",
      );
    }
    if (!request.authorized) {
      throw new BillingError(
        "charge_not_authorized",
        "No charge without authorization. Confirm the price, the renewal date, and the cancel method first, then authorize the payment in a separate step.",
      );
    }
    if (request.billing_interval === null) {
      throw new BillingError(
        "billing_interval_not_set",
        "Billing interval not set. Choose monthly or annual before checkout. The interval is decided by the owner.",
      );
    }
  }

  createCheckoutSession(config: PlansConfig, request: CheckoutRequest): CheckoutResult {
    this.guard(config, request);
    const result: CheckoutResult = {
      provider: this.name,
      mode: "DEVELOPMENT STUB ONLY",
      status: "stub_no_charge",
      checkout_session_id: newStubId("checkout"),
      subscription_id: null,
      charge_amount_minor: 0,
      note: STUB_NOTICE,
    };
    this.log.push(result);
    return result;
  }

  createSubscription(config: PlansConfig, request: CheckoutRequest): CheckoutResult {
    this.guard(config, request);
    const result: CheckoutResult = {
      provider: this.name,
      mode: "DEVELOPMENT STUB ONLY",
      status: "stub_no_charge",
      checkout_session_id: null,
      subscription_id: newStubId("subscription"),
      charge_amount_minor: 0,
      note: STUB_NOTICE,
    };
    this.log.push(result);
    return result;
  }
}

// The default provider for this build is always the stub. A live Stripe
// provider must be wired in by a separate decision, with real keys in the
// secure secret store, never in code.
export function defaultBillingProvider(): BillingProvider {
  return new StripeStubProvider();
}
