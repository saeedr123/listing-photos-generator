// Trial: 7 day premium trial, no card required, one per account.
// Starting defaults come from config/plans.json, which admin can change
// without a code change. At trial end the user downgrades to Free
// automatically. No charge happens at trial end unless a card was taken
// AND a separate, clear authorization was given. The user keeps viewing
// and downloading packs they created. Premium editing locks until they
// subscribe. The system must never lock a user out of viewing their own
// listing pack.

import { BillingError } from "./types.ts";
import type { AccountBillingState, PlansConfig, TrialState } from "./types.ts";

export function trialEndDate(startsAtIso: string, durationDays: number): string {
  const start = new Date(startsAtIso);
  const end = new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000);
  return end.toISOString();
}

export function hasUsedTrial(state: AccountBillingState): boolean {
  return state.trials_used >= 1 || state.trial !== null;
}

// Start a trial. One trial per account, enforced here and in the Trial
// table. No card is required by the starting default. If admin later sets
// requires_card to true, a card must be on file before the trial starts,
// and that change must be recorded in the config change log.
export function startTrial(
  config: PlansConfig,
  state: AccountBillingState,
  nowIso: string,
  opts?: { cardTaken?: boolean },
): AccountBillingState {
  if (config.trial.one_per_account && hasUsedTrial(state)) {
    throw new BillingError(
      "trial_already_used",
      "One trial per account. This account has already used its trial, so a second trial cannot start.",
    );
  }
  if (config.trial.requires_card && !opts?.cardTaken) {
    throw new BillingError(
      "trial_card_required",
      "A card is required to start this trial. No trial starts without a card on file when the trial config requires one.",
    );
  }
  const trial: TrialState = {
    plan_slug: "premium",
    starts_at: nowIso,
    ends_at: trialEndDate(nowIso, config.trial.duration_days),
    status: "active",
    requires_card: config.trial.requires_card,
    card_taken: opts?.cardTaken ?? false,
    ai_credits_used: 0,
    exports_used: 0,
    packs_created: 0,
  };
  return {
    ...state,
    trial,
    trials_used: state.trials_used + 1,
  };
}

export interface TrialEndResult {
  state: AccountBillingState;
  downgraded: boolean;
  charged: boolean;
  charge_amount_minor: number | null;
  note: string;
}

// End a trial. This is the conversion rule from PROMPT.md section 16.
// The user downgrades to Free automatically. With no card taken, there is
// no charge. With a card taken, there is still no charge unless
// chargeAuthorized is true, and chargeAuthorized must come from a clear,
// separate authorization step, never from trial start alone. A silent
// conversion to a paid plan is not possible through this function.
export function expireTrial(
  _config: PlansConfig,
  state: AccountBillingState,
  nowIso: string,
  opts?: { chargeAuthorized?: boolean },
): TrialEndResult {
  if (!state.trial || state.trial.status !== "active") {
    return {
      state,
      downgraded: false,
      charged: false,
      charge_amount_minor: null,
      note: "No active trial to end.",
    };
  }
  if (new Date(nowIso).getTime() < new Date(state.trial.ends_at).getTime()) {
    return {
      state,
      downgraded: false,
      charged: false,
      charge_amount_minor: null,
      note: "Trial is still active until " + state.trial.ends_at + ".",
    };
  }
  const charged = Boolean(state.trial.card_taken && opts?.chargeAuthorized);
  // Charge amount stays null here: the amount comes from the price config,
  // and the price is not set yet. No amount is invented at trial end.
  const endedTrial: TrialState = { ...state.trial, status: "ended" };
  const next: AccountBillingState = {
    ...state,
    plan_slug: "free",
    trial: endedTrial,
  };
  return {
    state: next,
    downgraded: true,
    charged,
    charge_amount_minor: null,
    note: charged
      ? "Trial ended. Downgraded to Free. A charge was recorded only because a card was taken and a separate, clear authorization was given."
      : "Trial ended. Downgraded to Free automatically, with no charge. You keep viewing and downloading packs you created. Premium editing, premium templates, premium mockups, and premium exports are locked until you subscribe.",
  };
}

// Trial allowances, from config. Null means not set in admin yet.
export function trialAllowances(config: PlansConfig): {
  duration_days: number;
  ai_credit_allowance: number | null;
  export_allowance: number | null;
  listing_pack_allowance: number | null;
} {
  return {
    duration_days: config.trial.duration_days,
    ai_credit_allowance: config.trial.ai_credit_allowance,
    export_allowance: config.trial.export_allowance,
    listing_pack_allowance: config.trial.listing_pack_allowance,
  };
}
