// Cancel and refund flows.
// Cancel: in the account, in a small number of clicks, with immediate
// confirmation, end of period access, and a clear record. Do not require
// contacting support to cancel. Refunds: the refund policy is a placeholder
// before launch, final wording is decided by Ali with a legal check.
// Refund requests go through the billing interface and admin, with a log.
// No refund is paid automatically by the stub.

import { BillingError } from "./types.ts";
import type { AccountBillingState, PlansConfig, SubscriptionState } from "./types.ts";

export function canCancelWithoutSupport(): { allowed: boolean; note: string } {
  return {
    allowed: true,
    note: "Cancel in your account. You do not need to contact support to cancel.",
  };
}

export interface CancelResult {
  state: AccountBillingState;
  record: {
    action: "cancel";
    user_id: string;
    subscription_id: string;
    cancelled_at: string;
    access_until: string | null;
    note: string;
  };
}

// Cancel a subscription. Access continues until the end of the current
// period. The period end is never shortened by cancelling, and the user
// keeps viewing and downloading packs they created after the period ends.
export function cancelSubscription(
  state: AccountBillingState,
  nowIso: string,
): CancelResult {
  const subscription = state.subscription;
  if (!subscription || subscription.status !== "active") {
    throw new BillingError(
      "no_active_subscription",
      "No active subscription to cancel. If you were charged and see no active subscription here, contact support with the payment reference so it can be checked.",
    );
  }
  const nextSubscription: SubscriptionState = {
    ...subscription,
    status: "cancelled",
    cancel_at_period_end: true,
    cancelled_at: nowIso,
  };
  const next: AccountBillingState = { ...state, subscription: nextSubscription };
  return {
    state: next,
    record: {
      action: "cancel",
      user_id: state.user_id,
      subscription_id: subscription.id,
      cancelled_at: nowIso,
      access_until: subscription.current_period_end,
      note:
        "Cancelled in the account. Access continues until the end of the current period" +
        (subscription.current_period_end ? " (" + subscription.current_period_end.slice(0, 10) + ")" : "") +
        ", then the plan returns to Free. You keep viewing and downloading packs you created.",
    },
  };
}

export function hasAccessUntilPeriodEnd(state: AccountBillingState, nowIso: string): boolean {
  const subscription = state.subscription;
  if (!subscription || !subscription.current_period_end) {
    return false;
  }
  return new Date(nowIso).getTime() < new Date(subscription.current_period_end).getTime();
}

export interface RefundRequest {
  id: string;
  user_id: string;
  subscription_id: string | null;
  reason: string;
  status: "pending_admin_review";
  requested_at: string;
  policy_text: string;
  note: string;
}

export function refundPolicyPlaceholder(config: PlansConfig): string {
  return config.billing.refund_policy_text;
}

export function newRefundId(): string {
  const random = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : String(Date.now()) + "-" + String(Math.floor(Math.random() * 1000000));
  return "refund_" + random;
}

// Record a refund request. The request is logged as pending admin review.
// The stub never pays a refund and never refuses one by itself. Admin
// decides, through the billing interface, and the decision is logged.
export function requestRefund(
  config: PlansConfig,
  state: AccountBillingState,
  reason: string,
  nowIso: string,
  log: RefundRequest[],
): RefundRequest {
  if (reason.trim().length === 0) {
    throw new BillingError("refund_reason_required", "Tell us in one line why you are asking for a refund.");
  }
  const request: RefundRequest = {
    id: newRefundId(),
    user_id: state.user_id,
    subscription_id: state.subscription ? state.subscription.id : null,
    reason: reason.trim(),
    status: "pending_admin_review",
    requested_at: nowIso,
    policy_text: config.billing.refund_policy_text,
    note: "Refund request logged for admin review. Final refund policy wording is a placeholder until Ali confirms it with a legal check.",
  };
  log.push(request);
  return request;
}
