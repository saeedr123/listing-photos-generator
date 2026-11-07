// Sliding window rate limiter. In memory in this module; a production
// deployment swaps the store for a shared store (for example Redis) through
// the RateLimitStore interface, without changing callers.

export interface RateLimitStore {
  get(key: string): Promise<number[]>;
  set(key: string, timestamps: number[]): Promise<void>;
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
  private store: RateLimitStore;

  constructor(store: RateLimitStore = new InMemoryRateLimitStore()) {
    this.store = store;
  }

  async check(key: string, maxAttempts: number, windowSeconds: number, nowMs: number = Date.now()): Promise<RateLimitCheck> {
    const windowStart = nowMs - windowSeconds * 1000;
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
    await this.store.set(key, []);
  }
}

// The rate limit key combines the action, the account identifier, and the
// caller address, so one address cannot lock out every account, and one
// account cannot be attacked from many addresses without limit.
export function rateLimitKey(action: string, identifier: string, address: string): string {
  return action + ":" + identifier + ":" + address;
}
