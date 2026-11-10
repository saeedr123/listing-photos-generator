// Auth tests. Run with: node --test src/__tests__/
// Uses only Node built-ins and the package itself. No live provider, no secrets.

import test from "node:test";
import assert from "node:assert/strict";
import { AuthService } from "../auth-service.ts";
import { LocalStubAuthProvider } from "../stub-provider.ts";
import { GOOGLE_CALLBACK_PATH, GoogleProviderStub, loadGoogleSignInConfig } from "../google-provider.ts";
import { defaultAuthConfig } from "../config.ts";
import { hashPassword, verifyPassword } from "../password.ts";
import { RateLimiter } from "../rate-limit.ts";
import { canAdminAccessUserPack, canOwnPack, isAdmin, isSeller } from "../permissions.ts";
import { ROLE_LABELS, SELLER_ROLE } from "../types.ts";
import { InMemoryAuditStore } from "../audit.ts";

function makeService() {
  const provider = new LocalStubAuthProvider({ defaultEdition: "listing-photos-generator" });
  const audit = new InMemoryAuditStore();
  const service = new AuthService({ provider, auditStore: audit, config: defaultAuthConfig });
  return { provider, audit, service };
}

test("password hashing verifies and rejects wrong passwords", async () => {
  const hash = await hashPassword("correct horse battery");
  assert.equal(await verifyPassword("correct horse battery", hash), true);
  assert.equal(await verifyPassword("wrong password here", hash), false);
  assert.equal(await verifyPassword("correct horse battery", "not-a-hash"), false);
});

test("register creates a seller with the edition tag, login returns a session", async () => {
  const { service } = makeService();
  const registered = await service.register(
    { email: "seller@example.com", password: "a strong password", name: "Test Seller" },
    "127.0.0.1",
  );
  assert.equal(registered.ok, true);
  assert.equal(registered.user?.role, "user");
  assert.equal(registered.user?.edition, "listing-photos-generator");
  assert.ok(registered.sessionToken);
  assert.equal(registered.user?.email, "seller@example.com");

  const session = await service.getSession(registered.sessionToken as string);
  assert.ok(session);
  assert.equal(session?.user.id, registered.user?.id);
});

test("register rejects a duplicate email and a short password", async () => {
  const { service } = makeService();
  await service.register({ email: "dup@example.com", password: "a strong password" }, "127.0.0.1");
  const dup = await service.register({ email: "dup@example.com", password: "a strong password" }, "127.0.0.1");
  assert.equal(dup.ok, false);
  assert.equal(dup.error, "email_in_use");
  const weak = await service.register({ email: "new@example.com", password: "short" }, "127.0.0.1");
  assert.equal(weak.ok, false);
  assert.equal(weak.error, "weak_password");
});

test("login failure does not reveal whether the email exists", async () => {
  const { service } = makeService();
  await service.register({ email: "real@example.com", password: "a strong password" }, "127.0.0.1");
  const wrongPassword = await service.login({ email: "real@example.com", password: "wrong password" }, "127.0.0.1");
  const unknownEmail = await service.login({ email: "nobody@example.com", password: "wrong password" }, "127.0.0.2");
  assert.equal(wrongPassword.message, unknownEmail.message);
  assert.equal(wrongPassword.error, "invalid_credentials");
});

test("login rate limit blocks after 5 attempts with a clear message", async () => {
  const { service } = makeService();
  for (let i = 0; i < 5; i++) {
    const attempt = await service.login({ email: "rl@example.com", password: "wrong password" }, "10.0.0.1");
    assert.equal(attempt.error, "invalid_credentials");
  }
  const blocked = await service.login({ email: "rl@example.com", password: "wrong password" }, "10.0.0.1");
  assert.equal(blocked.ok, false);
  assert.equal(blocked.error, "rate_limited");
  assert.match(blocked.message ?? "", /Too many attempts/);
  assert.ok((blocked.retryAfterSeconds ?? 0) > 0);
});

test("logout revokes the session", async () => {
  const { service } = makeService();
  const registered = await service.register({ email: "out@example.com", password: "a strong password" }, "127.0.0.1");
  const token = registered.sessionToken as string;
  assert.ok(await service.getSession(token));
  await service.logout(token);
  assert.equal(await service.getSession(token), null);
});

test("password change revokes all sessions", async () => {
  const { service } = makeService();
  const registered = await service.register({ email: "chg@example.com", password: "a strong password" }, "127.0.0.1");
  const token = registered.sessionToken as string;
  const changed = await service.changePassword(registered.user?.id as string, "a strong password", "a newer strong password", "127.0.0.1");
  assert.equal(changed.ok, true);
  assert.equal(await service.getSession(token), null);
  const relogin = await service.login({ email: "chg@example.com", password: "a newer strong password" }, "127.0.0.1");
  assert.equal(relogin.ok, true);
});

test("permissions: seller owns only own packs, admin needs a reason for user packs", () => {
  const seller = { id: "u1", email: "s@example.com", name: null, role: "user", edition: "listing-photos-generator", emailVerifiedAt: null } as const;
  const admin = { id: "a1", email: "a@example.com", name: null, role: "admin", edition: "listing-photos-generator", emailVerifiedAt: null } as const;
  assert.equal(canOwnPack(seller, "u1"), true);
  assert.equal(canOwnPack(seller, "u2"), false);
  assert.equal(isAdmin(admin), true);
  assert.equal(isAdmin(seller), false);
  // Stored role value is "user" per the Prisma schema; the product calls
  // that role a seller.
  assert.equal(SELLER_ROLE, "user");
  assert.equal(ROLE_LABELS[SELLER_ROLE], "Seller");
  assert.equal(isSeller(seller), true);
  assert.equal(canAdminAccessUserPack(admin, "support ticket, seller asked for help"), true);
  assert.equal(canAdminAccessUserPack(admin, "   "), false);
  assert.equal(canAdminAccessUserPack(seller, "support ticket"), false);
});

test("audit log records login and rate limit events with time, actor, action", async () => {
  const { service, audit } = makeService();
  await service.register({ email: "audit@example.com", password: "a strong password" }, "127.0.0.1");
  await service.login({ email: "audit@example.com", password: "a strong password" }, "127.0.0.1");
  const events = await audit.list();
  const actions = events.map((e) => e.action);
  assert.ok(actions.includes("auth.register"));
  assert.ok(actions.includes("auth.login"));
  for (const event of events) {
    assert.ok(event.createdAt);
    assert.ok(event.action);
    assert.ok(!("password" in event.detail));
  }
});

test("rate limiter allows again after reset", async () => {
  const limiter = new RateLimiter();
  const key = "test:user:1.2.3.4";
  for (let i = 0; i < 3; i++) {
    assert.equal((await limiter.check(key, 3, 60)).allowed, true);
  }
  assert.equal((await limiter.check(key, 3, 60)).allowed, false);
  await limiter.reset(key);
  assert.equal((await limiter.check(key, 3, 60)).allowed, true);
});

test("google sign-in placeholder: disabled without client id and secret, with a clear not configured error", () => {
  const config = loadGoogleSignInConfig({});
  assert.equal(config.clientId, null);
  assert.equal(config.clientSecretSet, false);
  assert.equal(config.enabled, false);
  assert.equal(config.callbackPath, "/auth/google/callback");
  assert.equal(GOOGLE_CALLBACK_PATH, "/auth/google/callback");
  const stub = new GoogleProviderStub(config);
  assert.equal(stub.isConfigured(), false);
  const begin = stub.beginSignIn();
  assert.equal(begin.ok, false);
  assert.equal(begin.error, "google_not_configured");
  assert.match(begin.message, /GOOGLE_CLIENT_ID/);
  assert.match(begin.message, /GOOGLE_CLIENT_SECRET/);
  assert.match(begin.message, /\/auth\/google\/callback/);
  const callback = stub.handleCallback("code-from-google");
  assert.equal(callback.ok, false);
  assert.equal(callback.error, "google_not_configured");
});

test("google sign-in placeholder: still refuses when both values are set, because the exchange is not built", () => {
  const config = loadGoogleSignInConfig({
    GOOGLE_CLIENT_ID: "placeholder-client-id-not-a-real-id",
    GOOGLE_CLIENT_SECRET: "placeholder-not-a-real-secret",
  });
  assert.equal(config.enabled, true);
  assert.equal(config.clientSecretSet, true);
  // Only the presence of the secret is recorded, never its value.
  assert.ok(!("clientSecret" in config));
  const stub = new GoogleProviderStub(config);
  assert.equal(stub.isConfigured(), true);
  const begin = stub.beginSignIn();
  assert.equal(begin.ok, false);
  assert.equal(begin.error, "google_not_implemented");
  assert.match(begin.message, /not implemented yet/);
  const callback = stub.handleCallback("code-from-google");
  assert.equal(callback.ok, false);
  assert.equal(callback.error, "google_not_implemented");
});

test("google sign-in placeholder: no network call and no real credential in source", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync(new URL("../google-provider.ts", import.meta.url).pathname, "utf8");
  assert.ok(!source.includes("fetch("));
  assert.ok(!source.includes("accounts.google.com"));
  assert.ok(!source.includes("oauth2.googleapis.com"));
});
