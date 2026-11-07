// Role based permissions. Roles are "seller" and "admin".
// Sellers access only their own listing packs, unless they explicitly share
// a read only link. Admin access to a user pack is logged, limited, and only
// for support with a recorded reason (see audit.ts and access control in
// packages/builder/src/access-control.ts).

import type { PublicUser, Role } from "./types.ts";

export const ROLES: Role[] = ["user", "admin"];

export function isAdmin(user: PublicUser | null): boolean {
  return user !== null && user.role === "admin";
}

export function isSeller(user: PublicUser | null): boolean {
  return user !== null && user.role === "user";
}

export function canManageUsers(user: PublicUser | null): boolean {
  return isAdmin(user);
}

export function canManageAdminContent(user: PublicUser | null): boolean {
  // Templates, mockups, prompts, niche packs, platform packs, plans, trials.
  return isAdmin(user);
}

export function canOwnPack(user: PublicUser | null, packOwnerId: string): boolean {
  return user !== null && user.id === packOwnerId;
}

// Admin may open a user pack only for support, with a recorded reason, and
// the access is written to the audit log by the caller. This function checks
// the permission; it does not write the log. Callers must log every use.
export function canAdminAccessUserPack(user: PublicUser | null, reason: string): boolean {
  return isAdmin(user) && reason.trim().length > 0;
}

export function canDeleteAccount(user: PublicUser | null, targetUserId: string): boolean {
  if (user === null) {
    return false;
  }
  return user.id === targetUserId || user.role === "admin";
}
