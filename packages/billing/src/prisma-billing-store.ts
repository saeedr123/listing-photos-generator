// Prisma backed billing store, plus an in memory test double.
// This module persists billing records through Prisma delegates instead
// of holding them only in session or in memory. It uses the existing
// Prisma models Subscription, Trial, UserEntitlement, AICreditLedger,
// and AIUsageLog from prisma/schema.prisma. No schema change is made
// here, and no new table is added.
//
// The caller supplies a Prisma client, or a test double with the same
// delegates. The client is typed as a minimal delegate interface, not
// as the generated PrismaClient, so this package compiles and tests
// without a generated client or a live database. When a real client is
// passed, the calls below are real Prisma calls. Pass null to
// createBillingStore to get the in memory store for tests and local
// development.
//
// Mapping gaps, stated plainly because the schema has no column for
// them, so they are not persisted:
// - SubscriptionState.cancelled_at has no column. The cancelled state
//   itself is persisted through status "cancelled", but the exact
//   cancelled timestamp is not. Reading a subscription back returns
//   cancelled_at null.
// - SubscriptionState.card_authorized has no column. Reading a
//   subscription back returns card_authorized false.
// - TrialState.card_taken, ai_credits_used, exports_used, and
//   packs_created have no columns on the Trial model. The trial
//   allowances are persisted, the per trial usage counters are not.
// - There is no RefundRequest model in prisma/schema.prisma, so a
//   refund request has no Prisma table to persist into. Refund
//   requests are held in the store log and listed back from it, and
//   saveRefundRequest says so in its result. A dedicated table needs
//   a schema change, which is a coordinator decision, not made here.
//
// Stripe stays a development stub with charge always 0, the VAT rate
// stays null, and prices and Stripe ids stay null placeholders. This
// store never charges anything and never holds a real key.

import { BillingError } from "./types.ts";
import type {
  AccountBillingState,
  SubscriptionState,
  TrialState,
} from "./types.ts";
import type { RefundRequest } from "./cancel-refund.ts";

// Minimal Prisma row shapes. Only the fields this store reads or
// writes. Dates arrive as Date objects from a real client.
export interface PrismaSubscriptionRow {
  id: string;
  user_id: string;
  plan_id: string;
  payment_provider: string | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  status: string;
  current_period_start: Date | null;
  current_period_end: Date | null;
  cancel_at_period_end: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PrismaTrialRow {
  id: string;
  user_id: string;
  plan_id: string;
  starts_at: Date;
  ends_at: Date;
  status: string;
  requires_card: boolean;
  ai_credit_allowance: number | null;
  export_allowance: number | null;
  listing_pack_allowance: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface PrismaUserEntitlementRow {
  id: string;
  user_id: string;
  entitlement_key: string;
  limit_value_text: string | null;
  limit_value_number: number | null;
  granted_by_user_id: string;
  granted_reason: string | null;
  expires_at: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PrismaAICreditLedgerRow {
  id: string;
  user_id: string;
  period_start: Date;
  period_end: Date;
  credits_granted: number;
  credits_used: number;
  created_at: Date;
  updated_at: Date;
}

export interface PrismaAIUsageLogRow {
  id: string;
  user_id: string;
  listing_pack_id: string | null;
  platform_id: string | null;
  pack_version_id: string | null;
  copy_prompt_version_id: string | null;
  operation: string;
  credits_consumed: number;
  provider: string | null;
  model: string | null;
  status: string;
  error_message: string | null;
  created_at: Date;
}

// Minimal Prisma delegate shapes. Only the methods this store calls.
export interface PrismaBillingClient {
  subscription: {
    findMany(args: { where: Record<string, unknown>; orderBy?: Record<string, unknown> }): Promise<PrismaSubscriptionRow[]>;
    create(args: { data: Record<string, unknown> }): Promise<PrismaSubscriptionRow>;
    update(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<PrismaSubscriptionRow>;
  };
  trial: {
    findMany(args: { where: Record<string, unknown>; orderBy?: Record<string, unknown> }): Promise<PrismaTrialRow[]>;
    create(args: { data: Record<string, unknown> }): Promise<PrismaTrialRow>;
    update(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<PrismaTrialRow>;
  };
  userEntitlement: {
    create(args: { data: Record<string, unknown> }): Promise<PrismaUserEntitlementRow>;
    findMany(args: { where: Record<string, unknown>; orderBy?: Record<string, unknown> }): Promise<PrismaUserEntitlementRow[]>;
  };
  aICreditLedger: {
    findUnique(args: { where: Record<string, unknown> }): Promise<PrismaAICreditLedgerRow | null>;
    create(args: { data: Record<string, unknown> }): Promise<PrismaAICreditLedgerRow>;
    update(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<PrismaAICreditLedgerRow>;
  };
  aIUsageLog: {
    create(args: { data: Record<string, unknown> }): Promise<PrismaAIUsageLogRow>;
    findMany(args: { where: Record<string, unknown>; orderBy?: Record<string, unknown> }): Promise<PrismaAIUsageLogRow[]>;
  };
}

export interface BillingStoreOptions {
  // Plan slug to Plan row id, for saving. A resolver function can be
  // passed instead when the ids come from the database.
  planIdBySlug?: Record<string, string>;
  // Plan row id to plan slug, for reading rows back.
  planSlugById?: Record<string, string>;
  resolvePlanId?: (slug: string) => Promise<string | null>;
}

export interface GrantEntitlementInput {
  userId: string;
  entitlementKey: string;
  limitValueText?: string | null;
  limitValueNumber?: number | null;
  grantedByUserId: string;
  grantedReason?: string | null;
  expiresAt?: string | null;
}

export interface EntitlementRecord {
  id: string;
  user_id: string;
  entitlement_key: string;
  limit_value_text: string | null;
  limit_value_number: number | null;
  granted_by_user_id: string;
  granted_reason: string | null;
  expires_at: string | null;
  is_active: boolean;
}

export interface TrialAllowances {
  ai_credit_allowance: number | null;
  export_allowance: number | null;
  listing_pack_allowance: number | null;
}

export interface RecordAiUsageInput {
  userId: string;
  operation: string;
  creditsConsumed: number;
  periodStartIso: string;
  periodEndIso: string;
  creditsGranted?: number;
  listingPackId?: string | null;
  provider?: string | null;
  model?: string | null;
  status?: string;
  errorMessage?: string | null;
}

export interface AiCreditBalance {
  user_id: string;
  period_start: string;
  period_end: string;
  credits_granted: number;
  credits_used: number;
  credits_remaining: number | null;
}

export interface AiUsageRecord {
  id: string;
  user_id: string;
  operation: string;
  credits_consumed: number;
  provider: string | null;
  model: string | null;
  status: string;
  created_at: string;
}

export interface SavedRefundRequest {
  request: RefundRequest;
  persisted: boolean;
  persisted_via: "store_log_only";
  note: string;
}

export interface BillingStore {
  saveSubscription(userId: string, subscription: SubscriptionState): Promise<SubscriptionState>;
  getSubscription(userId: string): Promise<SubscriptionState | null>;
  saveTrial(userId: string, trial: TrialState, allowances: TrialAllowances): Promise<TrialState>;
  getTrial(userId: string): Promise<TrialState | null>;
  grantEntitlement(input: GrantEntitlementInput): Promise<EntitlementRecord>;
  listEntitlements(userId: string): Promise<EntitlementRecord[]>;
  recordAiUsage(input: RecordAiUsageInput): Promise<{ balance: AiCreditBalance; usage: AiUsageRecord }>;
  getAiCreditBalance(userId: string, periodStartIso: string, periodEndIso: string): Promise<AiCreditBalance | null>;
  listAiUsage(userId: string): Promise<AiUsageRecord[]>;
  saveRefundRequest(request: RefundRequest): Promise<SavedRefundRequest>;
  listRefundRequests(userId: string): Promise<RefundRequest[]>;
  getAccountBillingState(
    userId: string,
    counts: { packs_created: number; ai_credits_used_this_month: number; exports_used_this_trial: number; trials_used: number },
  ): Promise<AccountBillingState>;
}

function iso(value: Date | string | null): string | null {
  if (value === null) {
    return null;
  }
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function decimalToNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "object" && value !== null && "toNumber" in value && typeof (value as { toNumber: unknown }).toNumber === "function") {
    return (value as { toNumber: () => number }).toNumber();
  }
  return null;
}

function newId(prefix: string): string {
  const random = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : String(Date.now()) + "-" + String(Math.floor(Math.random() * 1000000));
  return prefix + random;
}

const REFUND_STORE_NOTE =
  "No RefundRequest model exists in prisma/schema.prisma, so this refund request is held in the store log only. It is listed back by listRefundRequests, but it is not in a Prisma table. A dedicated table needs a schema change.";

export class PrismaBillingStore implements BillingStore {
  private client: PrismaBillingClient;
  private options: BillingStoreOptions;
  private refundLog: RefundRequest[] = [];

  constructor(client: PrismaBillingClient, options: BillingStoreOptions = {}) {
    this.client = client;
    this.options = options;
  }

  private async resolvePlanId(slug: string): Promise<string> {
    if (this.options.planIdBySlug && this.options.planIdBySlug[slug]) {
      return this.options.planIdBySlug[slug];
    }
    if (this.options.resolvePlanId) {
      const id = await this.options.resolvePlanId(slug);
      if (id) {
        return id;
      }
    }
    throw new BillingError(
      "plan_id_not_resolved",
      "Plan id for slug " + slug + " is not known to the billing store. Pass planIdBySlug or resolvePlanId when the store is built, so the subscription can be saved against a Plan row.",
    );
  }

  private planSlugForId(planId: string): string {
    if (this.options.planSlugById && this.options.planSlugById[planId]) {
      return this.options.planSlugById[planId];
    }
    throw new BillingError(
      "plan_slug_not_mapped",
      "Plan slug for Plan row " + planId + " is not known to the billing store. Pass planSlugById when the store is built, so rows can be read back with their plan slug.",
    );
  }

  private subscriptionToState(row: PrismaSubscriptionRow): SubscriptionState {
    return {
      id: row.id,
      plan_slug: this.planSlugForId(row.plan_id),
      billing_interval: null,
      status: row.status as SubscriptionState["status"],
      current_period_start: iso(row.current_period_start),
      current_period_end: iso(row.current_period_end),
      cancel_at_period_end: row.cancel_at_period_end,
      cancelled_at: null,
      card_authorized: false,
      provider: row.payment_provider ?? "stripe_stub",
      provider_subscription_id: row.provider_subscription_id,
    };
  }

  private trialToState(row: PrismaTrialRow): TrialState {
    return {
      plan_slug: this.planSlugForId(row.plan_id),
      starts_at: iso(row.starts_at) as string,
      ends_at: iso(row.ends_at) as string,
      status: row.status as TrialState["status"],
      requires_card: row.requires_card,
      card_taken: false,
      ai_credits_used: 0,
      exports_used: 0,
      packs_created: 0,
    };
  }

  async saveSubscription(userId: string, subscription: SubscriptionState): Promise<SubscriptionState> {
    const planId = await this.resolvePlanId(subscription.plan_slug);
    const data: Record<string, unknown> = {
      user_id: userId,
      plan_id: planId,
      payment_provider: subscription.provider,
      provider_subscription_id: subscription.provider_subscription_id,
      status: subscription.status,
      current_period_start: subscription.current_period_start ? new Date(subscription.current_period_start) : null,
      current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end) : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
    };
    const existing = await this.client.subscription.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
    });
    const row = existing.length > 0
      ? await this.client.subscription.update({ where: { id: existing[0].id }, data })
      : await this.client.subscription.create({ data });
    return this.subscriptionToState(row);
  }

  async getSubscription(userId: string): Promise<SubscriptionState | null> {
    const rows = await this.client.subscription.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
    });
    if (rows.length === 0) {
      return null;
    }
    return this.subscriptionToState(rows[0]);
  }

  async saveTrial(userId: string, trial: TrialState, allowances: TrialAllowances): Promise<TrialState> {
    const planId = await this.resolvePlanId(trial.plan_slug);
    const data: Record<string, unknown> = {
      user_id: userId,
      plan_id: planId,
      starts_at: new Date(trial.starts_at),
      ends_at: new Date(trial.ends_at),
      status: trial.status,
      requires_card: trial.requires_card,
      ai_credit_allowance: allowances.ai_credit_allowance,
      export_allowance: allowances.export_allowance,
      listing_pack_allowance: allowances.listing_pack_allowance,
    };
    const existing = await this.client.trial.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
    });
    const row = existing.length > 0
      ? await this.client.trial.update({ where: { id: existing[0].id }, data })
      : await this.client.trial.create({ data });
    return this.trialToState(row);
  }

  async getTrial(userId: string): Promise<TrialState | null> {
    const rows = await this.client.trial.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
    });
    if (rows.length === 0) {
      return null;
    }
    return this.trialToState(rows[0]);
  }

  async grantEntitlement(input: GrantEntitlementInput): Promise<EntitlementRecord> {
    const row = await this.client.userEntitlement.create({
      data: {
        user_id: input.userId,
        entitlement_key: input.entitlementKey,
        limit_value_text: input.limitValueText ?? null,
        limit_value_number: input.limitValueNumber ?? null,
        granted_by_user_id: input.grantedByUserId,
        granted_reason: input.grantedReason ?? null,
        expires_at: input.expiresAt ? new Date(input.expiresAt) : null,
        is_active: true,
      },
    });
    return this.entitlementToRecord(row);
  }

  private entitlementToRecord(row: PrismaUserEntitlementRow): EntitlementRecord {
    return {
      id: row.id,
      user_id: row.user_id,
      entitlement_key: row.entitlement_key,
      limit_value_text: row.limit_value_text,
      limit_value_number: decimalToNumber(row.limit_value_number),
      granted_by_user_id: row.granted_by_user_id,
      granted_reason: row.granted_reason,
      expires_at: iso(row.expires_at),
      is_active: row.is_active,
    };
  }

  async listEntitlements(userId: string): Promise<EntitlementRecord[]> {
    const rows = await this.client.userEntitlement.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
    });
    return rows.map((row) => this.entitlementToRecord(row));
  }

  async recordAiUsage(input: RecordAiUsageInput): Promise<{ balance: AiCreditBalance; usage: AiUsageRecord }> {
    const periodStart = new Date(input.periodStartIso);
    const periodEnd = new Date(input.periodEndIso);
    const existing = await this.client.aICreditLedger.findUnique({
      where: { user_id_period_start_period_end: { user_id: input.userId, period_start: periodStart, period_end: periodEnd } },
    });
    const ledger = existing
      ? await this.client.aICreditLedger.update({
          where: { id: existing.id },
          data: { credits_used: existing.credits_used + input.creditsConsumed },
        })
      : await this.client.aICreditLedger.create({
          data: {
            user_id: input.userId,
            period_start: periodStart,
            period_end: periodEnd,
            credits_granted: input.creditsGranted ?? 0,
            credits_used: input.creditsConsumed,
          },
        });
    const log = await this.client.aIUsageLog.create({
      data: {
        user_id: input.userId,
        listing_pack_id: input.listingPackId ?? null,
        platform_id: null,
        pack_version_id: null,
        copy_prompt_version_id: null,
        operation: input.operation,
        credits_consumed: input.creditsConsumed,
        provider: input.provider ?? null,
        model: input.model ?? null,
        status: input.status ?? "suggestion",
        error_message: input.errorMessage ?? null,
      },
    });
    return { balance: this.ledgerToBalance(ledger), usage: this.usageToRecord(log) };
  }

  private ledgerToBalance(row: PrismaAICreditLedgerRow): AiCreditBalance {
    return {
      user_id: row.user_id,
      period_start: iso(row.period_start) as string,
      period_end: iso(row.period_end) as string,
      credits_granted: row.credits_granted,
      credits_used: row.credits_used,
      credits_remaining: row.credits_granted > 0 ? Math.max(0, row.credits_granted - row.credits_used) : null,
    };
  }

  private usageToRecord(row: PrismaAIUsageLogRow): AiUsageRecord {
    return {
      id: row.id,
      user_id: row.user_id,
      operation: row.operation,
      credits_consumed: row.credits_consumed,
      provider: row.provider,
      model: row.model,
      status: row.status,
      created_at: iso(row.created_at) as string,
    };
  }

  async getAiCreditBalance(userId: string, periodStartIso: string, periodEndIso: string): Promise<AiCreditBalance | null> {
    const row = await this.client.aICreditLedger.findUnique({
      where: { user_id_period_start_period_end: { user_id: userId, period_start: new Date(periodStartIso), period_end: new Date(periodEndIso) } },
    });
    return row ? this.ledgerToBalance(row) : null;
  }

  async listAiUsage(userId: string): Promise<AiUsageRecord[]> {
    const rows = await this.client.aIUsageLog.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
    });
    return rows.map((row) => this.usageToRecord(row));
  }

  async saveRefundRequest(request: RefundRequest): Promise<SavedRefundRequest> {
    this.refundLog.push(request);
    return {
      request,
      persisted: false,
      persisted_via: "store_log_only",
      note: REFUND_STORE_NOTE,
    };
  }

  async listRefundRequests(userId: string): Promise<RefundRequest[]> {
    return this.refundLog.filter((request) => request.user_id === userId);
  }

  async getAccountBillingState(
    userId: string,
    counts: { packs_created: number; ai_credits_used_this_month: number; exports_used_this_trial: number; trials_used: number },
  ): Promise<AccountBillingState> {
    const subscription = await this.getSubscription(userId);
    const trial = await this.getTrial(userId);
    return {
      user_id: userId,
      plan_slug: subscription ? subscription.plan_slug : "free",
      trial,
      trials_used: counts.trials_used,
      subscription,
      packs_created: counts.packs_created,
      ai_credits_used_this_month: counts.ai_credits_used_this_month,
      exports_used_this_trial: counts.exports_used_this_trial,
    };
  }
}

// In memory test double. Implements the same BillingStore interface
// with Maps, so tests run with no live database and no Prisma client.
// Behaviour matches the Prisma store, including the refund log only
// note and the dropped timestamp fields on read back.
export class InMemoryBillingStore implements BillingStore {
  private subscriptions = new Map<string, SubscriptionState>();
  private trials = new Map<string, TrialState>();
  private entitlements = new Map<string, EntitlementRecord[]>();
  private ledgers = new Map<string, AiCreditBalance>();
  private usageLogs = new Map<string, AiUsageRecord[]>();
  private refundLog: RefundRequest[] = [];

  async saveSubscription(userId: string, subscription: SubscriptionState): Promise<SubscriptionState> {
    const stored: SubscriptionState = {
      ...subscription,
      id: this.subscriptions.get(userId)?.id ?? newId("sub_"),
      cancelled_at: null,
      card_authorized: false,
    };
    this.subscriptions.set(userId, stored);
    return { ...stored };
  }

  async getSubscription(userId: string): Promise<SubscriptionState | null> {
    const found = this.subscriptions.get(userId);
    return found ? { ...found } : null;
  }

  async saveTrial(userId: string, trial: TrialState, _allowances: TrialAllowances): Promise<TrialState> {
    const stored: TrialState = { ...trial, card_taken: false, ai_credits_used: 0, exports_used: 0, packs_created: 0 };
    this.trials.set(userId, stored);
    return { ...stored };
  }

  async getTrial(userId: string): Promise<TrialState | null> {
    const found = this.trials.get(userId);
    return found ? { ...found } : null;
  }

  async grantEntitlement(input: GrantEntitlementInput): Promise<EntitlementRecord> {
    const record: EntitlementRecord = {
      id: newId("ent_"),
      user_id: input.userId,
      entitlement_key: input.entitlementKey,
      limit_value_text: input.limitValueText ?? null,
      limit_value_number: input.limitValueNumber ?? null,
      granted_by_user_id: input.grantedByUserId,
      granted_reason: input.grantedReason ?? null,
      expires_at: input.expiresAt ?? null,
      is_active: true,
    };
    const list = this.entitlements.get(input.userId) ?? [];
    list.push(record);
    this.entitlements.set(input.userId, list);
    return { ...record };
  }

  async listEntitlements(userId: string): Promise<EntitlementRecord[]> {
    return (this.entitlements.get(userId) ?? []).map((record) => ({ ...record }));
  }

  async recordAiUsage(input: RecordAiUsageInput): Promise<{ balance: AiCreditBalance; usage: AiUsageRecord }> {
    const key = input.userId + "|" + input.periodStartIso + "|" + input.periodEndIso;
    const previous = this.ledgers.get(key);
    const balance: AiCreditBalance = {
      user_id: input.userId,
      period_start: input.periodStartIso,
      period_end: input.periodEndIso,
      credits_granted: previous ? previous.credits_granted : (input.creditsGranted ?? 0),
      credits_used: (previous ? previous.credits_used : 0) + input.creditsConsumed,
      credits_remaining: null,
    };
    balance.credits_remaining = balance.credits_granted > 0
      ? Math.max(0, balance.credits_granted - balance.credits_used)
      : null;
    this.ledgers.set(key, { ...balance });
    const usage: AiUsageRecord = {
      id: newId("aiuse_"),
      user_id: input.userId,
      operation: input.operation,
      credits_consumed: input.creditsConsumed,
      provider: input.provider ?? null,
      model: input.model ?? null,
      status: input.status ?? "suggestion",
      created_at: new Date().toISOString(),
    };
    const list = this.usageLogs.get(input.userId) ?? [];
    list.push(usage);
    this.usageLogs.set(input.userId, list);
    return { balance: { ...balance }, usage: { ...usage } };
  }

  async getAiCreditBalance(userId: string, periodStartIso: string, periodEndIso: string): Promise<AiCreditBalance | null> {
    const found = this.ledgers.get(userId + "|" + periodStartIso + "|" + periodEndIso);
    return found ? { ...found } : null;
  }

  async listAiUsage(userId: string): Promise<AiUsageRecord[]> {
    return (this.usageLogs.get(userId) ?? []).map((record) => ({ ...record }));
  }

  async saveRefundRequest(request: RefundRequest): Promise<SavedRefundRequest> {
    this.refundLog.push(request);
    return {
      request,
      persisted: false,
      persisted_via: "store_log_only",
      note: REFUND_STORE_NOTE,
    };
  }

  async listRefundRequests(userId: string): Promise<RefundRequest[]> {
    return this.refundLog.filter((request) => request.user_id === userId).map((request) => ({ ...request }));
  }

  async getAccountBillingState(
    userId: string,
    counts: { packs_created: number; ai_credits_used_this_month: number; exports_used_this_trial: number; trials_used: number },
  ): Promise<AccountBillingState> {
    const subscription = await this.getSubscription(userId);
    const trial = await this.getTrial(userId);
    return {
      user_id: userId,
      plan_slug: subscription ? subscription.plan_slug : "free",
      trial,
      trials_used: counts.trials_used,
      subscription,
      packs_created: counts.packs_created,
      ai_credits_used_this_month: counts.ai_credits_used_this_month,
      exports_used_this_trial: counts.exports_used_this_trial,
    };
  }
}

// Build a billing store. Pass a Prisma client for real persistence,
// or null for the in memory store used in tests and local development.
export function createBillingStore(
  client: PrismaBillingClient | null,
  options: BillingStoreOptions = {},
): BillingStore {
  if (client === null) {
    return new InMemoryBillingStore();
  }
  return new PrismaBillingStore(client, options);
}
