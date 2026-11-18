// Rate limits for seller, studio and admin actions. Server only.
// The numbers live in config/rate-limits.json. With a database connected,
// counts are kept in the RateLimitHit table, shared by every copy of the
// app (Vercel runs many). Without one (development), they are kept in
// process memory.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { RateLimiter } from "../../../../packages/auth/src/rate-limit.ts";
import { PrismaRateLimitStore, type PrismaRateLimitClient } from "../../../../packages/auth/src/prisma-rate-limit-store.ts";
import { getPrismaClient } from "./db";
import { repoRoot } from "./repo-root";
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

const holder = globalThis as unknown as { __lpgActionLimiter?: Promise<RateLimiter>; __lpgRateRules?: Record<string, Rule> };

/** The one limiter the server uses, for actions and for sign in and sign up. */
export function sharedRateLimiter(): Promise<RateLimiter> {
  if (!holder.__lpgActionLimiter) {
    holder.__lpgActionLimiter = (async () => {
      const client = await getPrismaClient();
      return client ? new RateLimiter(new PrismaRateLimitStore(client as PrismaRateLimitClient)) : new RateLimiter();
    })();
  }
  return holder.__lpgActionLimiter;
}

function rules(): Record<string, Rule> {
  if (!holder.__lpgRateRules) {
    const path = join(repoRoot(), "config", "rate-limits.json");
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
  const limiter = await sharedRateLimiter();
  const result = await limiter.check(`${name}:${key}`, rule.maxAttempts, rule.windowSeconds);
  if (result.allowed) return { allowed: true };
  return { allowed: false, message: rateLimitMessage(result.retryAfterSeconds), retryAfterSeconds: result.retryAfterSeconds };
}
