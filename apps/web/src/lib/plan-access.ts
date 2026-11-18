// Plan limits for the signed in seller. Server only.
//
// The plan comes from the seller's subscription and trial records. With
// no payment provider connected yet, nobody has a subscription, so every
// seller is on the free plan unless a trial or subscription row exists.
// Limits come from config/plans.json. Admin accounts are not limited,
// so the owner can use the tool before billing exists.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  InMemoryBillingStore,
  PrismaBillingStore,
  canCreatePack,
  canUseMockup,
  type AccountBillingState,
  type BillingStore,
  type GateResult,
  type PlansConfig,
  type PrismaBillingClient,
} from "../../../../packages/billing/src/index.ts";
import type { PublicUser } from "../../../../packages/auth/src/types.ts";
import { getPrismaClient } from "./db";

const holder = globalThis as unknown as { __lpgBillingMemory?: InMemoryBillingStore; __lpgPlans?: PlansConfig };

function plansConfig(): PlansConfig {
  if (!holder.__lpgPlans) {
    holder.__lpgPlans = JSON.parse(readFileSync(join(process.cwd(), "..", "..", "config", "plans.json"), "utf8")) as PlansConfig;
  }
  return holder.__lpgPlans;
}

async function billingStore(): Promise<BillingStore> {
  const client = await getPrismaClient();
  if (client) return new PrismaBillingStore(client as PrismaBillingClient);
  if (!holder.__lpgBillingMemory) holder.__lpgBillingMemory = new InMemoryBillingStore();
  return holder.__lpgBillingMemory;
}

export async function billingState(user: PublicUser, packsCreated: number): Promise<AccountBillingState> {
  const store = await billingStore();
  return store.getAccountBillingState(user.id, { packs_created: packsCreated, ai_credits_used_this_month: 0, exports_used_this_trial: 0, trials_used: 0 });
}

const ADMIN_ALLOWED: GateResult = { allowed: true, reason: "Admin accounts are not limited by plan." };

export async function mayCreatePack(user: PublicUser, packsCreated: number): Promise<GateResult> {
  if (user.role === "admin") return ADMIN_ALLOWED;
  return canCreatePack(plansConfig(), await billingState(user, packsCreated), new Date().toISOString());
}

export async function mayUsePremiumMockups(user: PublicUser): Promise<GateResult> {
  if (user.role === "admin") return ADMIN_ALLOWED;
  return canUseMockup(plansConfig(), await billingState(user, 0), new Date().toISOString(), "premium");
}
