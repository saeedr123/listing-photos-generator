// Public API of @listing-photos-generator/auth.
// Everything outside this package talks to AuthService and the types below.
// The provider is swapped by configuration, never by editing callers.

export { ROLE_LABELS, SELLER_ROLE } from "./types.ts";
export type {
  AuditAction,
  AuditEvent,
  AuthErrorCode,
  AuthIdentity,
  AuthProviderName,
  AuthResult,
  Edition,
  LoginInput,
  PublicUser,
  RegisterInput,
  Role,
  Session,
  SessionInfo,
  User,
} from "./types.ts";
export type { AuthConfig, RateLimitRule } from "./config.ts";
export { defaultAuthConfig, rateLimitMessage } from "./config.ts";
export { hashPassword, isValidEmail, normalizeEmail, verifyPassword } from "./password.ts";
export { InMemoryRateLimitStore, RateLimiter, rateLimitKey } from "./rate-limit.ts";
export type { RateLimitCheck, RateLimitStore } from "./rate-limit.ts";
export { hashSessionToken, isSessionExpired, newSessionToken, sessionExpiry } from "./sessions.ts";
export {
  canAdminAccessUserPack,
  canDeleteAccount,
  canManageAdminContent,
  canManageUsers,
  canOwnPack,
  isAdmin,
  isSeller,
  ROLES,
} from "./permissions.ts";
export { InMemoryAuditStore, newAuditEvent } from "./audit.ts";
export type { AuditStore } from "./audit.ts";
export { LocalStubAuthProvider } from "./stub-provider.ts";
export type { AuthProvider, StubProviderOptions } from "./stub-provider.ts";
export { PrismaAuthProvider } from "./prisma-provider.ts";
export type { PrismaAuthClient, PrismaSessionRow, PrismaUserRow } from "./prisma-provider.ts";
export { AuthService } from "./auth-service.ts";
export type { AuthServiceOptions } from "./auth-service.ts";
