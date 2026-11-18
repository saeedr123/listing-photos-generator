// Sliding window rate limiter. In memory in this module. Where many copies
// of the app run at once, a shared store is passed in: an
// AtomicRateLimitStore (see prisma-rate-limit-store.ts) checks and records
// in one step, so concurrent requests cannot both pass the limit.

export interface RateLimitStore {
  get(key: string): Promise<number[]>;
  set(key: string, timestamps: number[]): Promise<void>;
}

export interface RateLimitHitResult {
  allowed: boolean;
  /** Time of the oldest attempt still inside the window, for the retry time. */
  oldestMs: number;
}

/** A store that checks and records an attempt in one atomic step. */
export interface AtomicRateLimitStore {
  hit(key: string, windowStartMs: number, nowMs: number, maxAttempts: number): Promise<RateLimitHitResult>;
  reset(key: string): Promise<void>;
}

function isAtomic(store: RateLimitStore | AtomicRateLimitStore): store is AtomicRateLimitStore {
  return typeof (store as AtomicRateLimitStore).hit === "function";
}

export class InMemoryRateLimitStore implements RateLimitStore {
  private entries = new Map<string, number[]>();

  async get(key: string): Promise<number[]> {
    return this.entries.get(key) ?? [];
  }

  async set(key: string, timestamps: number[]): Promise<void> {
    if (timestamps.length === 0) {
      this.entries.delete(key);
    } else {
      this.entries.set(key, timestamps);
    }
  }
}

export interface RateLimitCheck {
  allowed: boolean;
  retryAfterSeconds: number;
}

export class RateLimiter {
  private store: RateLimitStore | AtomicRateLimitStore;

  constructor(store: RateLimitStore | AtomicRateLimitStore = new InMemoryRateLimitStore()) {
    this.store = store;
  }

  async check(key: string, maxAttempts: number, windowSeconds: number, nowMs: number = Date.now()): Promise<RateLimitCheck> {
    const windowStart = nowMs - windowSeconds * 1000;
    if (isAtomic(this.store)) {
      const hit = await this.store.hit(key, windowStart, nowMs, maxAttempts);
      if (hit.allowed) return { allowed: true, retryAfterSeconds: 0 };
      const retryAfterSeconds = Math.ceil((hit.oldestMs + windowSeconds * 1000 - nowMs) / 1000);
      return { allowed: false, retryAfterSeconds: Math.max(1, retryAfterSeconds) };
    }
    const attempts = (await this.store.get(key)).filter((t) => t > windowStart);
    if (attempts.length >= maxAttempts) {
      const oldest = Math.min(...attempts);
      const retryAfterSeconds = Math.ceil((oldest + windowSeconds * 1000 - nowMs) / 1000);
      return { allowed: false, retryAfterSeconds: Math.max(1, retryAfterSeconds) };
    }
    attempts.push(nowMs);
    await this.store.set(key, attempts);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  async reset(key: string): Promise<void> {
    if (isAtomic(this.store)) {
      await this.store.reset(key);
      return;
    }
    await this.store.set(key, []);
  }
}

// The rate limit key combines the action, the account identifier, and the
// caller address, so one address cannot lock out every account, and one
// account cannot be attacked from many addresses without limit.
export function rateLimitKey(action: string, identifier: string, address: string): string {
  return action + ":" + identifier + ":" + address;
}
