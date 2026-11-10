// Admin gate tests. No live database, no real secrets, no live site.
// The session resolver is a stub holding one token per user, standing
// in for AuthService with PrismaAuthProvider. The admin layout now
// passes the real AuthService from server-auth.ts as the resolver (see
// apps/web/src/lib/admin-gate.ts); the live server proof in
// scripts/verify-server-login.sh covers the logged in admin path, while
// these tests cover the decision for every signed in role.

import { describe, expect, it } from "vitest";
import {
  SESSION_COOKIE_NAME,
  adminLoginUrl,
  decideAdminAccess,
  getCurrentAdminUser,
} from "../apps/web/src/lib/admin-gate.ts";
import type { AdminCookieReader, AdminSessionResolver } from "../apps/web/src/lib/admin-gate.ts";
import type { PublicUser, SessionInfo } from "../packages/auth/src/types.ts";

function publicUser(role: "user" | "admin", email: string): PublicUser {
  return { id: "id-" + role, email, name: null, role, edition: "listing-photos-generator", emailVerifiedAt: null };
}

function cookieReader(token: string | null): AdminCookieReader {
  return { get: (name: string) => (name === SESSION_COOKIE_NAME && token ? { value: token } : undefined) };
}

function stubResolver(sessions: Record<string, SessionInfo>): AdminSessionResolver {
  return { getSession: async (token: string) => sessions[token] ?? null };
}

describe("decideAdminAccess", () => {
  it("refuses a logged out visitor as signed out", () => {
    const decision = decideAdminAccess(null);
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.reason).toBe("signed_out");
    }
  });

  it("refuses a signed in non-admin user as not admin", () => {
    const decision = decideAdminAccess(publicUser("user", "seller@example.com"));
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.reason).toBe("not_admin");
      expect(decision.user?.email).toBe("seller@example.com");
    }
  });

  it("allows a signed in admin user", () => {
    const decision = decideAdminAccess(publicUser("admin", "admin@example.com"));
    expect(decision.allowed).toBe(true);
    if (decision.allowed) {
      expect(decision.user.role).toBe("admin");
    }
  });

  it("builds a login url that keeps the requested admin path", () => {
    expect(adminLoginUrl("/admin/users")).toBe("/auth/login?next=%2Fadmin%2Fusers");
  });
});

describe("getCurrentAdminUser", () => {
  const adminSession: SessionInfo = { sessionId: "s-admin", user: publicUser("admin", "admin@example.com"), expiresAt: "2027-01-01T00:00:00.000Z" };
  const sellerSession: SessionInfo = { sessionId: "s-seller", user: publicUser("user", "seller@example.com"), expiresAt: "2027-01-01T00:00:00.000Z" };

  it("returns null when no resolver is wired, even with a cookie present", async () => {
    expect(await getCurrentAdminUser(cookieReader("any-token"), null)).toBe(null);
  });

  it("returns null when no session cookie is present", async () => {
    const resolver = stubResolver({ "token-admin": adminSession });
    expect(await getCurrentAdminUser(cookieReader(null), resolver)).toBe(null);
  });

  it("resolves an admin session from the cookie, and the decision allows it", async () => {
    const resolver = stubResolver({ "token-admin": adminSession });
    const user = await getCurrentAdminUser(cookieReader("token-admin"), resolver);
    expect(user?.email).toBe("admin@example.com");
    expect(decideAdminAccess(user).allowed).toBe(true);
  });

  it("resolves a non-admin session from the cookie, and the decision refuses it", async () => {
    const resolver = stubResolver({ "token-seller": sellerSession });
    const user = await getCurrentAdminUser(cookieReader("token-seller"), resolver);
    expect(user?.email).toBe("seller@example.com");
    const decision = decideAdminAccess(user);
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.reason).toBe("not_admin");
    }
  });

  it("returns null for an unknown token and for a resolver failure", async () => {
    const resolver = stubResolver({ "token-admin": adminSession });
    expect(await getCurrentAdminUser(cookieReader("unknown-token"), resolver)).toBe(null);
    const failing: AdminSessionResolver = { getSession: async () => { throw new Error("database down"); } };
    expect(await getCurrentAdminUser(cookieReader("token-admin"), failing)).toBe(null);
  });
});
