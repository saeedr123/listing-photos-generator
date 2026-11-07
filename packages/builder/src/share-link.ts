// Share and review links. A read only link for a listing pack, for a
// partner or reviewer to view and comment, without editing the original.
// The plain token is shown once at creation and is never stored in plain
// text. Only the SHA-256 hash is stored. View counts count views only; no
// viewer identity is stored.

import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { ReviewComment, ShareLink, SharePurpose } from "./types.ts";

export function newShareToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashShareToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export interface ShareLinkStore {
  save(link: ShareLink): Promise<void>;
  findByHash(tokenHash: string): Promise<ShareLink | null>;
  listForPack(listingPackId: string): Promise<ShareLink[]>;
  saveComment(comment: ReviewComment): Promise<void>;
  listComments(listingPackId: string): Promise<ReviewComment[]>;
}

export class InMemoryShareLinkStore implements ShareLinkStore {
  private links = new Map<string, ShareLink>();
  private comments: ReviewComment[] = [];

  async save(link: ShareLink): Promise<void> {
    this.links.set(link.tokenHash, link);
  }

  async findByHash(tokenHash: string): Promise<ShareLink | null> {
    return this.links.get(tokenHash) ?? null;
  }

  async listForPack(listingPackId: string): Promise<ShareLink[]> {
    return [...this.links.values()].filter((l) => l.listingPackId === listingPackId);
  }

  async saveComment(comment: ReviewComment): Promise<void> {
    this.comments.push(comment);
  }

  async listComments(listingPackId: string): Promise<ReviewComment[]> {
    return this.comments.filter((c) => c.listingPackId === listingPackId);
  }
}

export interface CreateShareLinkInput {
  listingPackId: string;
  userId: string;
  purpose: SharePurpose;
  // Expiry in days from creation. Null means no expiry set.
  expiresInDays: number | null;
}

export interface CreatedShareLink {
  link: ShareLink;
  // Plain token, shown once. The caller must display it once and never
  // store or log it.
  token: string;
  urlPath: string;
}

export async function createShareLink(store: ShareLinkStore, input: CreateShareLinkInput): Promise<CreatedShareLink> {
  const token = newShareToken();
  const now = new Date();
  const link: ShareLink = {
    id: randomUUID(),
    listingPackId: input.listingPackId,
    userId: input.userId,
    tokenHash: hashShareToken(token),
    purpose: input.purpose,
    isActive: true,
    expiresAt: input.expiresInDays === null ? null : new Date(now.getTime() + input.expiresInDays * 24 * 60 * 60 * 1000).toISOString(),
    viewCount: 0,
    createdAt: now.toISOString(),
    deactivatedAt: null,
  };
  await store.save(link);
  return { link, token, urlPath: "/share/" + token };
}

export interface ResolvedShareLink {
  link: ShareLink;
  // True when the link is usable right now.
  usable: boolean;
  reason: string | null;
}

export async function resolveShareLink(store: ShareLinkStore, token: string, nowMs: number = Date.now()): Promise<ResolvedShareLink | null> {
  const link = await store.findByHash(hashShareToken(token));
  if (!link) {
    return null;
  }
  if (!link.isActive) {
    return { link, usable: false, reason: "This share link has been revoked." };
  }
  if (link.expiresAt !== null && new Date(link.expiresAt).getTime() <= nowMs) {
    return { link, usable: false, reason: "This share link has expired." };
  }
  link.viewCount += 1;
  await store.save(link);
  return { link, usable: true, reason: null };
}

export async function revokeShareLink(store: ShareLinkStore, tokenHash: string): Promise<boolean> {
  const link = await store.findByHash(tokenHash);
  if (!link) {
    return false;
  }
  link.isActive = false;
  link.deactivatedAt = new Date().toISOString();
  await store.save(link);
  return true;
}

export async function addReviewComment(
  store: ShareLinkStore,
  input: { shareLinkId: string; listingPackId: string; authorLabel: string; text: string },
): Promise<ReviewComment> {
  const comment: ReviewComment = {
    id: randomUUID(),
    shareLinkId: input.shareLinkId,
    listingPackId: input.listingPackId,
    authorLabel: input.authorLabel.trim() === "" ? "Reviewer" : input.authorLabel.trim(),
    text: input.text.trim(),
    createdAt: new Date().toISOString(),
  };
  await store.saveComment(comment);
  return comment;
}
