// AuthService: the single boundary every other module talks to. It owns
// registration, login, session checks, logout, password change, and the
// rate limits on auth endpoints. It never knows prices, template layouts,
// or platform rules. A later split to separate logins or single sign on
// swaps the AuthProvider and the configuration; this service does not change.

import type { AuthConfig } from "./config.ts";
import { defaultAuthConfig, rateLimitMessage } from "./config.ts";
import type { AuditStore } from "./audit.ts";
import { InMemoryAuditStore, newAuditEvent } from "./audit.ts";
import type { AuthProvider } from "./stub-provider.ts";
import type { AuthResult, LoginInput, PublicUser, RegisterInput, SessionInfo } from "./types.ts";
import { normalizeEmail } from "./password.ts";
import { RateLimiter, rateLimitKey } from "./rate-limit.ts";

export interface AuthServiceOptions {
  provider: AuthProvider;
  config?: AuthConfig;
  auditStore?: AuditStore;
  rateLimiter?: RateLimiter;
}

function toPublicUser(user: {
  id: string;
  email: string;
  name: string | null;
  role: "user" | "admin";
  edition: "listing-photos-generator" | "nvconsult";
  emailVerifiedAt: string | null;
}): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    edition: user.edition,
    emailVerifiedAt: user.emailVerifiedAt,
  };
}

export class AuthService {
  private provider: AuthProvider;
  private config: AuthConfig;
  private audit: AuditStore;
  private limiter: RateLimiter;

  constructor(options: AuthServiceOptions) {
    this.provider = options.provider;
    this.config = options.config ?? defaultAuthConfig;
    this.audit = options.auditStore ?? new InMemoryAuditStore();
    this.limiter = options.rateLimiter ?? new RateLimiter();
  }

  get auditStore(): AuditStore {
    return this.audit;
  }

  async register(input: RegisterInput, callerAddress: string): Promise<AuthResult> {
    const email = normalizeEmail(input.email);
    const limit = await this.limiter.check(
      rateLimitKey("register", callerAddress, callerAddress),
      this.config.rateLimits.register.maxAttempts,
      this.config.rateLimits.register.windowSeconds,
    );
    if (!limit.allowed) {
      await this.audit.append(
        newAuditEvent({
          actorId: null,
          actorRole: null,
          action: "auth.rate_limited",
          targetType: "auth",
          targetId: null,
          detail: { endpoint: "register" },
        }),
      );
      return { ok: false, error: "rate_limited", message: rateLimitMessage(limit.retryAfterSeconds), retryAfterSeconds: limit.retryAfterSeconds };
    }
    if (input.edition && !this.config.allowedEditions.includes(input.edition)) {
      return { ok: false, error: "invalid_email", message: "That entry point is not available." };
    }
    const created = await this.provider.createUser({
      email,
      password: input.password,
      name: input.name,
      edition: input.edition ?? this.config.defaultEdition,
    });
    if ("error" in created) {
      if (created.error === "email_in_use") {
        return { ok: false, error: "email_in_use", message: "An account with that email already exists. Try signing in instead." };
      }
      if (created.error === "invalid_email") {
        return { ok: false, error: "invalid_email", message: "Enter a valid email address." };
      }
      return {
        ok: false,
        error: "weak_password",
        message: "Choose a password of at least " + this.config.passwordMinLength + " characters.",
      };
    }
    const user = toPublicUser(created.user);
    await this.audit.append(
      newAuditEvent({
        actorId: user.id,
        actorRole: user.role,
        action: "auth.register",
        targetType: "user",
        targetId: user.id,
        detail: { edition: user.edition },
      }),
    );
    const { token, session } = await this.provider.createSession(user.id, this.config.sessionTtlDays);
    return { ok: true, user, sessionToken: token, expiresAt: session.expiresAt };
  }

  async login(input: LoginInput, callerAddress: string): Promise<AuthResult> {
    const email = normalizeEmail(input.email);
    const limit = await this.limiter.check(
      rateLimitKey("login", email, callerAddress),
      this.config.rateLimits.login.maxAttempts,
      this.config.rateLimits.login.windowSeconds,
    );
    if (!limit.allowed) {
      await this.audit.append(
        newAuditEvent({
          actorId: null,
          actorRole: null,
          action: "auth.rate_limited",
          targetType: "auth",
          targetId: null,
          detail: { endpoint: "login" },
        }),
      );
      return { ok: false, error: "rate_limited", message: rateLimitMessage(limit.retryAfterSeconds), retryAfterSeconds: limit.retryAfterSeconds };
    }
    const user = await this.provider.verifyCredentials({ email, password: input.password });
    if (!user) {
      // Same message whether the email exists or the password is wrong.
      // Never reveal which one failed.
      await this.audit.append(
        newAuditEvent({
          actorId: null,
          actorRole: null,
          action: "auth.login_failed",
          targetType: "auth",
          targetId: null,
          detail: { endpoint: "login" },
        }),
      );
      return { ok: false, error: "invalid_credentials", message: "Email or password is incorrect." };
    }
    await this.limiter.reset(rateLimitKey("login", email, callerAddress));
    const publicUser = toPublicUser(user);
    await this.audit.append(
      newAuditEvent({
        actorId: publicUser.id,
        actorRole: publicUser.role,
        action: "auth.login",
        targetType: "user",
        targetId: publicUser.id,
        detail: { edition: publicUser.edition },
      }),
    );
    const { token, session } = await this.provider.createSession(publicUser.id, this.config.sessionTtlDays);
    return { ok: true, user: publicUser, sessionToken: token, expiresAt: session.expiresAt };
  }

  async getSession(sessionToken: string): Promise<SessionInfo | null> {
    const session = await this.provider.findSessionByToken(sessionToken);
    if (!session) {
      return null;
    }
    const user = await this.provider.findUserById(session.userId);
    if (!user || user.deletedAt !== null) {
      return null;
    }
    return { sessionId: session.id, user: toPublicUser(user), expiresAt: session.expiresAt };
  }

  async logout(sessionToken: string): Promise<void> {
    const session = await this.provider.findSessionByToken(sessionToken);
    if (!session) {
      return;
    }
    await this.provider.revokeSession(session.id);
    await this.audit.append(
      newAuditEvent({
        actorId: session.userId,
        actorRole: null,
        action: "auth.logout",
        targetType: "session",
        targetId: session.id,
        detail: {},
      }),
    );
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string, callerAddress: string): Promise<AuthResult> {
    const limit = await this.limiter.check(
      rateLimitKey("password-change", userId, callerAddress),
      this.config.rateLimits.passwordChange.maxAttempts,
      this.config.rateLimits.passwordChange.windowSeconds,
    );
    if (!limit.allowed) {
      return { ok: false, error: "rate_limited", message: rateLimitMessage(limit.retryAfterSeconds), retryAfterSeconds: limit.retryAfterSeconds };
    }
    const stored = await this.provider.findUserByEmail((await this.provider.findUserById(userId))?.email ?? "");
    if (!stored) {
      return { ok: false, error: "not_found", message: "Account not found." };
    }
    const currentOk = await this.provider.verifyCredentials({ email: stored.email, password: currentPassword });
    if (!currentOk) {
      return { ok: false, error: "invalid_credentials", message: "Your current password is incorrect." };
    }
    if (newPassword.length < this.config.passwordMinLength) {
      return {
        ok: false,
        error: "weak_password",
        message: "Choose a password of at least " + this.config.passwordMinLength + " characters.",
      };
    }
    const changed = await this.provider.changePassword(userId, newPassword);
    if (!changed) {
      return { ok: false, error: "not_found", message: "Account not found." };
    }
    await this.provider.revokeAllSessions(userId);
    await this.audit.append(
      newAuditEvent({
        actorId: userId,
        actorRole: null,
        action: "auth.password_changed",
        targetType: "user",
        targetId: userId,
        detail: {},
      }),
    );
    return { ok: true };
  }
}
