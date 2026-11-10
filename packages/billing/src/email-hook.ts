// Email sending hook, provider agnostic and config driven.
// Renewal reminders and account emails are records first, and sending
// is a hook that does nothing without configured provider credentials.
// No real provider is chosen here, no email is ever sent by this
// module on its own, and no credential value appears in code, config,
// or logs.
//
// Exact config a later provider needs, read from environment only:
// - Provider name: EMAIL_PROVIDER, for example the provider product
//   name, or null when no provider is chosen. No provider is chosen
//   in this build, so the value stays null until Ali picks one.
// - From address: EMAIL_FROM_ADDRESS, the sender address shown on
//   account emails, or null when not set.
// - API key: the env var named EMAIL_API_KEY. Only the var name is
//   recorded here. The value is never read into a returned object,
//   never logged, and never written to a file. The config records
//   only whether the var is set, as apiKeySet true or false.
// - The send step itself is a provider implementation supplied later.
//   Until one exists, every send attempt returns sent false with a
//   clear reason, and the reminder record stays unsent.
//
// How it connects: scheduleRenewalReminder and
// scheduleTrialEndReminder in reminders.ts create the scheduled
// record. sendReminderEmail in this file builds the email text from
// that record and asks the hook to send it. The hook sends nothing
// while unconfigured, and the caller keeps the record with sent
// false so the reminder can be retried once a provider is wired in.

import type { ReminderRecord } from "./reminders.ts";

export type AccountEmailKind = "renewal_reminder" | "trial_end_reminder" | "account_notice";

export interface EmailMessage {
  kind: AccountEmailKind;
  to: string;
  subject: string;
  text: string;
}

export interface EmailHookConfig {
  // Provider product name, or null when no provider is chosen.
  provider: string | null;
  // Sender address, or null when not set.
  fromAddress: string | null;
  // Name of the env var that holds the provider API key. The name
  // only, never the value.
  apiKeyEnvVar: string;
  // Whether that env var is set in the current environment.
  apiKeySet: boolean;
  // True only when a provider name, a from address, and an API key
  // are all present.
  configured: boolean;
}

export const EMAIL_API_KEY_ENV_VAR = "EMAIL_API_KEY";

// Read the email hook config from environment. The API key value is
// never returned, only whether the named var is set.
export function loadEmailHookConfig(
  env: Record<string, string | undefined> = process.env,
): EmailHookConfig {
  const provider = env.EMAIL_PROVIDER && env.EMAIL_PROVIDER !== "" ? env.EMAIL_PROVIDER : null;
  const fromAddress = env.EMAIL_FROM_ADDRESS && env.EMAIL_FROM_ADDRESS !== "" ? env.EMAIL_FROM_ADDRESS : null;
  const apiKeySet = Boolean(env[EMAIL_API_KEY_ENV_VAR] && env[EMAIL_API_KEY_ENV_VAR] !== "");
  return {
    provider,
    fromAddress,
    apiKeyEnvVar: EMAIL_API_KEY_ENV_VAR,
    apiKeySet,
    configured: provider !== null && fromAddress !== null && apiKeySet,
  };
}

// Plain language summary of the email config for admin display. It
// names env vars only, never a credential value.
export function describeEmailConfig(config: EmailHookConfig): string {
  if (!config.configured) {
    const missing: string[] = [];
    if (config.provider === null) {
      missing.push("EMAIL_PROVIDER (provider name)");
    }
    if (config.fromAddress === null) {
      missing.push("EMAIL_FROM_ADDRESS (from address)");
    }
    if (!config.apiKeySet) {
      missing.push(config.apiKeyEnvVar + " (API key, value never shown)");
    }
    return "Email is not configured. Missing: " + missing.join(", ") + ". No email is sent until all three are set and a provider implementation is wired in.";
  }
  return "Email is configured for provider " + (config.provider as string) + " from " + (config.fromAddress as string) + ", with " + config.apiKeyEnvVar + " set. A provider implementation is still needed before any email is sent.";
}

export interface EmailSendAttempt {
  sent: boolean;
  provider: string | null;
  messageId: string | null;
  reason: string;
  note: string;
}

export interface EmailHook {
  config: EmailHookConfig;
  send(message: EmailMessage): EmailSendAttempt;
}

// A provider send implementation, supplied later and registered under
// the provider name from config. It sends one message and reports the
// attempt. No real send implementation is registered in this build.
export type EmailSendFunction = (message: EmailMessage) => EmailSendAttempt;

const emailProviderRegistry = new Map<string, EmailSendFunction>();

// Register an email provider send step under its config name. The
// reminder records and the message building in this file never change
// when a provider is added. A later provider is added by registering
// its send step and naming it in EMAIL_PROVIDER, never by editing the
// billing core or the reminder records.
export function registerEmailProvider(name: string, send: EmailSendFunction): void {
  if (!name || typeof send !== "function") {
    throw new Error("An email provider needs a name and a send function.");
  }
  emailProviderRegistry.set(name, send);
}

export function listEmailProviders(): string[] {
  return [...emailProviderRegistry.keys()].sort();
}

// Build the hook from config. The hook never sends email by itself:
// with no provider configured it returns sent false, and with a
// provider name set but no provider implementation wired in it also
// returns sent false, naming the missing implementation. A later
// provider implementation replaces the send step only, never the
// record building in this file. A send step passed here, or one
// registered for the configured provider name, is used instead.
export function createEmailHook(config: EmailHookConfig, send?: EmailSendFunction): EmailHook {
  const registered = config.provider !== null ? emailProviderRegistry.get(config.provider) : undefined;
  const sendStep = send ?? registered;
  return {
    config,
    send(message: EmailMessage): EmailSendAttempt {
      if (!config.configured) {
        return {
          sent: false,
          provider: config.provider,
          messageId: null,
          reason: "no_email_provider_configured",
          note: "No email was sent. " + describeEmailConfig(config),
        };
      }
      if (sendStep) {
        return sendStep(message);
      }
      return {
        sent: false,
        provider: config.provider,
        messageId: null,
        reason: "email_provider_not_implemented",
        note: "Provider " + (config.provider as string) + " is named in config, but no provider implementation is wired in yet, so no email was sent for " + message.kind + ". Wire in the provider send step before any email goes out.",
      };
    },
  };
}

// Build the renewal reminder email text from a scheduled reminder
// record. The renewal date, the price text, and the cancel method are
// passed in by the caller, from the subscription and the billing
// terms, and are never invented here. A null price stays stated as
// not set, never as zero.
export function buildRenewalReminderEmail(
  reminder: ReminderRecord,
  opts: { to: string; renewalDateText: string; priceText: string; cancelMethodText: string },
): EmailMessage {
  return {
    kind: "renewal_reminder",
    to: opts.to,
    subject: "Your Listing Photos Generator subscription renews on " + opts.renewalDateText,
    text:
      "Your subscription renews on " + opts.renewalDateText + ".\n" +
      "Price: " + opts.priceText + ".\n" +
      "Cancel method: " + opts.cancelMethodText + ".\n" +
      "This reminder was scheduled for " + reminder.scheduled_for.slice(0, 10) + ".",
  };
}

// Build the trial end reminder email text from a scheduled reminder
// record. It states that the trial ends, that the plan returns to
// Free, and that no charge happens without clear authorization.
export function buildTrialEndReminderEmail(
  reminder: ReminderRecord,
  opts: { to: string; trialEndText: string },
): EmailMessage {
  return {
    kind: "trial_end_reminder",
    to: opts.to,
    subject: "Your Listing Photos Generator trial ends on " + opts.trialEndText,
    text:
      "Your trial ends on " + opts.trialEndText + ".\n" +
      "Your plan returns to Free. No charge happens without clear authorization.\n" +
      "You keep viewing and downloading packs you created.\n" +
      "This reminder was scheduled for " + reminder.scheduled_for.slice(0, 10) + ".",
  };
}

export interface ReminderSendOutcome {
  email: EmailMessage;
  attempt: EmailSendAttempt;
  reminder: ReminderRecord;
}

// Send a scheduled reminder through the hook. The reminder record is
// returned with sent set only when the hook reports sent true. While
// no provider is configured, the record comes back unchanged with
// sent false, so the reminder can be retried later.
export function sendReminderEmail(
  hook: EmailHook,
  reminder: ReminderRecord,
  email: EmailMessage,
): ReminderSendOutcome {
  const attempt = hook.send(email);
  return {
    email,
    attempt,
    reminder: { ...reminder, sent: attempt.sent },
  };
}
