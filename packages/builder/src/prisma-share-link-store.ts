// Share links and review comments on the ShareLink and ReviewComment
// tables. Only the token hash is stored. The plain token is shown once,
// when the link is made (see share-link.ts).

import type { ShareLinkStore } from "./share-link.ts";
import type { ReviewComment, ShareLink } from "./types.ts";

export interface PrismaShareLinkClient {
  shareLink: {
    upsert(args: { where: Record<string, unknown>; create: Record<string, unknown>; update: Record<string, unknown> }): Promise<Record<string, unknown>>;
    findUnique(args: { where: Record<string, unknown> }): Promise<Record<string, unknown> | null>;
    findMany(args: { where: Record<string, unknown> }): Promise<Record<string, unknown>[]>;
  };
  reviewComment: {
    create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
    findMany(args: { where: Record<string, unknown>; orderBy?: Record<string, unknown> }): Promise<Record<string, unknown>[]>;
  };
}

const iso = (value: unknown): string | null => (value ? new Date(String(value)).toISOString() : null);

function toLink(row: Record<string, unknown>): ShareLink {
  return {
    id: String(row["id"]),
    listingPackId: String(row["listing_pack_id"]),
    userId: String(row["user_id"]),
    tokenHash: String(row["token_hash"]),
    purpose: String(row["purpose"]) as ShareLink["purpose"],
    isActive: Boolean(row["is_active"]),
    expiresAt: iso(row["expires_at"]),
    viewCount: Number(row["view_count"] ?? 0),
    createdAt: iso(row["created_at"]) ?? new Date().toISOString(),
    deactivatedAt: iso(row["deactivated_at"]),
  };
}

export class PrismaShareLinkStore implements ShareLinkStore {
  private client: PrismaShareLinkClient;

  constructor(client: PrismaShareLinkClient) {
    this.client = client;
  }

  async save(link: ShareLink): Promise<void> {
    const fields = {
      is_active: link.isActive,
      expires_at: link.expiresAt ? new Date(link.expiresAt) : null,
      view_count: link.viewCount,
      deactivated_at: link.deactivatedAt ? new Date(link.deactivatedAt) : null,
    };
    await this.client.shareLink.upsert({
      where: { token_hash: link.tokenHash },
      create: {
        id: link.id,
        listing_pack_id: link.listingPackId,
        user_id: link.userId,
        token_hash: link.tokenHash,
        purpose: link.purpose,
        created_at: new Date(link.createdAt),
        ...fields,
      },
      update: fields,
    });
  }

  async findByHash(tokenHash: string): Promise<ShareLink | null> {
    const row = await this.client.shareLink.findUnique({ where: { token_hash: tokenHash } });
    return row ? toLink(row) : null;
  }

  async listForPack(listingPackId: string): Promise<ShareLink[]> {
    return (await this.client.shareLink.findMany({ where: { listing_pack_id: listingPackId } })).map(toLink);
  }

  async saveComment(comment: ReviewComment): Promise<void> {
    await this.client.reviewComment.create({
      data: {
        id: comment.id,
        share_link_id: comment.shareLinkId,
        listing_pack_id: comment.listingPackId,
        author_label: comment.authorLabel,
        text: comment.text,
        created_at: new Date(comment.createdAt),
      },
    });
  }

  async listComments(listingPackId: string): Promise<ReviewComment[]> {
    const rows = await this.client.reviewComment.findMany({ where: { listing_pack_id: listingPackId }, orderBy: { created_at: "asc" } });
    return rows.map((row) => ({
      id: String(row["id"]),
      shareLinkId: String(row["share_link_id"]),
      listingPackId: String(row["listing_pack_id"]),
      authorLabel: String(row["author_label"]),
      text: String(row["text"]),
      createdAt: iso(row["created_at"]) ?? new Date().toISOString(),
    }));
  }
}
