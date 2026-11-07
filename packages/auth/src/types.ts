// Auth types for Listing Photos Generator.
// Edition tag rule (PROMPT.md section 2.6): every User row carries an edition
// value recording the entry edition. A user who uses both editions has packs
// in both partitions, and that case is resolved explicitly at split time,
// not silently assigned to one side.

// Stored role values follow the Prisma schema (prisma/schema.prisma) and
// docs/database-design.md: "user" is the seller account, "admin" is the
// administrator. The product calls the "user" role a seller everywhere the
// seller sees it. SELLER_ROLE is the stored value for the seller role.
export type Role = "user" | "admin";

export const SELLER_ROLE: Role = "user";

export const ROLE_LABELS: Record<Role, string> = {
  user: "Seller",
  admin: "Admin",
};

// Entry edition. Values are configuration, to be confirmed at split time.
// "listing-photos-generator" is the commercial tools entry point.
// "nvconsult" is the NVConsult entry point. Both open the same app now.
export type Edition = "listing-photos-generator" | "nvconsult";

export type AuthProviderName = "email" | "sso";

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  edition: Edition;
  emailVerifiedAt: string | null;
  locale: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// Public view of a user. Never includes a password hash or a token.
export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  edition: Edition;
  emailVerifiedAt: string | null;
}

export interface AuthIdentity {
  id: string;
  userId: string;
  provider: AuthProviderName;
  providerUserId: string | null;
  providerEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  // Only the hash is ever stored. The plain token is shown once, at sign in.
  sessionTokenHash: string;
  expiresAt: string;
  lastSeenAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export interface SessionInfo {
  sessionId: string;
  user: PublicUser;
  expiresAt: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
  edition?: Edition;
}

export interface LoginInput {
  email: string;
  password: string;
}

export type AuditAction =
  | "auth.register"
  | "auth.login"
  | "auth.login_failed"
  | "auth.logout"
  | "auth.rate_limited"
  | "auth.email_verified"
  | "auth.password_changed"
  | "auth.session_revoked"
  | "subscription.changed"
  | "trial.started"
  | "export.failed"
  | "admin.user_pack_access"
  | "admin.user_changed"
  | "account.deletion_requested"
  | "account.deletion_completed"
  | "share_link.created"
  | "share_link.viewed"
  | "share_link.revoked";

export interface AuditEvent {
  id: string;
  actorId: string | null;
  actorRole: Role | "system" | null;
  action: AuditAction;
  targetType: string;
  targetId: string | null;
  reason: string | null;
  createdAt: string;
  // Counts and ids only. Never product content, listing copy, or secrets.
  detail: Record<string, string | number | boolean | null>;
}

export interface AuthResult {
  ok: boolean;
  user?: PublicUser;
  // Plain session token, returned once. The caller must hand it to the
  // client as a secure cookie and never store or log the plain value.
  sessionToken?: string;
  expiresAt?: string;
  error?: AuthErrorCode;
  message?: string;
  retryAfterSeconds?: number;
}

export type AuthErrorCode =
  | "invalid_credentials"
  | "email_in_use"
  | "invalid_email"
  | "weak_password"
  | "rate_limited"
  | "session_expired"
  | "session_revoked"
  | "not_found"
  | "forbidden";
