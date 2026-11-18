// The signed in user, from the lpg_session cookie. Server only.
// The cookie holds an opaque token. Only the server can resolve it, and
// a forged or expired token resolves to no user.

import { cookies, headers } from "next/headers";
import type { PublicUser } from "../../../../packages/auth/src/types.ts";
import { SESSION_COOKIE_NAME } from "./admin-gate";
import { addressFromForwardedFor, trustedProxyHops } from "./caller-address";
import { getServerAuthService } from "./server-auth";

export async function getCurrentUser(): Promise<PublicUser | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const service = await getServerAuthService();
    const session = await service.getSession(token);
    return session ? session.user : null;
  } catch {
    return null;
  }
}

export function callerAddress(): string {
  return addressFromForwardedFor(headers().get("x-forwarded-for"), trustedProxyHops());
}
