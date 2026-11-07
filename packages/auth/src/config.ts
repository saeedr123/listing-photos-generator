// Auth configuration. Every value here is admin editable configuration,
// not a hard coded rule. Change the values, not the code, to change behaviour.
// No price, no platform rule, and no product fact lives in this file.

import type { Edition } from "./types.ts";

export interface RateLimitRule {
  // Maximum attempts inside the window.
  maxAttempts: number;
  // Window length in seconds.
  windowSeconds: number;
}

export interface AuthConfig {
  // Entry edition recorded on new User rows when the caller does not pass one.
  defaultEdition: Edition;
  // Editions the app accepts. Add an edition here to open a new entry point.
  allowedEditions: Edition[];
  // Session lifetime in days. Configurable default, to be confirmed.
  sessionTtlDays: number;
  // Password rules. Minimum length only; strength messaging is in copy config.
  passwordMinLength: number;
  rateLimits: {
    login: RateLimitRule;
    register: RateLimitRule;
    passwordChange: RateLimitRule;
  };
  // Audit retention in days. Backups must expire on a stated schedule;
  // the schedule itself is an admin decision, recorded here when set.
  auditRetentionDays: number | null;
}

export const defaultAuthConfig: AuthConfig = {
  defaultEdition: "listing-photos-generator",
  allowedEditions: ["listing-photos-generator", "nvconsult"],
  sessionTtlDays: 30,
  passwordMinLength: 10,
  rateLimits: {
    login: { maxAttempts: 5, windowSeconds: 15 * 60 },
    register: { maxAttempts: 5, windowSeconds: 60 * 60 },
    passwordChange: { maxAttempts: 5, windowSeconds: 60 * 60 },
  },
  // Null means no retention limit has been set yet. Set it in admin before
  // launch; do not guess a retention period here.
  auditRetentionDays: null,
};

// User facing rate limit messages. Plain language, no system details.
export function rateLimitMessage(retryAfterSeconds: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  if (minutes <= 1) {
    return "Too many attempts. Try again in about a minute.";
  }
  return "Too many attempts. Try again in about " + minutes + " minutes.";
}
