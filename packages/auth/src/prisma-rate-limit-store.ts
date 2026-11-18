// Rate limit store in PostgreSQL, for hosting where many copies of the app
// run at once (Vercel). Each attempt is one row in RateLimitHit. A check
// and its record happen in one transaction that first takes a
// transaction scoped advisory lock on the key, so two requests at the same
// moment cannot both slip under the limit.
//
// Rows older than the window are removed for the key being checked. Rows
// of keys that are never checked again are removed now and then by the
// sweep (older than one day), so the table stays small.

import type { AtomicRateLimitStore, RateLimitHitResult } from "./rate-limit.ts";

/** The part of the Prisma client this store uses. */
export interface PrismaRateLimitClient {
  $transaction<T>(fn: (tx: PrismaRateLimitTx) => Promise<T>, options?: { maxWait?: number; timeout?: number }): Promise<T>;
  $executeRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<number>;
}

export interface PrismaRateLimitTx {
  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  $executeRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<number>;
}

const SWEEP_AFTER_MS = 24 * 60 * 60 * 1000;

export class PrismaRateLimitStore implements AtomicRateLimitStore {
  private readonly client: PrismaRateLimitClient;
  private readonly sweepChance: number;

  constructor(client: PrismaRateLimitClient, options: { sweepChance?: number } = {}) {
    this.client = client;
    this.sweepChance = options.sweepChance ?? 0.01;
  }

  async hit(key: string, windowStartMs: number, nowMs: number, maxAttempts: number): Promise<RateLimitHitResult> {
    const windowStart = new Date(windowStartMs);
    const now = new Date(nowMs);
    const result = await this.client.$transaction(async (tx) => {
      // pg_advisory_xact_lock returns void, which Prisma cannot read, so cast it.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))::text AS "locked"`;
      await tx.$executeRaw`DELETE FROM "RateLimitHit" WHERE "key" = ${key} AND "at" <= ${windowStart}`;
      const rows = await tx.$queryRaw<Array<{ count: bigint | number; oldest: Date | null }>>`
        SELECT COUNT(*) AS "count", MIN("at") AS "oldest" FROM "RateLimitHit" WHERE "key" = ${key}`;
      const count = Number(rows[0]?.count ?? 0);
      const oldest = rows[0]?.oldest ? new Date(rows[0].oldest).getTime() : null;
      if (count >= maxAttempts) {
        return { allowed: false, oldestMs: oldest ?? nowMs };
      }
      await tx.$executeRaw`INSERT INTO "RateLimitHit" ("key", "at") VALUES (${key}, ${now})`;
      return { allowed: true, oldestMs: oldest ?? nowMs };
    }, { maxWait: 10_000, timeout: 10_000 });
    if (Math.random() < this.sweepChance) {
      await this.client.$executeRaw`DELETE FROM "RateLimitHit" WHERE "at" < ${new Date(nowMs - SWEEP_AFTER_MS)}`;
    }
    return result;
  }

  async reset(key: string): Promise<void> {
    await this.client.$executeRaw`DELETE FROM "RateLimitHit" WHERE "key" = ${key}`;
  }
}
