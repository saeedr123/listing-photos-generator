// Versioning for templates, mockups, prompts, niche packs, and platform
// packs. Every change creates a new version. A published item must not
// change silently for existing sellers without a version note: publish
// requires a change note, and rollback creates a new version from an
// older snapshot, never overwriting history.

export type VersionStatus = "draft" | "preview" | "published" | "retired";

export interface VersionedItem {
  id: string;
  kind: "template" | "mockup" | "prompt" | "niche-pack" | "platform-pack";
  slug: string;
  name: string;
  version: number;
  status: VersionStatus;
  changeNote: string;
  previousVersion: number | null;
  createdBy: string;
  createdAt: string;
  publishedAt: string | null;
  publishedBy: string | null;
}

export function nextVersion(item: VersionedItem, changeNote: string, actor: string): VersionedItem {
  if (!changeNote.trim()) {
    throw new Error("A version note is required. A published item must not change without a version note.");
  }
  return { ...item, version: item.version + 1, status: "draft", changeNote: changeNote.trim(), previousVersion: item.version, createdBy: actor, createdAt: new Date().toISOString(), publishedAt: null, publishedBy: null };
}

export function publishVersion(item: VersionedItem, actor: string): VersionedItem {
  if (!item.changeNote.trim()) {
    throw new Error("Cannot publish a version with no version note.");
  }
  return { ...item, status: "published", publishedAt: new Date().toISOString(), publishedBy: actor };
}

export function rollbackVersion(current: VersionedItem, older: VersionedItem, reason: string, actor: string): VersionedItem {
  if (!reason.trim()) {
    throw new Error("A rollback reason is required.");
  }
  return { ...older, version: current.version + 1, status: "preview", changeNote: "Rollback to version " + older.version + ": " + reason.trim(), previousVersion: current.version, createdBy: actor, createdAt: new Date().toISOString(), publishedAt: null, publishedBy: null };
}

export function hideVersion(item: VersionedItem): VersionedItem {
  return { ...item, status: "retired" };
}

export function onlyOnePublished(items: VersionedItem[]): boolean {
  return items.filter((i) => i.status === "published").length <= 1;
}
