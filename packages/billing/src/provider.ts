// Billing provider interface and registry.
// Provider agnostic seam: the billing core talks only to the
// BillingProvider interface in this file. It never imports a provider
// implementation, and it never imports Stripe code. Stripe is one
// provider behind this interface, and it arrives later as a registered
// implementation, with real keys in the secure secret store, never in
// code. The only working provider in this build is the development
// stub in stripe-stub.ts, which registers itself under the name
// "stripe_stub" and always charges 0. A second provider is added by
// registering a factory under its own name and naming it in config,
// never by editing the billing core, the builder, the templates, or
// the mockups.
//
// Config key: PlansConfig.billing_provider in config/plans.json.
// Value "stripe_stub" in the shipped config. Null or empty means the
// same stub. An unknown name throws BillingError with code
// billing_provider_not_configured, instead of silently falling back
// to the stub and pretending to be that provider.

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

export type BillingProviderFactory = () => BillingProvider;

// Name of the stub provider, as config data only. The implementation
// lives in stripe-stub.ts and registers itself under this name. This
// file never imports that implementation.
export const DEFAULT_BILLING_PROVIDER_NAME = "stripe_stub";

const registry = new Map<string, BillingProviderFactory>();

export function registerBillingProvider(
  name: string,
  factory: BillingProviderFactory,
): void {
  if (!name || typeof factory !== "function") {
    throw new BillingError(
      "billing_provider_invalid",
      "A billing provider needs a name and a factory function.",
    );
  }
  registry.set(name, factory);
}

export function listBillingProviders(): string[] {
  return [...registry.keys()].sort();
}

export function resolveBillingProvider(name?: string | null): BillingProvider {
  const wanted = name && name !== "" ? name : DEFAULT_BILLING_PROVIDER_NAME;
  const factory = registry.get(wanted);
  if (!factory) {
    throw new BillingError(
      "billing_provider_not_configured",
      "Billing provider \"" + wanted + "\" is not registered. No provider implementation is wired in for that name, so no checkout runs. Register the provider, or name a registered provider in config/plans.json under billing_provider.",
    );
  }
  const provider = factory();
  if (!provider || provider.name !== wanted) {
    throw new BillingError(
      "billing_provider_invalid",
      "Billing provider factory for \"" + wanted + "\" did not return a provider with that name.",
    );
  }
  return provider;
}

// Read the provider name from the plans config. Null, empty, or
// missing means the stub. The provider itself is resolved through
// the registry, never by importing an implementation here.
export function billingProviderName(config: PlansConfig): string {
  const name = (config as PlansConfig).billing_provider;
  return name && name !== "" ? name : DEFAULT_BILLING_PROVIDER_NAME;
}

export function createBillingProvider(config: PlansConfig): BillingProvider {
  return resolveBillingProvider(billingProviderName(config));
}
