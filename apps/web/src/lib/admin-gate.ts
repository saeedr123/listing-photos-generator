// Server side admin gate for /admin routes.
//
// How it works, and what it does not do yet:
// - The decision itself is pure: decideAdminAccess takes a PublicUser (or
//   null) and applies isAdmin and canManageAdminContent from
//   @listing-photos-generator/auth. Those helpers are the single source
//   for the admin role; they are reused here, not rewritten.
// - The current user comes from the lpg_session cookie, resolved through
//   an AuthService (getCurrentAdminUser). AuthService returns a plain
//   session token once, at sign in; the server login action must set it
//   as a secure, HttpOnly cookie named lpg_session. That server login
//   action does not exist yet: sign in today is the demo store, which
//   keeps its session in browser sessionStorage, so no server code can
//   read it. Until the server login lands, the admin layout passes no
//   resolver, getCurrentAdminUser returns null, and the gate fails
//   closed: every visitor is treated as signed out and redirected to
//   /auth/login. That is deliberate. A gate that let demo users through
//   would be a gate that trusts browser storage, which is not
//   authentication.
// - Middleware (apps/web/src/middleware.ts) is only a first layer: it
//   redirects /admin requests with no lpg_session cookie at all. It
//   cannot check the role, because it cannot reach the database, so the
//   layout below stays authoritative. A forged or stale cookie passes
//   middleware and is still refused by the layout.
// - Logged out visitors are redirected to /auth/login with a next
//   parameter. Signed in non-admin users get a 403 panel in the layout,
//   with no admin navigation and no admin content, matching the inline
//   sign in prompt the dashboard shows to signed out visitors.

// Imported by relative path, not through the auth package index: the
// index also exports the session and provider modules, which use
// node:crypto, and this file is bundled into edge middleware, which
// cannot bundle node:crypto. permissions.ts and types.ts are pure, so
// they bundle anywhere. The helpers themselves are reused, not copied.
import { canManageAdminContent, isAdmin } from "../../../../packages/auth/src/permissions.ts";
import type { PublicUser, SessionInfo } from "../../../../packages/auth/src/types.ts";

export const SESSION_COOKIE_NAME = "lpg_session";
export const ADMIN_LOGIN_PATH = "/auth/login";

export type AdminAccess =
  | { allowed: true; user: PublicUser }
  | { allowed: false; reason: "signed_out" | "not_admin"; user: PublicUser | null };

export function decideAdminAccess(user: PublicUser | null): AdminAccess {
  if (user === null) {
    return { allowed: false, reason: "signed_out", user: null };
  }
  if (!isAdmin(user) || !canManageAdminContent(user)) {
    return { allowed: false, reason: "not_admin", user };
  }
  return { allowed: true, user };
}

export function adminLoginUrl(nextPath: string): string {
  return ADMIN_LOGIN_PATH + "?next=" + encodeURIComponent(nextPath);
}

// Minimal cookie reader shape, matching what next/headers cookies()
// returns for .get(). Kept as an interface so this helper is testable
// without Next.js.
export interface AdminCookieReader {
  get(name: string): { value: string } | undefined;
}

// Minimal session resolver shape. AuthService satisfies it.
export interface AdminSessionResolver {
  getSession(sessionToken: string): Promise<SessionInfo | null>;
}

// Resolve the current user from the session cookie. Returns null when
// there is no resolver (no server login wired yet), no cookie, an
// unknown or expired session, or a deleted user. Any resolver failure
// is treated as signed out, never as admin.
export async function getCurrentAdminUser(
  cookies: AdminCookieReader,
  resolver: AdminSessionResolver | null,
): Promise<PublicUser | null> {
  if (resolver === null) {
    return null;
  }
  const token = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  let session: SessionInfo | null;
  try {
    session = await resolver.getSession(token);
  } catch {
    return null;
  }
  return session?.user ?? null;
}
