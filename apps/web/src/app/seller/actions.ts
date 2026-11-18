// Seller server actions. These replace the browser demo store.
//
// Every action reads the signed in user from the lpg_session cookie on
// the server. No action trusts a user id sent by the browser, and every
// pack action checks that the pack belongs to the caller. Errors come
// back as plain language messages, never as system details.

"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  addReviewComment,
  canDeletePack,
  checkStudioText,
  canEditPack,
  canViewPack,
  createShareLink,
  resolveShareLink,
  type ExportRecord,
  type ListingPack,
  type PackVersion,
  type ReconciliationResult,
  type ReviewComment,
  type SellerProfile,
  type StudioText,
} from "@listing-photos-generator/builder";
import type { AuditEvent, PublicUser } from "../../../../../packages/auth/src/types.ts";
import { SESSION_COOKIE_NAME } from "../../lib/admin-gate";
import { callerAddress, getCurrentUser } from "../../lib/current-user";
import { getSellerData } from "../../lib/seller-data";
import { mayCreatePack } from "../../lib/plan-access";
import { checkRateLimit } from "../../lib/rate-limits";
import { getServerAuthService } from "../../lib/server-auth";

export type ActionResult<T> = { ok: true; value: T } | { ok: false; message: string };

const NOT_SIGNED_IN = "Your session has ended. Sign in again.";
const NOT_FOUND = "That listing pack was not found.";
const NOT_YOURS = "You can only open your own listing packs.";

async function requireUser(): Promise<PublicUser | null> {
  return getCurrentUser();
}

function safeNext(value: FormDataEntryValue | null): string {
  const raw = typeof value === "string" ? value.trim() : "";
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
}

// ---- Accounts --------------------------------------------------------------

/** Creates a seller account on the server, signs it in, and redirects. */
export async function registerAction(formData: FormData): Promise<{ ok: false; message: string }> {
  const email = typeof formData.get("email") === "string" ? String(formData.get("email")) : "";
  const password = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";
  const name = typeof formData.get("name") === "string" ? String(formData.get("name")).trim() : "";
  const service = await getServerAuthService();
  const result = await service.register({ email, password, name: name === "" ? undefined : name }, callerAddress());
  if (!result.ok || !result.user) {
    return { ok: false, message: result.message ?? "The account could not be created." };
  }
  const login = await service.login({ email, password }, callerAddress());
  if (!login.ok || !login.sessionToken || !login.expiresAt) {
    return { ok: false, message: "Account created. Sign in to continue." };
  }
  cookies().set(SESSION_COOKIE_NAME, login.sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(0, Math.floor((new Date(login.expiresAt).getTime() - Date.now()) / 1000)),
  });
  redirect(safeNext(formData.get("next")));
}

export async function changePasswordAction(currentPassword: string, newPassword: string): Promise<ActionResult<null>> {
  const user = await requireUser();
  if (!user) return { ok: false, message: NOT_SIGNED_IN };
  const service = await getServerAuthService();
  const result = await service.changePassword(user.id, currentPassword, newPassword, callerAddress());
  if (!result.ok) return { ok: false, message: result.message ?? "The password was not changed." };
  // Every session was revoked, so sign the seller in again on this device.
  const login = await service.login({ email: user.email, password: newPassword }, callerAddress());
  if (login.ok && login.sessionToken && login.expiresAt) {
    cookies().set(SESSION_COOKIE_NAME, login.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(0, Math.floor((new Date(login.expiresAt).getTime() - Date.now()) / 1000)),
    });
  }
  return { ok: true, value: null };
}

export async function deleteAccountAction(confirmation: string): Promise<ActionResult<{ completedAt: string; note: string }>> {
  const user = await requireUser();
  if (!user) return { ok: false, message: NOT_SIGNED_IN };
  if (confirmation.trim() !== "DELETE") return { ok: false, message: "Type DELETE to confirm." };
  const data = await getSellerData();
  await data.packs.requestAccountDeletion(user.id, "user", null);
  for (const pack of await data.packs.listPacks(user.id)) {
    await data.packs.deletePack(pack.id, user.id);
  }
  const service = await getServerAuthService();
  await service.deleteAccount(user.id);
  cookies().delete(SESSION_COOKIE_NAME);
  return {
    ok: true,
    value: {
      completedAt: new Date().toISOString(),
      note: "Your account is closed, you are signed out, and your listing packs are removed from your account. Permanent removal from storage and backups follows the data retention schedule, which has not been set yet.",
    },
  };
}

export async function listMyAuditAction(): Promise<ActionResult<AuditEvent[]>> {
  const user = await requireUser();
  if (!user) return { ok: false, message: NOT_SIGNED_IN };
  const service = await getServerAuthService();
  const store = service.auditStore as { listForActor?: (actorId: string, limit: number) => Promise<AuditEvent[]>; list: (limit: number) => Promise<AuditEvent[]> };
  const events = store.listForActor ? await store.listForActor(user.id, 50) : (await store.list(500)).filter((e) => e.actorId === user.id).slice(0, 50);
  return { ok: true, value: events };
}

// ---- Seller profile --------------------------------------------------------

export async function getProfileAction(): Promise<ActionResult<SellerProfile | null>> {
  const user = await requireUser();
  if (!user) return { ok: false, message: NOT_SIGNED_IN };
  const data = await getSellerData();
  return { ok: true, value: await data.profiles.find(user.id) };
}

export async function saveProfileAction(values: Record<string, string>): Promise<ActionResult<SellerProfile>> {
  const user = await requireUser();
  if (!user) return { ok: false, message: NOT_SIGNED_IN };
  const data = await getSellerData();
  return { ok: true, value: await data.profiles.save(user.id, user.edition, values) };
}

// ---- Listing packs -----------------------------------------------------------

export interface CreatePackRequest {
  productName: string;
  useSample: boolean;
}

export async function createPackAction(request: CreatePackRequest): Promise<ActionResult<{ packId: string }>> {
  const user = await requireUser();
  if (!user) return { ok: false, message: NOT_SIGNED_IN };
  const limit = await checkRateLimit("packs.create", user.id);
  if (!limit.allowed) return { ok: false, message: limit.message };
  const data = await getSellerData();
  const plan = await mayCreatePack(user, (await data.packs.listPacks(user.id)).length);
  if (!plan.allowed) return { ok: false, message: plan.reason };
  const pack = await data.packs.createPack({
    userId: user.id,
    edition: user.edition,
    productFacts: {
      productName: request.productName.trim().slice(0, 200),
      format: "Sheets",
      formatDetail: "Google Sheets",
      tabCount: null,
      priceListMinor: null,
      priceLaunchMinor: null,
      currency: null,
      claims: [],
      features: [],
      verificationNote: "",
    },
    nichePackId: null,
    useSampleContent: request.useSample,
  });
  return { ok: true, value: { packId: pack.id } };
}

export interface PackEditorData {
  pack: ListingPack;
  versions: PackVersion[];
  exports: ExportRecord[];
  comments: ReviewComment[];
}

async function ownedPack(packId: string, check: typeof canViewPack): Promise<{ pack: ListingPack; user: PublicUser } | { error: string }> {
  const user = await requireUser();
  if (!user) return { error: NOT_SIGNED_IN };
  const data = await getSellerData();
  const pack = typeof packId === "string" && packId !== "" ? await data.packs.getPack(packId) : null;
  if (!pack || pack.deletedAt !== null) return { error: NOT_FOUND };
  if (!check({ id: user.id, role: user.role }, pack)) return { error: NOT_YOURS };
  return { pack, user };
}

export async function loadPackEditorAction(packId: string): Promise<ActionResult<PackEditorData>> {
  const owned = await ownedPack(packId, canViewPack);
  if ("error" in owned) return { ok: false, message: owned.error };
  const data = await getSellerData();
  return {
    ok: true,
    value: {
      pack: owned.pack,
      versions: await data.packs.listVersions(packId),
      exports: await data.packs.listExports(packId),
      comments: await data.shares.listComments(packId),
    },
  };
}

/**
 * Saves the parts of a pack the seller edits. Identity and ownership
 * fields (id, owner, product id, status, dates) always come from the
 * stored pack, never from the browser.
 */
export async function savePackAction(edited: ListingPack, note: string): Promise<ActionResult<{ pack: ListingPack; versions: PackVersion[] }>> {
  const owned = await ownedPack(edited?.id, canEditPack);
  if ("error" in owned) return { ok: false, message: owned.error };
  const stored = owned.pack;
  const merged: ListingPack = {
    ...stored,
    productFacts: edited.productFacts,
    copy: edited.copy,
    templateIds: Array.isArray(edited.templateIds) ? edited.templateIds : stored.templateIds,
    mockupIds: Array.isArray(edited.mockupIds) ? edited.mockupIds : stored.mockupIds,
    nichePackId: edited.nichePackId,
    images: Array.isArray(edited.images) ? edited.images : stored.images,
    files: Array.isArray(edited.files) ? edited.files : stored.files,
    // Sample content can be cleared by the seller, never added back.
    hasSampleContent: stored.hasSampleContent && edited.hasSampleContent,
  };
  const data = await getSellerData();
  await data.packs.savePack(merged, owned.user.id, String(note || "Saved").slice(0, 200));
  return { ok: true, value: { pack: merged, versions: await data.packs.listVersions(merged.id) } };
}

export async function restoreVersionAction(packId: string, versionNumber: number): Promise<ActionResult<{ pack: ListingPack; versions: PackVersion[] }>> {
  const owned = await ownedPack(packId, canEditPack);
  if ("error" in owned) return { ok: false, message: owned.error };
  const data = await getSellerData();
  const restored = await data.packs.restoreVersion(packId, versionNumber, owned.user.id);
  if (!restored) return { ok: false, message: "That version was not found." };
  return { ok: true, value: { pack: restored, versions: await data.packs.listVersions(packId) } };
}

export async function requestExportAction(packId: string): Promise<ActionResult<{ record: ExportRecord; reconciliation: ReconciliationResult; pack: ListingPack | null }>> {
  const owned = await ownedPack(packId, canEditPack);
  if ("error" in owned) return { ok: false, message: owned.error };
  const limit = await checkRateLimit("packs.export", owned.user.id);
  if (!limit.allowed) return { ok: false, message: limit.message };
  const data = await getSellerData();
  const result = await data.packs.requestExport(packId, owned.user.id, "full_pack");
  if (!result) return { ok: false, message: NOT_FOUND };
  const pack = result.reconciliation.canExport ? await data.packs.setStatus(packId, "exported", owned.user.id) : await data.packs.getPack(packId);
  return { ok: true, value: { ...result, pack } };
}

export async function deletePackAction(packId: string): Promise<ActionResult<null>> {
  const owned = await ownedPack(packId, canDeletePack);
  if ("error" in owned) return { ok: false, message: owned.error };
  const data = await getSellerData();
  await data.packs.deletePack(packId, owned.user.id);
  return { ok: true, value: null };
}

// ---- Share and review links --------------------------------------------------

export async function createShareLinkAction(packId: string, purpose: "share" | "review"): Promise<ActionResult<{ path: string }>> {
  const owned = await ownedPack(packId, canEditPack);
  if ("error" in owned) return { ok: false, message: owned.error };
  const limit = await checkRateLimit("share.create", owned.user.id);
  if (!limit.allowed) return { ok: false, message: limit.message };
  const data = await getSellerData();
  const created = await createShareLink(data.shares, { listingPackId: packId, userId: owned.user.id, purpose, expiresInDays: 30 });
  await data.audit({ actorId: owned.user.id, actorRole: "user", action: "share_link.created", targetType: "listing_pack", targetId: packId, detail: { purpose } });
  // The plain token is returned once, inside the path, and never stored.
  return { ok: true, value: { path: created.urlPath } };
}

/** What a share link shows. No owner, product or file ids leave the server. */
export interface SharedPackSummary {
  title: string;
  description: string;
  tags: string[];
  tabCount: number | null;
  format: string;
}

export interface SharedPackView {
  pack: SharedPackSummary | null;
  purpose: "share" | "review" | null;
  usable: boolean;
  reason: string | null;
  viewCount: number;
  comments: ReviewComment[];
}

/** Read only view of a pack through a share link. No sign in needed. */
export async function viewSharedPack(token: string): Promise<SharedPackView> {
  const data = await getSellerData();
  const empty = { pack: null, viewCount: 0, comments: [] };
  const resolved = typeof token === "string" && token !== "" ? await resolveShareLink(data.shares, token) : null;
  if (!resolved) return { ...empty, purpose: null, usable: false, reason: null };
  if (!resolved.usable) return { ...empty, purpose: resolved.link.purpose, usable: false, reason: resolved.reason };
  const pack = await data.packs.getPack(resolved.link.listingPackId);
  if (!pack || pack.deletedAt !== null) return { ...empty, purpose: resolved.link.purpose, usable: false, reason: "This listing pack is no longer available." };
  await data.audit({ actorId: null, actorRole: null, action: "share_link.viewed", targetType: "listing_pack", targetId: pack.id, detail: {} });
  return {
    pack: {
      title: pack.copy.title,
      description: pack.copy.description,
      tags: pack.copy.tags,
      tabCount: pack.productFacts.tabCount,
      format: pack.productFacts.formatDetail || pack.productFacts.format,
    },
    purpose: resolved.link.purpose,
    usable: true,
    reason: null,
    viewCount: resolved.link.viewCount,
    comments: resolved.link.purpose === "review" ? await data.shares.listComments(pack.id) : [],
  };
}

export async function addReviewCommentAction(token: string, authorLabel: string, text: string): Promise<ActionResult<ReviewComment>> {
  const clean = String(text ?? "").trim();
  if (clean === "") return { ok: false, message: "Write a comment first." };
  if (clean.length > 2000) return { ok: false, message: "Keep the comment under 2000 characters." };
  const limit = await checkRateLimit("share.comment", callerAddress());
  if (!limit.allowed) return { ok: false, message: limit.message };
  const data = await getSellerData();
  const resolved = await resolveShareLink(data.shares, token);
  if (!resolved || !resolved.usable) return { ok: false, message: resolved?.reason ?? "This share link was not found." };
  if (resolved.link.purpose !== "review") return { ok: false, message: "This link is view only. Comments need a review link." };
  const comment = await addReviewComment(data.shares, { shareLinkId: resolved.link.id, listingPackId: resolved.link.listingPackId, authorLabel: String(authorLabel ?? "").slice(0, 80), text: clean });
  return { ok: true, value: comment };
}

// ---- Mockup studio, working on a pack ------------------------------------------

export interface StudioPackContext {
  id: string;
  name: string;
  studioText: StudioText;
  hasSampleContent: boolean;
}

const EMPTY_STUDIO_TEXT: StudioText = { headline: "", bullets: [], badge: "" };

function cleanStudioText(text: StudioText | null | undefined): StudioText {
  const value = text ?? EMPTY_STUDIO_TEXT;
  return {
    headline: String(value.headline ?? "").trim().slice(0, 120),
    bullets: (Array.isArray(value.bullets) ? value.bullets : []).map((b) => String(b).trim().slice(0, 120)).filter(Boolean).slice(0, 6),
    badge: String(value.badge ?? "").trim().slice(0, 40),
  };
}

export async function studioPackContextAction(packId: string): Promise<ActionResult<StudioPackContext>> {
  const owned = await ownedPack(packId, canViewPack);
  if ("error" in owned) return { ok: false, message: owned.error };
  return {
    ok: true,
    value: {
      id: owned.pack.id,
      name: owned.pack.productFacts.productName || "(Untitled pack)",
      studioText: cleanStudioText(owned.pack.studioText),
      hasSampleContent: owned.pack.hasSampleContent,
    },
  };
}

/** Saves the image text on the pack and returns the fact check for it. */
export async function saveStudioTextAction(packId: string, text: StudioText): Promise<ActionResult<{ text: StudioText; check: ReconciliationResult }>> {
  const owned = await ownedPack(packId, canEditPack);
  if ("error" in owned) return { ok: false, message: owned.error };
  const clean = cleanStudioText(text);
  const data = await getSellerData();
  await data.packs.savePack({ ...owned.pack, studioText: clean }, owned.user.id, "Image text changed in the studio");
  return { ok: true, value: { text: clean, check: checkStudioText(owned.pack.productFacts, clean, owned.pack.hasSampleContent) } };
}

/** Fact check of image text against the stored pack facts. Read only. */
export async function checkStudioTextAction(packId: string, text: StudioText): Promise<ActionResult<ReconciliationResult>> {
  const owned = await ownedPack(packId, canViewPack);
  if ("error" in owned) return { ok: false, message: owned.error };
  return { ok: true, value: checkStudioText(owned.pack.productFacts, cleanStudioText(text), owned.pack.hasSampleContent) };
}

/**
 * Records a studio image set in the pack export history. The fact check
 * runs again here on the server, against the stored pack, so a browser
 * cannot record a set as passed when its text does not match.
 */
export async function recordStudioExportAction(
  packId: string,
  text: StudioText,
  imageCount: number,
  format: string,
  shortestSidePx: number,
): Promise<ActionResult<{ record: ExportRecord; check: ReconciliationResult }>> {
  const owned = await ownedPack(packId, canEditPack);
  if ("error" in owned) return { ok: false, message: owned.error };
  const check = checkStudioText(owned.pack.productFacts, cleanStudioText(text), owned.pack.hasSampleContent);
  const data = await getSellerData();
  const record = await data.packs.recordStudioExport(packId, owned.user.id, {
    check,
    imageCount: Math.max(0, Math.min(50, Math.floor(Number(imageCount) || 0))),
    format: String(format).slice(0, 10),
    shortestSidePx: Math.max(0, Math.floor(Number(shortestSidePx) || 0)),
  });
  if (!record) return { ok: false, message: NOT_FOUND };
  return { ok: true, value: { record, check } };
}
