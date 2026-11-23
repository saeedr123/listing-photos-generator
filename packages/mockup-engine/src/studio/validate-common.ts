// Small shared validators for the studio modules.

import type { AssetLicence, RegistryStatus, StudioIssue, Vec3 } from "./types.ts";
import { REGISTRY_STATUSES } from "./types.ts";

const HEX = /^#[0-9a-fA-F]{6}$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;

export function isHexColour(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value);
}

export function isSlug(value: unknown): value is string {
  return typeof value === "string" && SLUG.test(value);
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isVec3(value: unknown): value is Vec3 {
  return Array.isArray(value) && value.length === 3 && value.every(isFiniteNumber);
}

export function isRegistryStatus(value: unknown): value is RegistryStatus {
  return typeof value === "string" && (REGISTRY_STATUSES as readonly string[]).includes(value);
}

/** The four fields PROMPT.md section 9.3 requires, for every asset, in house or licensed. */
export function missingLicenceFields(licence: AssetLicence | null | undefined): string[] {
  const missing: string[] = [];
  if (!licence) return ["licence record"];
  if (!licence.source || !licence.source.trim()) missing.push("licence source");
  if (!licence.licenceType || !licence.licenceType.trim()) missing.push("licence type");
  if (!licence.licenceDate || !licence.licenceDate.trim()) missing.push("licence date");
  if (!licence.licenceStorageLocation || !licence.licenceStorageLocation.trim()) missing.push("licence storage location");
  return missing;
}

export function versionIssues(
  what: string,
  doc: { version: number; previousVersion: number | null; changeNote: string; status: unknown },
): StudioIssue[] {
  const issues: StudioIssue[] = [];
  if (!Number.isInteger(doc.version) || doc.version < 1) {
    issues.push({ code: "bad-version", message: `${what}: version must be a whole number from 1.` });
  }
  if (doc.version > 1 && doc.previousVersion === null) {
    issues.push({ code: "missing-previous-version", message: `${what}: a version above 1 must name its previous version.` });
  }
  if (doc.version > 1 && (!doc.changeNote || !doc.changeNote.trim())) {
    issues.push({ code: "missing-change-note", message: `${what}: a new version needs a change note.` });
  }
  if (!isRegistryStatus(doc.status)) {
    issues.push({ code: "bad-status", message: `${what}: status must be one of ${REGISTRY_STATUSES.join(", ")}.` });
  }
  return issues;
}
