// DEMO STORE ONLY. Browser side stand in for the server wiring.
// Production wiring replaces this file with server actions that call
// AuthService (packages/auth) and PackService (packages/builder) against
// the database. This demo store keeps data in localStorage, signs demo
// users in with a browser SHA-256 hash, and must never be presented as
// production authentication and must never hold real user data outside
// local development.
//
// What the demo store does reuse from the packages: reconciliation,
// upload validation, sample content handling, niche and template config,
// and the Etsy pack values. Those are pure functions with no server
// dependency, so the demo exercises the same checks the server will run.

import type { ExportRecord, ListingPack, ListingPackCopy, PackVersion, ProductFacts, ReconciliationResult, SellerProfile } from "@listing-photos-generator/builder/browser";
import { displayedValuesFromPack, etsyPack, reconcilePack, sampleCopy, sampleFacts } from "@listing-photos-generator/builder/browser";

export interface DemoUser {
  id: string;
  email: string;
  name: string | null;
  role: "user" | "admin";
  edition: "listing-photos-generator" | "nvconsult";
}

const KEYS = {
  user: "lpg.demo.user",
  users: "lpg.demo.users",
  session: "lpg.demo.session",
  packs: "lpg.demo.packs",
  versions: "lpg.demo.versions",
  profile: "lpg.demo.profile.",
  shares: "lpg.demo.shares",
  comments: "lpg.demo.comments",
  exports: "lpg.demo.exports",
  audit: "lpg.demo.audit",
} as const;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
}

function base64url(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) {
    out += String.fromCharCode(b);
  }
  return btoa(out).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function newId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  const bytes = new Uint8Array(16);
  c.getRandomValues(bytes);
  return base64url(bytes);
}

export function getDemoSession(): DemoUser | null {
  if (!isBrowser()) {
    return null;
  }
  const raw = window.sessionStorage.getItem(KEYS.session);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as DemoUser;
  } catch {
    return null;
  }
}

interface StoredDemoUser extends DemoUser {
  passwordHash: string;
}

export async function demoRegister(email: string, password: string, name: string): Promise<{ ok: boolean; message: string; user?: DemoUser }> {
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) {
    return { ok: false, message: "Enter a valid email address." };
  }
  if (password.length < 10) {
    return { ok: false, message: "Choose a password of at least 10 characters." };
  }
  const users = readJson<StoredDemoUser[]>(KEYS.users, []);
  if (users.some((u) => u.email === clean)) {
    return { ok: false, message: "An account with that email already exists. Try signing in instead." };
  }
  const user: StoredDemoUser = {
    id: newId(),
    email: clean,
    name: name.trim() === "" ? null : name.trim(),
    role: "user",
    edition: "listing-photos-generator",
    passwordHash: await sha256Hex("demo:" + clean + ":" + password),
  };
  users.push(user);
  writeJson(KEYS.users, users);
  const publicUser: DemoUser = { id: user.id, email: user.email, name: user.name, role: user.role, edition: user.edition };
  window.sessionStorage.setItem(KEYS.session, JSON.stringify(publicUser));
  writeJson(KEYS.user, publicUser);
  return { ok: true, message: "Account created.", user: publicUser };
}

export async function demoLogin(email: string, password: string): Promise<{ ok: boolean; message: string; user?: DemoUser }> {
  const clean = email.trim().toLowerCase();
  const users = readJson<StoredDemoUser[]>(KEYS.users, []);
  const found = users.find((u) => u.email === clean);
  const hash = await sha256Hex("demo:" + clean + ":" + password);
  // Same message whether the email exists or the password is wrong.
  if (!found || found.passwordHash !== hash) {
    return { ok: false, message: "Email or password is incorrect." };
  }
  const publicUser: DemoUser = { id: found.id, email: found.email, name: found.name, role: found.role, edition: found.edition };
  window.sessionStorage.setItem(KEYS.session, JSON.stringify(publicUser));
  return { ok: true, message: "Signed in.", user: publicUser };
}

export function demoLogout(): void {
  if (!isBrowser()) {
    return;
  }
  window.sessionStorage.removeItem(KEYS.session);
}

// Demo only password change. Production runs this on the server through
// AuthService, which revokes all sessions after a change.
export async function demoChangePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ ok: boolean; message: string }> {
  if (newPassword.length < 10) {
    return { ok: false, message: "Choose a password of at least 10 characters." };
  }
  const users = readJson<StoredDemoUser[]>(KEYS.users, []);
  const found = users.find((u) => u.id === userId);
  if (!found) {
    return { ok: false, message: "Account not found." };
  }
  const currentHash = await sha256Hex("demo:" + found.email + ":" + currentPassword);
  if (found.passwordHash !== currentHash) {
    return { ok: false, message: "Your current password is incorrect." };
  }
  found.passwordHash = await sha256Hex("demo:" + found.email + ":" + newPassword);
  writeJson(KEYS.users, users);
  return { ok: true, message: "Password changed." };
}

// Demo only account deletion. Production runs this on the server: it soft
// deletes first, then hard deletes packs, uploads, exports, and AI logs,
// and writes a completion record. The demo removes the local data and
// returns the same completion wording.
export function demoDeleteAccount(userId: string): { completedAt: string; note: string } {
  const packs = readJson<ListingPack[]>(KEYS.packs, []).filter((p) => p.userId !== userId);
  writeJson(KEYS.packs, packs);
  const users = readJson<StoredDemoUser[]>(KEYS.users, []).filter((u) => u.id !== userId);
  writeJson(KEYS.users, users);
  const completedAt = new Date().toISOString();
  appendDemoAudit(userId, "account.deletion_completed", userId);
  demoLogout();
  return {
    completedAt,
    note: "Account, listing packs, uploads, exports, and AI logs deleted on request. Backups expire on the stated schedule.",
  };
}

// --- Packs ---

export function listDemoPacks(userId: string): ListingPack[] {
  return readJson<ListingPack[]>(KEYS.packs, []).filter((p) => p.userId === userId && p.deletedAt === null);
}

export function getDemoPack(packId: string): ListingPack | null {
  return readJson<ListingPack[]>(KEYS.packs, []).find((p) => p.id === packId && p.deletedAt === null) ?? null;
}

function savePackToStore(pack: ListingPack): void {
  const packs = readJson<ListingPack[]>(KEYS.packs, []);
  const index = packs.findIndex((p) => p.id === pack.id);
  if (index >= 0) {
    packs[index] = pack;
  } else {
    packs.push(pack);
  }
  writeJson(KEYS.packs, packs);
}

function saveVersion(pack: ListingPack, userId: string, note: string): PackVersion {
  const versions = readJson<PackVersion[]>(KEYS.versions, []);
  const count = versions.filter((v) => v.listingPackId === pack.id).length;
  const version: PackVersion = {
    id: newId(),
    listingPackId: pack.id,
    versionNumber: count + 1,
    snapshot: JSON.parse(JSON.stringify(pack)) as ListingPack,
    createdByUserId: userId,
    createdAt: new Date().toISOString(),
    note,
  };
  versions.push(version);
  writeJson(KEYS.versions, versions);
  return version;
}

export function createDemoPack(userId: string, facts: ProductFacts, nichePackId: string | null, useSample: boolean): ListingPack {
  const now = new Date().toISOString();
  const copy: ListingPackCopy = useSample
    ? sampleCopy()
    : { title: "", description: "", tags: [], checklist: [], claimsShown: [], generationStatus: "draft" };
  const pack: ListingPack = {
    id: newId(),
    userId,
    productId: newId(),
    productFacts: useSample ? sampleFacts() : facts,
    platformId: etsyPack.platformId,
    packVersionId: etsyPack.packVersion,
    nichePackId,
    nichePackVersionId: null,
    templateIds: [],
    mockupIds: [],
    copy,
    images: [],
    files: [],
    status: "draft",
    language: "en",
    edition: "listing-photos-generator",
    hasSampleContent: useSample,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  savePackToStore(pack);
  saveVersion(pack, userId, "Pack created");
  return pack;
}

export function saveDemoPack(pack: ListingPack, userId: string, note: string): void {
  pack.updatedAt = new Date().toISOString();
  savePackToStore(pack);
  saveVersion(pack, userId, note);
}

export function listDemoVersions(packId: string): PackVersion[] {
  return readJson<PackVersion[]>(KEYS.versions, [])
    .filter((v) => v.listingPackId === packId)
    .sort((a, b) => a.versionNumber - b.versionNumber);
}

export function restoreDemoVersion(packId: string, versionNumber: number, userId: string): ListingPack | null {
  const pack = getDemoPack(packId);
  if (!pack) {
    return null;
  }
  const target = listDemoVersions(packId).find((v) => v.versionNumber === versionNumber);
  if (!target) {
    return null;
  }
  const restored = JSON.parse(JSON.stringify(target.snapshot)) as ListingPack;
  restored.id = pack.id;
  restored.updatedAt = new Date().toISOString();
  savePackToStore(restored);
  saveVersion(restored, userId, "Restored version " + versionNumber);
  return restored;
}

export function runDemoReconciliation(pack: ListingPack): ReconciliationResult {
  return reconcilePack(pack.productFacts, displayedValuesFromPack(pack), pack.hasSampleContent);
}

export function requestDemoExport(pack: ListingPack, userId: string, kind: ExportRecord["exportKind"]): { record: ExportRecord; reconciliation: ReconciliationResult } {
  const reconciliation = runDemoReconciliation(pack);
  const record: ExportRecord = {
    id: newId(),
    listingPackId: pack.id,
    userId,
    platformId: pack.platformId,
    packVersionId: pack.packVersionId,
    exportKind: kind,
    fileFormat: etsyPack.exportFormat,
    shortestSidePx: etsyPack.shortestSidePx,
    imageCount: pack.images.length,
    status: reconciliation.canExport ? "queued" : "failed",
    errorMessage: reconciliation.canExport ? null : reconciliation.summary,
    reconciliationCheckId: newId(),
    createdAt: new Date().toISOString(),
  };
  const records = readJson<ExportRecord[]>(KEYS.exports, []);
  records.push(record);
  writeJson(KEYS.exports, records);
  if (!reconciliation.canExport) {
    appendDemoAudit(userId, "export.failed", pack.id);
  }
  if (reconciliation.canExport) {
    pack.status = "exported";
    savePackToStore(pack);
  }
  return { record, reconciliation };
}

export function listDemoExports(packId: string): ExportRecord[] {
  return readJson<ExportRecord[]>(KEYS.exports, []).filter((e) => e.listingPackId === packId);
}

export function deleteDemoPack(packId: string): void {
  const pack = getDemoPack(packId);
  if (!pack) {
    return;
  }
  pack.deletedAt = new Date().toISOString();
  pack.status = "archived";
  savePackToStore(pack);
}

// --- Seller profile ---

export function getDemoProfile(userId: string): SellerProfile | null {
  return readJson<SellerProfile | null>(KEYS.profile + userId, null);
}

export function saveDemoProfile(userId: string, values: Record<string, string>): SellerProfile {
  const now = new Date().toISOString();
  const existing = getDemoProfile(userId);
  const profile: SellerProfile = {
    id: existing?.id ?? newId(),
    userId,
    edition: "listing-photos-generator",
    values,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  writeJson(KEYS.profile + userId, profile);
  return profile;
}

// --- Share links (demo) ---

export interface DemoShareLink {
  tokenHash: string;
  listingPackId: string;
  userId: string;
  purpose: "share" | "review";
  isActive: boolean;
  expiresAt: string | null;
  viewCount: number;
  createdAt: string;
  deactivatedAt: string | null;
}

export interface DemoComment {
  id: string;
  listingPackId: string;
  authorLabel: string;
  text: string;
  createdAt: string;
}

export async function createDemoShareLink(listingPackId: string, userId: string, purpose: "share" | "review"): Promise<{ token: string; path: string }> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = base64url(bytes);
  const link: DemoShareLink = {
    tokenHash: await sha256Hex(token),
    listingPackId,
    userId,
    purpose,
    isActive: true,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    viewCount: 0,
    createdAt: new Date().toISOString(),
    deactivatedAt: null,
  };
  const links = readJson<DemoShareLink[]>(KEYS.shares, []);
  links.push(link);
  writeJson(KEYS.shares, links);
  return { token, path: "/share/" + token };
}

export async function resolveDemoShareLink(token: string): Promise<{ link: DemoShareLink; usable: boolean; reason: string | null } | null> {
  const hash = await sha256Hex(token);
  const links = readJson<DemoShareLink[]>(KEYS.shares, []);
  const link = links.find((l) => l.tokenHash === hash);
  if (!link) {
    return null;
  }
  if (!link.isActive) {
    return { link, usable: false, reason: "This share link has been revoked." };
  }
  if (link.expiresAt !== null && new Date(link.expiresAt).getTime() <= Date.now()) {
    return { link, usable: false, reason: "This share link has expired." };
  }
  link.viewCount += 1;
  writeJson(KEYS.shares, links);
  appendDemoAudit(link.userId, "share_link.viewed", link.listingPackId);
  return { link, usable: true, reason: null };
}

export function listDemoComments(listingPackId: string): DemoComment[] {
  return readJson<DemoComment[]>(KEYS.comments, []).filter((c) => c.listingPackId === listingPackId);
}

export function addDemoComment(listingPackId: string, authorLabel: string, text: string): DemoComment {
  const comment: DemoComment = {
    id: newId(),
    listingPackId,
    authorLabel: authorLabel.trim() === "" ? "Reviewer" : authorLabel.trim(),
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };
  const comments = readJson<DemoComment[]>(KEYS.comments, []);
  comments.push(comment);
  writeJson(KEYS.comments, comments);
  return comment;
}

// --- Audit (demo, counts and ids only) ---

export interface DemoAuditEvent {
  id: string;
  actorId: string | null;
  action: string;
  targetId: string | null;
  createdAt: string;
}

export function appendDemoAudit(actorId: string | null, action: string, targetId: string | null): void {
  const events = readJson<DemoAuditEvent[]>(KEYS.audit, []);
  events.push({ id: newId(), actorId, action, targetId, createdAt: new Date().toISOString() });
  writeJson(KEYS.audit, events.slice(-200));
}

export function listDemoAudit(): DemoAuditEvent[] {
  return readJson<DemoAuditEvent[]>(KEYS.audit, []).slice().reverse();
}
