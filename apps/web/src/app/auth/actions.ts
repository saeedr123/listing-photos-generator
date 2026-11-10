// Server login and logout actions. These are the only place the
// lpg_session cookie is set or cleared. Login verifies credentials
// through AuthService (PrismaAuthProvider, see ../lib/server-auth.ts)
// and never touches the demo store: the demo store keeps its session
// in browser storage, which server code cannot read and must not
// trust. Passwords and session tokens are never logged here.

"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "../../lib/admin-gate";
import { getServerAuthService } from "../../lib/server-auth";

const GENERIC_FAILURE_MESSAGE = "Email or password is incorrect.";

// Only same origin paths are accepted as a post login destination.
// Anything else falls back to /dashboard, so a crafted next value
// cannot redirect a signed in user to another site.
function safeNext(value: FormDataEntryValue | null): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return "/dashboard";
}

function callerAddress(): string {
  const forwarded = headers().get("x-forwarded-for") ?? "";
  const first = forwarded.split(",")[0]?.trim();
  return first ? first : "unknown";
}

// Verifies credentials, sets the httpOnly lpg_session cookie on
// success, and redirects to the next parameter (default /dashboard).
// On failure returns the same generic message whether the email
// exists or the password is wrong, without revealing which part
// failed. A rate limit failure returns the rate limit message
// instead, because that is about attempt count, not credentials.
export async function loginAction(formData: FormData): Promise<{ ok: false; message: string }> {
  const email = typeof formData.get("email") === "string" ? (formData.get("email") as string) : "";
  const password = typeof formData.get("password") === "string" ? (formData.get("password") as string) : "";
  const next = safeNext(formData.get("next"));
  const service = await getServerAuthService();
  const result = await service.login({ email, password }, callerAddress());
  if (!result.ok || !result.sessionToken || !result.expiresAt) {
    if (result.error === "rate_limited") {
      return { ok: false, message: result.message ?? "Too many attempts. Try again later." };
    }
    return { ok: false, message: GENERIC_FAILURE_MESSAGE };
  }
  const maxAge = Math.max(0, Math.floor((new Date(result.expiresAt).getTime() - Date.now()) / 1000));
  cookies().set(SESSION_COOKIE_NAME, result.sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  redirect(next);
}

// Revokes the current session through AuthService and clears the
// cookie, then redirects to the login page. Revoking a token that is
// already unknown or expired is a no-op, so sign out never errors
// for a stale cookie.
export async function logoutAction(): Promise<void> {
  const service = await getServerAuthService();
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await service.logout(token);
  }
  cookies().delete(SESSION_COOKIE_NAME);
  redirect("/auth/login");
}
