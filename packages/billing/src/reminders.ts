// Renewal reminders, as scheduled records, not real email sends.
// A renewal reminder is created as a record with a scheduled date, a
// status of scheduled, and sent false. Sending email is a separate step,
// wired in only when a mail sender exists. This module never sends email,
// never contacts a real person, and never charges anything.

import { BillingError } from "./types.ts";
import type { SubscriptionState, TrialState } from "./types.ts";

export interface ReminderRecord {
  id: string;
  type: "renewal_reminder" | "trial_end_reminder";
  user_id: string;
  subscription_id: string | null;
  trial_id: string | null;
  scheduled_for: string;
  created_at: string;
  status: "scheduled";
  sent: boolean;
  channel: "record_only";
  note: string;
}

export function newReminderId(): string {
  const random = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : String(Date.now()) + "-" + String(Math.floor(Math.random() * 1000000));
  return "reminder_" + random;
}

// Schedule a renewal reminder a stated number of days before the period
// end. The number of days comes from the caller or from admin config, not
// from a hard coded value in this module. If the period end is not set,
// no reminder can be scheduled, and the caller is told so.
export function scheduleRenewalReminder(
  userId: string,
  subscription: SubscriptionState | null,
  daysBefore: number,
  nowIso: string,
): ReminderRecord {
  if (!subscription || !subscription.current_period_end) {
    throw new BillingError(
      "renewal_date_not_set",
      "Renewal date not set. No renewal reminder can be scheduled until the subscription has a period end date.",
    );
  }
  if (daysBefore < 0) {
    throw new BillingError("reminder_days_invalid", "Reminder days before renewal must be zero or more.");
  }
  const periodEnd = new Date(subscription.current_period_end);
  const scheduledFor = new Date(periodEnd.getTime() - daysBefore * 24 * 60 * 60 * 1000);
  return {
    id: newReminderId(),
    type: "renewal_reminder",
    user_id: userId,
    subscription_id: subscription.id,
    trial_id: null,
    scheduled_for: scheduledFor.toISOString(),
    created_at: nowIso,
    status: "scheduled",
    sent: false,
    channel: "record_only",
    note: "Scheduled record only. No email is sent by this module. The reminder must be sent before renewal, with the renewal date, the price, and the cancel method.",
  };
}

export function scheduleTrialEndReminder(
  userId: string,
  trial: TrialState,
  daysBefore: number,
  nowIso: string,
): ReminderRecord {
  if (daysBefore < 0) {
    throw new BillingError("reminder_days_invalid", "Reminder days before trial end must be zero or more.");
  }
  const trialEnd = new Date(trial.ends_at);
  const scheduledFor = new Date(trialEnd.getTime() - daysBefore * 24 * 60 * 60 * 1000);
  return {
    id: newReminderId(),
    type: "trial_end_reminder",
    user_id: userId,
    subscription_id: null,
    trial_id: null,
    scheduled_for: scheduledFor.toISOString(),
    created_at: nowIso,
    status: "scheduled",
    sent: false,
    channel: "record_only",
    note: "Scheduled record only. No email is sent by this module. The reminder must state that the trial ends, that the plan returns to Free, and that no charge happens without clear authorization.",
  };
}
