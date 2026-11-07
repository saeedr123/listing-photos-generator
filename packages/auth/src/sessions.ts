// Session handling. Sessions are opaque random tokens. Only the SHA-256
// hash is stored, so a stolen store does not hand out live sessions.
// The plain token is returned once, at sign in, and must be carried by the
// caller as a secure, HttpOnly cookie. Never log a plain token.

import { createHash, randomBytes } from "node:crypto";

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function sessionExpiry(ttlDays: number, nowMs: number = Date.now()): string {
  return new Date(nowMs + ttlDays * 24 * 60 * 60 * 1000).toISOString();
}

export function isSessionExpired(expiresAt: string, nowMs: number = Date.now()): boolean {
  return new Date(expiresAt).getTime() <= nowMs;
}
