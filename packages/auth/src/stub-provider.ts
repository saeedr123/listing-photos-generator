// DEVELOPMENT STUB ONLY. This provider is a local stand in for a real auth
// provider. It stores users in memory, sends no email, and verifies no real
// identity. It must never be presented as production authentication, and it
// must never be used with real user data outside local development.
// Swap it for the real provider by implementing AuthProvider against the
// database User, AuthIdentity, and Session tables. No caller changes.
//
// What the stub does honestly do: passwords are hashed with scrypt, session
// tokens are stored as hashes only, login failures do not reveal whether an
// email exists, and every auth event is written to the audit store.

import { randomUUID } from "node:crypto";
import type {
  AuthIdentity,
  AuthProviderName,
  Edition,
  LoginInput,
  PublicUser,
  RegisterInput,
  Role,
  Session,
  User,
} from "./types.ts";
import { hashPassword, isValidEmail, normalizeEmail, verifyPassword } from "./password.ts";
import { hashSessionToken, isSessionExpired, newSessionToken, sessionExpiry } from "./sessions.ts";

// The interface a real provider must implement. A later split to separate
// logins, or to single sign on, means a new AuthProvider implementation and
// a configuration change. The builder, templates, mockups, and billing never
// call the provider directly; they call AuthService.
export interface AuthProvider {
  name: AuthProviderName;
  createUser(input: RegisterInput): Promise<{ user: User; identity: AuthIdentity } | { error: "email_in_use" | "invalid_email" | "weak_password" }>;
  findUserByEmail(email: string): Promise<(User & { passwordHash: string }) | null>;
  findUserById(id: string): Promise<User | null>;
  verifyCredentials(input: LoginInput): Promise<User | null>;
  createSession(userId: string, ttlDays: number): Promise<{ session: Session; token: string }>;
  findSessionByToken(token: string): Promise<Session | null>;
  revokeSession(sessionId: string): Promise<void>;
  revokeAllSessions(userId: string): Promise<void>;
  markEmailVerified(userId: string): Promise<void>;
  changePassword(userId: string, newPassword: string): Promise<boolean>;
  setRole(userId: string, role: Role): Promise<boolean>;
}

export interface StubProviderOptions {
  defaultEdition: Edition;
}

interface StoredUser extends User {
  passwordHash: string;
}

export class LocalStubAuthProvider implements AuthProvider {
  name: AuthProviderName = "email";
  private usersById = new Map<string, StoredUser>();
  private usersByEmail = new Map<string, StoredUser>();
  private identities: AuthIdentity[] = [];
  private sessionsById = new Map<string, Session>();
  private sessionsByHash = new Map<string, Session>();
  private defaultEdition: Edition;

  constructor(options: StubProviderOptions) {
    this.defaultEdition = options.defaultEdition;
  }

  async createUser(input: RegisterInput): Promise<{ user: User; identity: AuthIdentity } | { error: "email_in_use" | "invalid_email" | "weak_password" }> {
    const email = normalizeEmail(input.email);
    if (!isValidEmail(email)) {
      return { error: "invalid_email" };
    }
    if (input.password.length < 10) {
      return { error: "weak_password" };
    }
    if (this.usersByEmail.has(email)) {
      return { error: "email_in_use" };
    }
    const now = new Date().toISOString();
    const stored: StoredUser = {
      id: randomUUID(),
      email,
      name: input.name?.trim() ? input.name.trim() : null,
      role: "user",
      edition: input.edition ?? this.defaultEdition,
      emailVerifiedAt: null,
      locale: "en",
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      passwordHash: await hashPassword(input.password),
    };
    this.usersById.set(stored.id, stored);
    this.usersByEmail.set(email, stored);
    const identity: AuthIdentity = {
      id: randomUUID(),
      userId: stored.id,
      provider: "email",
      providerUserId: null,
      providerEmail: email,
      createdAt: now,
      updatedAt: now,
    };
    this.identities.push(identity);
    const { passwordHash: _ignored, ...user } = stored;
    return { user, identity };
  }

  async findUserByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
    return this.usersByEmail.get(normalizeEmail(email)) ?? null;
  }

  async findUserById(id: string): Promise<User | null> {
    const stored = this.usersById.get(id);
    if (!stored) {
      return null;
    }
    const { passwordHash: _ignored, ...user } = stored;
    return user;
  }

  async verifyCredentials(input: LoginInput): Promise<User | null> {
    const stored = await this.findUserByEmail(input.email);
    if (!stored || stored.deletedAt !== null) {
      return null;
    }
    const ok = await verifyPassword(input.password, stored.passwordHash);
    if (!ok) {
      return null;
    }
    const { passwordHash: _ignored, ...user } = stored;
    return user;
  }

  async createSession(userId: string, ttlDays: number): Promise<{ session: Session; token: string }> {
    const token = newSessionToken();
    const now = new Date().toISOString();
    const session: Session = {
      id: randomUUID(),
      userId,
      sessionTokenHash: hashSessionToken(token),
      expiresAt: sessionExpiry(ttlDays),
      lastSeenAt: null,
      createdAt: now,
      revokedAt: null,
    };
    this.sessionsById.set(session.id, session);
    this.sessionsByHash.set(session.sessionTokenHash, session);
    return { session, token };
  }

  async findSessionByToken(token: string): Promise<Session | null> {
    const session = this.sessionsByHash.get(hashSessionToken(token)) ?? null;
    if (!session || session.revokedAt !== null || isSessionExpired(session.expiresAt)) {
      return null;
    }
    return session;
  }

  async revokeSession(sessionId: string): Promise<void> {
    const session = this.sessionsById.get(sessionId);
    if (session) {
      session.revokedAt = new Date().toISOString();
    }
  }

  async revokeAllSessions(userId: string): Promise<void> {
    for (const session of this.sessionsById.values()) {
      if (session.userId === userId && session.revokedAt === null) {
        session.revokedAt = new Date().toISOString();
      }
    }
  }

  async markEmailVerified(userId: string): Promise<void> {
    const stored = this.usersById.get(userId);
    if (stored) {
      stored.emailVerifiedAt = new Date().toISOString();
      stored.updatedAt = new Date().toISOString();
    }
  }

  async changePassword(userId: string, newPassword: string): Promise<boolean> {
    const stored = this.usersById.get(userId);
    if (!stored || newPassword.length < 10) {
      return false;
    }
    stored.passwordHash = await hashPassword(newPassword);
    stored.updatedAt = new Date().toISOString();
    return true;
  }

  async setRole(userId: string, role: Role): Promise<boolean> {
    const stored = this.usersById.get(userId);
    if (!stored) {
      return false;
    }
    stored.role = role;
    stored.updatedAt = new Date().toISOString();
    return true;
  }
}
