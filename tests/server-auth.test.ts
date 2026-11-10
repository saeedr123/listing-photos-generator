// Server auth tests. No live database, no real secrets, no live site.
// Login is exercised through AuthService built on PrismaAuthProvider
// over the DEVELOPMENT ONLY in memory delegate from server-auth.ts,
// the same provider contract the real PrismaClient uses. The login
// and logout server actions themselves are not called here: they need
// Next.js request headers and cookies, so they are covered by the live
// server proof in scripts/verify-server-login.sh instead.

import { describe, expect, it, beforeEach } from "vitest";
import {
  InMemoryPrismaDelegate,
  createServerAuthService,
  maybeSeedFirstAdmin,
  resetInMemoryAuthStoreForTests,
} from "../apps/web/src/lib/server-auth.ts";
import { PrismaAuthProvider } from "../packages/auth/src/prisma-provider.ts";
import {
  SESSION_COOKIE_NAME,
  decideAdminAccess,
  getCurrentAdminUser,
} from "../apps/web/src/lib/admin-gate.ts";
import type { AdminCookieReader } from "../apps/web/src/lib/admin-gate.ts";

const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "a strong admin password";
const GENERIC_MESSAGE = "Email or password is incorrect.";

// The in memory delegate shares one globalThis store across every
// delegate instance in the process (see server-auth.ts), so each test
// resets it first to start from an empty user store.
beforeEach(() => {
  resetInMemoryAuthStoreForTests();
});

function cookieReader(token: string | null): AdminCookieReader {
  return { get: (name: string) => (name === SESSION_COOKIE_NAME && token ? { value: token } : undefined) };
}

async function makeAdminService() {
  const delegate = new InMemoryPrismaDelegate();
  const provider = new PrismaAuthProvider(delegate);
  const service = createServerAuthService(delegate);
  const created = await provider.createUser({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if ("error" in created) {
    throw new Error("Test setup failed to create the admin user.");
  }
  await provider.setRole(created.user.id, "admin");
  return { delegate, provider, service };
}

describe("server login through AuthService on PrismaAuthProvider", () => {
  it("creates a session and getSession resolves the admin user", async () => {
    const { service } = await makeAdminService();
    const result = await service.login({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }, "127.0.0.1");
    expect(result.ok).toBe(true);
    expect(result.sessionToken).toBeTruthy();
    const session = await service.getSession(result.sessionToken as string);
    expect(session?.user.email).toBe(ADMIN_EMAIL);
    expect(session?.user.role).toBe("admin");
  });

  it("fails a wrong password with the generic message, same as an unknown email", async () => {
    const { service } = await makeAdminService();
    const wrongPassword = await service.login({ email: ADMIN_EMAIL, password: "a wrong password here" }, "127.0.0.1");
    const unknownEmail = await service.login({ email: "nobody@example.com", password: "a wrong password here" }, "127.0.0.2");
    expect(wrongPassword.ok).toBe(false);
    expect(wrongPassword.error).toBe("invalid_credentials");
    expect(wrongPassword.message).toBe(GENERIC_MESSAGE);
    expect(unknownEmail.message).toBe(GENERIC_MESSAGE);
    expect(unknownEmail.error).toBe("invalid_credentials");
  });

  it("resolves a forged token to null, through AuthService and through the admin gate", async () => {
    const { service } = await makeAdminService();
    expect(await service.getSession("forged-token-value")).toBe(null);
    const user = await getCurrentAdminUser(cookieReader("forged-token-value"), service);
    expect(user).toBe(null);
    expect(decideAdminAccess(user).allowed).toBe(false);
  });

  it("resolves a real admin session through the admin gate and allows it", async () => {
    const { service } = await makeAdminService();
    const result = await service.login({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }, "127.0.0.1");
    const user = await getCurrentAdminUser(cookieReader(result.sessionToken as string), service);
    expect(user?.email).toBe(ADMIN_EMAIL);
    expect(decideAdminAccess(user).allowed).toBe(true);
  });

  it("shares state across delegate instances, so the login action and the admin layout see the same users", async () => {
    // Next.js bundles server-auth.ts into more than one server chunk
    // (login action chunk and admin page chunk), each with its own
    // module state. The shared globalThis store is what makes a
    // session created by one copy visible to the other.
    const first = new InMemoryPrismaDelegate();
    const firstProvider = new PrismaAuthProvider(first);
    const firstService = createServerAuthService(first);
    const created = await firstProvider.createUser({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    if ("error" in created) {
      throw new Error("Test setup failed to create the admin user.");
    }
    await firstProvider.setRole(created.user.id, "admin");
    const login = await firstService.login({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }, "127.0.0.1");
    expect(login.ok).toBe(true);
    const second = new InMemoryPrismaDelegate();
    const secondService = createServerAuthService(second);
    const session = await secondService.getSession(login.sessionToken as string);
    expect(session?.user.email).toBe(ADMIN_EMAIL);
    expect(session?.user.role).toBe("admin");
  });

  it("logout revokes the session", async () => {
    const { service } = await makeAdminService();
    const result = await service.login({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }, "127.0.0.1");
    const token = result.sessionToken as string;
    expect(await service.getSession(token)).not.toBe(null);
    await service.logout(token);
    expect(await service.getSession(token)).toBe(null);
  });

  it("supports the full provider contract on the in memory delegate: password change and email verification", async () => {
    const { provider, service } = await makeAdminService();
    const before = await service.login({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }, "127.0.0.1");
    const userId = before.user?.id as string;
    await provider.markEmailVerified(userId);
    const found = await provider.findUserById(userId);
    expect(found?.emailVerifiedAt).not.toBe(null);
    const changed = await service.changePassword(userId, ADMIN_PASSWORD, "a newer strong password", "127.0.0.1");
    expect(changed.ok).toBe(true);
    // A password change revokes all sessions.
    expect(await service.getSession(before.sessionToken as string)).toBe(null);
    const relogin = await service.login({ email: ADMIN_EMAIL, password: "a newer strong password" }, "127.0.0.1");
    expect(relogin.ok).toBe(true);
    const oldPassword = await service.login({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }, "127.0.0.1");
    expect(oldPassword.message).toBe(GENERIC_MESSAGE);
  });
});

describe("first admin seed, local proof only", () => {
  it("creates one admin from env vars when the store is empty, and never creates a second", async () => {
    const delegate = new InMemoryPrismaDelegate();
    const service = createServerAuthService(delegate);
    process.env.LPG_SEED_ADMIN_EMAIL = "seed-admin@example.com";
    process.env.LPG_SEED_ADMIN_PASSWORD = "a strong seed password";
    try {
      expect(await maybeSeedFirstAdmin(service, delegate)).toBe(true);
      expect(delegate.userCount()).toBe(1);
      const login = await service.login({ email: "seed-admin@example.com", password: "a strong seed password" }, "127.0.0.1");
      expect(login.ok).toBe(true);
      expect(login.user?.role).toBe("admin");
      expect(await maybeSeedFirstAdmin(service, delegate)).toBe(false);
      expect(delegate.userCount()).toBe(1);
    } finally {
      delete process.env.LPG_SEED_ADMIN_EMAIL;
      delete process.env.LPG_SEED_ADMIN_PASSWORD;
    }
  });

  it("creates nothing when the seed env vars are not set, and nothing when the store is not empty", async () => {
    delete process.env.LPG_SEED_ADMIN_EMAIL;
    delete process.env.LPG_SEED_ADMIN_PASSWORD;
    const emptyDelegate = new InMemoryPrismaDelegate();
    const emptyService = createServerAuthService(emptyDelegate);
    expect(await maybeSeedFirstAdmin(emptyService, emptyDelegate)).toBe(false);
    expect(emptyDelegate.userCount()).toBe(0);
    const { delegate, service } = await makeAdminService();
    process.env.LPG_SEED_ADMIN_EMAIL = "another-seed@example.com";
    process.env.LPG_SEED_ADMIN_PASSWORD = "a strong seed password";
    try {
      expect(await maybeSeedFirstAdmin(service, delegate)).toBe(false);
      expect(delegate.userCount()).toBe(1);
    } finally {
      delete process.env.LPG_SEED_ADMIN_EMAIL;
      delete process.env.LPG_SEED_ADMIN_PASSWORD;
    }
  });
});
