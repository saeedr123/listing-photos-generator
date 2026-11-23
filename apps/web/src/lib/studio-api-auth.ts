// Sign in check for studio API routes. Server only.
// The studio is for signed in sellers. API routes are reached directly,
// so each one checks the session itself. A signed out caller gets 401.

import type { PublicUser } from "../../../../packages/auth/src/types.ts";
import { getCurrentUser } from "./current-user";
import { checkRateLimit, type RateLimitName } from "./rate-limits";

export type StudioApiAccess = { ok: true; user: PublicUser } | { ok: false; response: Response };

export async function requireSellerApi(limit?: RateLimitName): Promise<StudioApiAccess> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, response: Response.json({ ok: false, error: "Sign in to use the studio." }, { status: 401 }) };
  }
  if (limit) {
    const result = await checkRateLimit(limit, user.id);
    if (!result.allowed) {
      return {
        ok: false,
        response: Response.json({ ok: false, error: result.message }, { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } }),
      };
    }
  }
  return { ok: true, user };
}
