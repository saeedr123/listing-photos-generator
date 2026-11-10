// Prisma backed PackStore. Implements the PackStore interface against
// the Prisma ListingPack, Product, ProductVerifiedFact,
// ListingPackCopy, PackVersion, Export, and
// AccountDeletionRequest tables (prisma/schema.prisma), replacing the
// development in memory store for any real user data. No live database
// is connected by this file itself: the caller supplies a PrismaClient
// (or a test double with the same delegates) plus the UUID resolution
// for the platform and pack version slugs. The client is typed as a
// minimal delegate interface, so this package compiles and tests
// without a generated client or a live database.
//
// Pack level versions live in the PackVersion table, through
// PrismaPackVersionStore (pack-version-store.ts). Copy level versions
// live in ListingPackCopyVersion and are a separate concern; this store
// never writes a pack snapshot into the copy version table.
//
// The InMemoryPackStore in packs.ts remains DEVELOPMENT ONLY. It must
// never hold real user data outside local development. Production
// wiring must construct PackService with PrismaPackStore.
//
// Mapping between the builder working shape and the flat database rows
// lives in db-adapter.ts and is the only mapping used here. Dates are
// converted at this boundary: ISO strings in the builder, Date objects
// in Prisma. Product facts are written as ProductVerifiedFact rows; a
// null fact writes no row, never an invented value. Copy is written to
// ListingPackCopy with copy_prompt_version_id null until an AI prompt
// version is recorded by the AI worker; a null there means no prompt
// version was used, never a guessed prompt.

import type { PackStore } from "./packs.ts";
import type { AccountDeletionRequest, ExportRecord, ListingPack, PackVersion } from "./types.ts";
import { builderPackToDbRows, dbRowsToBuilderPack } from "./db-adapter.ts";
import type { PlatformResolution } from "./db-adapter.ts";
import { PrismaPackVersionStore } from "./pack-version-store.ts";

export interface PrismaPackClient {
  listingPack: {
    upsert(args: { where: Record<string, unknown>; create: Record<string, unknown>; update: Record<string, unknown> }): Promise<Record<string, unknown>>;
    findUnique(args: { where: Record<string, unknown> }): Promise<Record<string, unknown> | null>;
    findMany(args: { where: Record<string, unknown> }): Promise<Record<string, unknown>[]>;
  };
  product: {
    upsert(args: { where: Record<string, unknown>; create: Record<string, unknown>; update: Record<string, unknown> }): Promise<Record<string, unknown>>;
    findUnique(args: { where: Record<string, unknown> }): Promise<Record<string, unknown> | null>;
  };
  productVerifiedFact: {
    deleteMany(args: { where: Record<string, unknown> }): Promise<{ count: number }>;
    create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
    findMany(args: { where: Record<string, unknown> }): Promise<Record<string, unknown>[]>;
  };
  listingPackCopy: {
    upsert(args: { where: Record<string, unknown>; create: Record<string, unknown>; update: Record<string, unknown> }): Promise<Record<string, unknown>>;
    findUnique(args: { where: Record<string, unknown> }): Promise<Record<string, unknown> | null>;
  };
  packVersion: {
    create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
    findMany(args: { where: Record<string, unknown>; orderBy?: Record<string, unknown> }): Promise<Record<string, unknown>[]>;
    findUnique(args: { where: Record<string, unknown> }): Promise<Record<string, unknown> | null>;
  };
  export: {
    create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
    findMany(args: { where: Record<string, unknown> }): Promise<Record<string, unknown>[]>;
  };
  accountDeletionRequest: {
    create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
    findUnique(args: { where: Record<string, unknown> }): Promise<Record<string, unknown> | null>;
    update(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<Record<string, unknown>>;
  };
}

export interface PrismaPackStoreOptions {
  resolution: PlatformResolution;
  // Slug values recorded back on the working pack when reading rows.
  platformSlug?: string;
  packVersionSlug?: string;
}

function toDate(value: string | null): Date | null {
  return value ? new Date(value) : null;
}

export class PrismaPackStore implements PackStore {
  private client: PrismaPackClient;
  private packVersions: PrismaPackVersionStore;
  private resolution: PlatformResolution;
  private platformSlug: string;
  private packVersionSlug: string;

  constructor(client: PrismaPackClient, options: PrismaPackStoreOptions) {
    this.client = client;
    this.packVersions = new PrismaPackVersionStore(client);
    this.resolution = options.resolution;
    this.platformSlug = options.platformSlug ?? "etsy";
    this.packVersionSlug = options.packVersionSlug ?? "etsy_digital_v1";
  }

  async savePack(pack: ListingPack): Promise<void> {
    const rows = builderPackToDbRows(pack, this.resolution);
    const lp = rows.listingPack;
    await this.client.product.upsert({
      where: { id: rows.product.id },
      create: { ...rows.product, created_at: new Date(rows.product.created_at), updated_at: new Date(rows.product.updated_at), deleted_at: toDate(rows.product.deleted_at) },
      update: { name: rows.product.name, format: rows.product.format, price_amount_minor: rows.product.price_amount_minor, price_currency: rows.product.price_currency, updated_at: new Date(), deleted_at: toDate(rows.product.deleted_at) },
    });
    await this.client.listingPack.upsert({
      where: { id: lp.id },
      create: { ...lp, created_at: new Date(lp.created_at), updated_at: new Date(lp.updated_at), deleted_at: toDate(lp.deleted_at) },
      update: { status: lp.status, template_id: lp.template_id, niche_pack_id: lp.niche_pack_id, niche_pack_version_id: lp.niche_pack_version_id, updated_at: new Date(), deleted_at: toDate(lp.deleted_at) },
    });
    await this.client.productVerifiedFact.deleteMany({ where: { product_id: pack.productId } });
    for (const fact of rows.facts) {
      await this.client.productVerifiedFact.create({ data: { product_id: fact.product_id, fact_key: fact.fact_key, fact_value_text: fact.fact_value_text, fact_value_number: fact.fact_value_number, verified_by_user_id: fact.verified_by_user_id, verification_note: fact.verification_note, verified_at: new Date() } });
    }
    await this.client.listingPackCopy.upsert({
      where: { listing_pack_id: pack.id },
      create: { ...rows.copy, title_text: rows.copy.title_text, description_text: rows.copy.description_text, tags_text: rows.copy.tags_text, checklist_text: rows.copy.checklist_text },
      update: { title_text: rows.copy.title_text, description_text: rows.copy.description_text, tags_text: rows.copy.tags_text, checklist_text: rows.copy.checklist_text, generation_status: rows.copy.generation_status },
    });
  }

  async findPack(id: string): Promise<ListingPack | null> {
    const row = await this.client.listingPack.findUnique({ where: { id } });
    if (!row) return null;
    return this.readPack(row);
  }

  async listPacksForUser(userId: string): Promise<ListingPack[]> {
    const rows = await this.client.listingPack.findMany({ where: { user_id: userId, deleted_at: null } });
    const packs: ListingPack[] = [];
    for (const row of rows) {
      const pack = await this.readPack(row);
      if (pack) packs.push(pack);
    }
    return packs;
  }

  private async readPack(row: Record<string, unknown>): Promise<ListingPack | null> {
    const productRow = await this.client.product.findUnique({ where: { id: row["product_id"] } });
    if (!productRow) return null;
    const facts = (await this.client.productVerifiedFact.findMany({ where: { product_id: row["product_id"] } })).map((f) => ({
      product_id: String(f["product_id"]),
      fact_key: String(f["fact_key"]),
      fact_value_text: String(f["fact_value_text"]),
      fact_value_number: f["fact_value_number"] === null ? null : Number(f["fact_value_number"]),
      verified_by_user_id: String(f["verified_by_user_id"]),
      verification_note: f["verification_note"] ? String(f["verification_note"]) : null,
    }));
    const copyRow = await this.client.listingPackCopy.findUnique({ where: { listing_pack_id: row["id"] } });
    // The full template and mockup id lists live in the latest version
    // snapshot (extra.templateIds / extra.mockupIds). Until a version
    // snapshot is read, only the single template_id on the row is known.
    const versions = await this.listVersions(String(row["id"]));
    const latest = versions[versions.length - 1];
    const extraTemplateIds = (latest?.snapshot?.templateIds ?? []) as string[];
    const extraMockupIds = (latest?.snapshot?.mockupIds ?? []) as string[];
    return dbRowsToBuilderPack({
      listingPack: {
        id: String(row["id"]), user_id: String(row["user_id"]), product_id: String(row["product_id"]),
        platform_id: String(row["platform_id"]), pack_version_id: String(row["pack_version_id"]),
        niche_pack_id: row["niche_pack_id"] ? String(row["niche_pack_id"]) : null,
        niche_pack_version_id: row["niche_pack_version_id"] ? String(row["niche_pack_version_id"]) : null,
        template_id: row["template_id"] ? String(row["template_id"]) : null,
        status: String(row["status"]), language: String(row["language"]), edition: String(row["edition"]),
        created_at: new Date(String(row["created_at"])).toISOString(), updated_at: new Date(String(row["updated_at"])).toISOString(),
        deleted_at: row["deleted_at"] ? new Date(String(row["deleted_at"])).toISOString() : null,
      },
      product: {
        id: String(productRow["id"]), user_id: String(productRow["user_id"]), edition: String(productRow["edition"]),
        name: String(productRow["name"]), product_type: String(productRow["product_type"]), format: String(productRow["format"]),
        price_amount_minor: productRow["price_amount_minor"] === null ? null : Number(productRow["price_amount_minor"]),
        price_currency: productRow["price_currency"] ? String(productRow["price_currency"]) : null,
        description_seller: productRow["description_seller"] ? String(productRow["description_seller"]) : null,
        status: String(productRow["status"]), created_at: new Date(String(productRow["created_at"])).toISOString(),
        updated_at: new Date(String(productRow["updated_at"])).toISOString(),
        deleted_at: productRow["deleted_at"] ? new Date(String(productRow["deleted_at"])).toISOString() : null,
      },
      facts,
      copy: copyRow ? {
        listing_pack_id: String(copyRow["listing_pack_id"]), platform_id: String(copyRow["platform_id"]), pack_version_id: String(copyRow["pack_version_id"]),
        copy_prompt_version_id: copyRow["copy_prompt_version_id"] ? String(copyRow["copy_prompt_version_id"]) : null,
        title_text: copyRow["title_text"] ? String(copyRow["title_text"]) : null,
        description_text: copyRow["description_text"] ? String(copyRow["description_text"]) : null,
        tags_text: Array.isArray(copyRow["tags_text"]) ? (copyRow["tags_text"] as string[]) : [],
        checklist_text: Array.isArray(copyRow["checklist_text"]) ? (copyRow["checklist_text"] as string[]) : [],
        generation_status: String(copyRow["generation_status"]),
      } : null,
      images: [],
      files: [],
      extraTemplateIds,
      extraMockupIds,
      hasSampleContent: Boolean(latest?.snapshot?.hasSampleContent ?? false),
      platformSlug: this.platformSlug,
      packVersionSlug: this.packVersionSlug,
    });
  }

  async saveVersion(version: PackVersion): Promise<void> {
    // Pack level snapshot, written to the PackVersion table only. Never
    // to ListingPackCopyVersion, which snapshots one copy row only.
    await this.packVersions.createPackVersion(version);
  }

  async listVersions(listingPackId: string): Promise<PackVersion[]> {
    return this.packVersions.listPackVersions(listingPackId);
  }

  async saveExport(record: ExportRecord): Promise<void> {
    await this.client.export.create({ data: { listing_pack_id: record.listingPackId, user_id: record.userId, platform_id: this.resolution.platformId, pack_version_id: this.resolution.packVersionId, export_kind: record.exportKind, file_format: record.fileFormat, shortest_side_px: record.shortestSidePx, image_count: record.imageCount, status: record.status, error_message: record.errorMessage, reconciliation_check_id: record.reconciliationCheckId } });
  }

  async listExports(listingPackId: string): Promise<ExportRecord[]> {
    const rows = await this.client.export.findMany({ where: { listing_pack_id: listingPackId } });
    return rows.map((r) => ({
      id: String(r["id"] ?? ""), listingPackId: String(r["listing_pack_id"]), userId: String(r["user_id"]),
      platformId: this.platformSlug, packVersionId: this.packVersionSlug,
      exportKind: String(r["export_kind"]) as ExportRecord["exportKind"], fileFormat: String(r["file_format"]),
      shortestSidePx: Number(r["shortest_side_px"]), imageCount: r["image_count"] === null ? 0 : Number(r["image_count"]),
      status: String(r["status"]) as ExportRecord["status"], errorMessage: r["error_message"] ? String(r["error_message"]) : null,
      reconciliationCheckId: r["reconciliation_check_id"] ? String(r["reconciliation_check_id"]) : null,
      createdAt: new Date(String(r["created_at"] ?? new Date().toISOString())).toISOString(),
    }));
  }

  async saveDeletionRequest(request: AccountDeletionRequest): Promise<void> {
    const existing = await this.client.accountDeletionRequest.findUnique({ where: { id: request.id } });
    if (existing) {
      await this.client.accountDeletionRequest.update({ where: { id: request.id }, data: { status: request.status, soft_deleted_at: toDate(request.softDeletedAt), hard_deleted_at: toDate(request.hardDeletedAt) } });
    } else {
      await this.client.accountDeletionRequest.create({ data: { id: request.id, user_id: request.userId, requested_at: new Date(request.requestedAt), requested_by: request.requestedBy, reason: request.reason, status: request.status } });
    }
  }

  async findDeletionRequest(id: string): Promise<AccountDeletionRequest | null> {
    const row = await this.client.accountDeletionRequest.findUnique({ where: { id } });
    if (!row) return null;
    return {
      id: String(row["id"]), userId: String(row["user_id"]), requestedAt: new Date(String(row["requested_at"])).toISOString(),
      requestedBy: String(row["requested_by"]) as AccountDeletionRequest["requestedBy"], reason: row["reason"] ? String(row["reason"]) : null,
      status: String(row["status"]) as AccountDeletionRequest["status"],
      softDeletedAt: row["soft_deleted_at"] ? new Date(String(row["soft_deleted_at"])).toISOString() : null,
      hardDeletedAt: row["hard_deleted_at"] ? new Date(String(row["hard_deleted_at"])).toISOString() : null,
      completionNote: null,
    };
  }
}
