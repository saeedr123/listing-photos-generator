// Access control for listing packs. Users can only access their own listing
// packs, unless they explicitly share a read only link. Admin access to a
// user pack is logged, limited, and only for support with a recorded reason.
// This module checks permission. Callers must write the audit log entry for
// every admin access; the check alone is not the log.

export interface PackActor {
  id: string;
  role: "user" | "admin";
}

export interface PackOwner {
  userId: string;
}

export function canViewPack(actor: PackActor | null, pack: PackOwner): boolean {
  return actor !== null && actor.id === pack.userId;
}

export function canEditPack(actor: PackActor | null, pack: PackOwner): boolean {
  return actor !== null && actor.id === pack.userId;
}

export function canDeletePack(actor: PackActor | null, pack: PackOwner): boolean {
  return actor !== null && actor.id === pack.userId;
}

// Admin support access: allowed only with a recorded reason. The caller
// must log the access with action "admin.user_pack_access", the admin id,
// the pack id, and the reason, before opening the pack.
export function canAdminAccessPack(actor: PackActor | null, reason: string): boolean {
  return actor !== null && actor.role === "admin" && reason.trim().length > 0;
}

export function adminAccessRequiresReason(): string {
  return "Admin access to a user pack needs a recorded support reason.";
}
