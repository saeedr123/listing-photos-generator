// Rate limits for seller, studio and admin actions. Server only.
// The numbers live in config/rate-limits.json. The limiter keeps its
// counts in process memory, which is right for one server process. More
// than one process needs a shared store behind the RateLimitStore
// interface in packages/auth/src/rate-limit.ts.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { RateLimiter } from "../../../../packages/auth/src/rate-limit.ts";
import { rateLimitMessage } from "../../../../packages/auth/src/config.ts";

export type RateLimitName =
  | "studio.gate"
  | "studio.catalog"
  | "admin.upload"
  | "packs.create"
  | "packs.export"
  | "share.create"
  | "share.comment";

interface Rule {
  maxAttempts: number;
  windowSeconds: number;
}

const holder = globalThis as unknown as { __lpgActionLimiter?: RateLimiter; __lpgRateRules?: Record<string, Rule> };

function rules(): Record<string, Rule> {
  if (!holder.__lpgRateRules) {
    const path = join(process.cwd(), "..", "..", "config", "rate-limits.json");
    const parsed = JSON.parse(readFileSync(path, "utf8")) as { rules: Record<string, Rule> };
    holder.__lpgRateRules = parsed.rules;
  }
  return holder.__lpgRateRules;
}

export type LimitResult = { allowed: true } | { allowed: false; message: string; retryAfterSeconds: number };

/** Count one attempt against a named rule. The key is an account id or a caller address. */
export async function checkRateLimit(name: RateLimitName, key: string): Promise<LimitResult> {
  const rule = rules()[name];
  if (!rule) throw new Error(`Rate limit rule ${name} is missing from config/rate-limits.json.`);
  if (!holder.__lpgActionLimiter) holder.__lpgActionLimiter = new RateLimiter();
  const result = await holder.__lpgActionLimiter.check(`${name}:${key}`, rule.maxAttempts, rule.windowSeconds);
  if (result.allowed) return { allowed: true };
  return { allowed: false, message: rateLimitMessage(result.retryAfterSeconds), retryAfterSeconds: result.retryAfterSeconds };
}
