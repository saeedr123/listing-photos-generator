// Prisma backed AuthProvider. Implements the AuthProvider interface
// against the Prisma User, AuthIdentity, and Session tables
// (prisma/schema.prisma), replacing the development stub for any real
// user data. No live database is connected by this file itself: the
// caller supplies a PrismaClient (or a test double with the same
// delegates). The client is typed as a minimal delegate interface, not
// as the generated PrismaClient, so this package compiles and tests
// without a generated client or a live database. When a real client is
// passed, the calls below are real Prisma calls.
//
// The LocalStubAuthProvider in stub-provider.ts remains DEVELOPMENT
// STUB ONLY. It must never hold real user data outside local
// development. Production wiring must construct AuthService with
// PrismaAuthProvider, never with the stub.

import { randomUUID } from "node:crypto";
import type { AuthIdentity, Edition, LoginInput, RegisterInput, Role, Session, User } from "./types.ts";
import type { AuthProvider } from "./stub-provider.ts";
import { hashPassword, isValidEmail, normalizeEmail, verifyPassword } from "./password.ts";
import { hashSessionToken, isSessionExpired, newSessionToken, sessionExpiry } from "./sessions.ts";

// Minimal Prisma delegate shapes. Only the methods this provider calls.
// Field names are the Prisma snake_case column names.
export interface PrismaUserRow {
  id: string;
  email: string;
  name: string | null;
  password_hash: string;
  role: string;
  edition: string;
  email_verified_at: Date | null;
  locale: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface PrismaSessionRow {
  id: string;
  user_id: string;
  session_token_hash: string;
  expires_at: Date;
  last_seen_at: Date | null;
  created_at: Date;
  revoked_at: Date | null;
}

export interface PrismaAuthClient {
  user: {
    create(args: { data: Record<string, unknown> }): Promise<PrismaUserRow>;
    findUnique(args: { where: Record<string, unknown> }): Promise<PrismaUserRow | null>;
    update(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<PrismaUserRow>;
  };
  authIdentity: {
    create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
  };
  session: {
    create(args: { data: Record<string, unknown> }): Promise<PrismaSessionRow>;
    findUnique(args: { where: Record<string, unknown> }): Promise<PrismaSessionRow | null>;
    update(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<PrismaSessionRow>;
    updateMany(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }>;
  };
}

function toUser(row: PrismaUserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as Role,
    edition: row.edition as Edition,
    emailVerifiedAt: row.email_verified_at ? row.email_verified_at.toISOString() : null,
    locale: row.locale,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    deletedAt: row.deleted_at ? row.deleted_at.toISOString() : null,
  };
}

function toSession(row: PrismaSessionRow): Session {
  return {
    id: row.id,
    userId: row.user_id,
    sessionTokenHash: row.session_token_hash,
    expiresAt: row.expires_at.toISOString(),
    lastSeenAt: row.last_seen_at ? row.last_seen_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    revokedAt: row.revoked_at ? row.revoked_at.toISOString() : null,
  };
}

export class PrismaAuthProvider implements AuthProvider {
  name = "email" as const;
  private client: PrismaAuthClient;
  private defaultEdition: Edition;

  constructor(client: PrismaAuthClient, defaultEdition: Edition = "listing-photos-generator") {
    this.client = client;
    this.defaultEdition = defaultEdition;
  }

  async createUser(input: RegisterInput): Promise<{ user: User; identity: AuthIdentity } | { error: "email_in_use" | "invalid_email" | "weak_password" }> {
    const email = normalizeEmail(input.email);
    if (!isValidEmail(email)) return { error: "invalid_email" };
    if (input.password.length < 10) return { error: "weak_password" };
    const existing = await this.client.user.findUnique({ where: { email } });
    if (existing) return { error: "email_in_use" };
    const passwordHash = await hashPassword(input.password);
    const row = await this.client.user.create({ data: { email, password_hash: passwordHash, name: input.name?.trim() ? input.name.trim() : null, role: "user", edition: input.edition ?? this.defaultEdition, locale: "en" } });
    const identityRow = await this.client.authIdentity.create({ data: { user_id: row.id, provider: "email", provider_user_id: null, provider_email: email } });
    const user = toUser(row);
    const identity: AuthIdentity = { id: identityRow.id, userId: row.id, provider: "email", providerUserId: null, providerEmail: email, createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString() };
    return { user, identity };
  }

  async findUserByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
    const row = await this.client.user.findUnique({ where: { email: normalizeEmail(email) } });
    if (!row) return null;
    return { ...toUser(row), passwordHash: row.password_hash };
  }

  async findUserById(id: string): Promise<User | null> {
    const row = await this.client.user.findUnique({ where: { id } });
    return row ? toUser(row) : null;
  }

  async verifyCredentials(input: LoginInput): Promise<User | null> {
    const stored = await this.findUserByEmail(input.email);
    if (!stored || stored.deletedAt !== null) return null;
    const ok = await verifyPassword(input.password, stored.passwordHash);
    if (!ok) return null;
    const { passwordHash: _ignored, ...user } = stored;
    return user;
  }

  async createSession(userId: string, ttlDays: number): Promise<{ session: Session; token: string }> {
    const token = newSessionToken();
    const row = await this.client.session.create({ data: { user_id: userId, session_token_hash: hashSessionToken(token), expires_at: new Date(sessionExpiry(ttlDays)) } });
    return { session: toSession(row), token };
  }

  async findSessionByToken(token: string): Promise<Session | null> {
    const row = await this.client.session.findUnique({ where: { session_token_hash: hashSessionToken(token) } });
    if (!row || row.revoked_at !== null || isSessionExpired(row.expires_at.toISOString())) return null;
    return toSession(row);
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.client.session.update({ where: { id: sessionId }, data: { revoked_at: new Date() } });
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.client.session.updateMany({ where: { user_id: userId, revoked_at: null }, data: { revoked_at: new Date() } });
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.client.user.update({ where: { id: userId }, data: { email_verified_at: new Date() } });
  }

  async changePassword(userId: string, newPassword: string): Promise<boolean> {
    if (newPassword.length < 10) return false;
    await this.client.user.update({ where: { id: userId }, data: { password_hash: await hashPassword(newPassword) } });
    return true;
  }

  async setRole(userId: string, role: Role): Promise<boolean> {
    await this.client.user.update({ where: { id: userId }, data: { role } });
    return true;
  }
}
