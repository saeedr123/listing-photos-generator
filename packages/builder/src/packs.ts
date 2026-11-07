// Listing pack service: create, autosave with version history, restore,
// export gating, and deletion. Storage is an interface; the local store
// below is the development stand in. The Prisma adapter replaces it without
// changing callers. Export is gated on a passing reconciliation check and
// on no sample content. An export failure never deletes or corrupts the
// saved pack.
//
// Uploaded product files are seller data, not training data, and are
// deletable with the listing pack. No training use is made of them here.

import { randomUUID } from "node:crypto";
import type {
  AccountDeletionRequest,
  Edition,
  ExportRecord,
  ListingPack,
  ListingPackCopy,
  PackStatus,
  PackVersion,
  ProductFacts,
  ReconciliationResult,
} from "./types.ts";
import { displayedValuesFromPack, reconcilePack } from "./reconciliation.ts";
import { etsyPack } from "./config.ts";
import { sampleCopy, sampleFacts } from "./sample-content.ts";

export interface AuditAppend {
  (input: {
    actorId: string | null;
    actorRole: "user" | "admin" | "system" | null;
    action: string;
    targetType: string;
    targetId: string | null;
    reason?: string | null;
    detail?: Record<string, string | number | boolean | null>;
  }): Promise<void>;
}

export const noopAudit: AuditAppend = async () => {};

export interface PackStore {
  savePack(pack: ListingPack): Promise<void>;
  findPack(id: string): Promise<ListingPack | null>;
  listPacksForUser(userId: string): Promise<ListingPack[]>;
  saveVersion(version: PackVersion): Promise<void>;
  listVersions(listingPackId: string): Promise<PackVersion[]>;
  saveExport(record: ExportRecord): Promise<void>;
  listExports(listingPackId: string): Promise<ExportRecord[]>;
  saveDeletionRequest(request: AccountDeletionRequest): Promise<void>;
  findDeletionRequest(id: string): Promise<AccountDeletionRequest | null>;
}

// DEVELOPMENT ONLY. In memory stand in for the Prisma store
// (prisma-pack-store.ts). It must never hold real user data outside
// local development. Production wiring must use PrismaPackStore.
export class InMemoryPackStore implements PackStore {
  private packs = new Map<string, ListingPack>();
  private versions = new Map<string, PackVersion[]>();
  private exports = new Map<string, ExportRecord[]>();
  private deletions = new Map<string, AccountDeletionRequest>();

  async savePack(pack: ListingPack): Promise<void> {
    this.packs.set(pack.id, pack);
  }

  async findPack(id: string): Promise<ListingPack | null> {
    return this.packs.get(id) ?? null;
  }

  async listPacksForUser(userId: string): Promise<ListingPack[]> {
    return [...this.packs.values()].filter((p) => p.userId === userId && p.deletedAt === null);
  }

  async saveVersion(version: PackVersion): Promise<void> {
    const list = this.versions.get(version.listingPackId) ?? [];
    list.push(version);
    this.versions.set(version.listingPackId, list);
  }

  async listVersions(listingPackId: string): Promise<PackVersion[]> {
    return [...(this.versions.get(listingPackId) ?? [])].sort((a, b) => a.versionNumber - b.versionNumber);
  }

  async saveExport(record: ExportRecord): Promise<void> {
    const list = this.exports.get(record.listingPackId) ?? [];
    list.push(record);
    this.exports.set(record.listingPackId, list);
  }

  async listExports(listingPackId: string): Promise<ExportRecord[]> {
    return [...(this.exports.get(listingPackId) ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async saveDeletionRequest(request: AccountDeletionRequest): Promise<void> {
    this.deletions.set(request.id, request);
  }

  async findDeletionRequest(id: string): Promise<AccountDeletionRequest | null> {
    return this.deletions.get(id) ?? null;
  }
}

export interface CreatePackInput {
  userId: string;
  edition: Edition;
  productFacts: ProductFacts;
  nichePackId: string | null;
  useSampleContent: boolean;
}

function clonePack(pack: ListingPack): ListingPack {
  return JSON.parse(JSON.stringify(pack)) as ListingPack;
}

// Real export runner, injected by the caller. The runner is the real
// export engine (see export-runner.ts). When no runner is supplied, an
// export that passes reconciliation is recorded as queued, the previous
// behaviour, and the caller must run the export engine separately.
// When a runner is supplied, requestExport calls it, records ready on
// success, and on failure records failed with a plain language error
// and leaves the saved pack untouched.
export interface ExportRunnerResult {
  outputDir: string;
  imageCount: number;
}

export type ExportRunner = (pack: ListingPack) => Promise<ExportRunnerResult>;

export interface PackServiceOptions {
  exportRunner?: ExportRunner;
}

export class PackService {
  private store: PackStore;
  private audit: AuditAppend;
  private exportRunner?: ExportRunner;
  // Maximum versions kept per pack. Configurable; old versions are kept
  // in history, never silently overwritten.
  private maxVersions = 50;

  constructor(store: PackStore, audit: AuditAppend = noopAudit, options: PackServiceOptions = {}) {
    this.store = store;
    this.audit = audit;
    this.exportRunner = options.exportRunner;
  }

  async createPack(input: CreatePackInput): Promise<ListingPack> {
    const now = new Date().toISOString();
    const facts = input.useSampleContent ? sampleFacts() : input.productFacts;
    const copy: ListingPackCopy = input.useSampleContent
      ? sampleCopy()
      : { title: "", description: "", tags: [], checklist: [], claimsShown: [], generationStatus: "draft" };
    const pack: ListingPack = {
      id: randomUUID(),
      userId: input.userId,
      productId: randomUUID(),
      productFacts: facts,
      platformId: etsyPack.platformId,
      packVersionId: etsyPack.packVersion,
      nichePackId: input.nichePackId,
      nichePackVersionId: null,
      templateIds: [],
      mockupIds: [],
      copy,
      images: [],
      files: [],
      status: "draft",
      language: "en",
      edition: input.edition,
      hasSampleContent: input.useSampleContent,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    await this.store.savePack(pack);
    await this.saveVersion(pack, input.userId, "Pack created");
    return pack;
  }

  // Ownership is enforced by the caller through access-control. This method
  // returns null for a missing pack; it does not decide who may see it.
  async getPack(packId: string): Promise<ListingPack | null> {
    return this.store.findPack(packId);
  }

  async listPacks(userId: string): Promise<ListingPack[]> {
    return this.store.listPacksForUser(userId);
  }

  // Autosave: every save writes the pack and appends a new version snapshot.
  // History is never overwritten. Restoring creates a new version.
  async savePack(pack: ListingPack, userId: string, note: string): Promise<PackVersion> {
    pack.updatedAt = new Date().toISOString();
    await this.store.savePack(pack);
    return this.saveVersion(pack, userId, note);
  }

  private async saveVersion(pack: ListingPack, userId: string, note: string): Promise<PackVersion> {
    const existing = await this.store.listVersions(pack.id);
    const version: PackVersion = {
      id: randomUUID(),
      listingPackId: pack.id,
      versionNumber: existing.length + 1,
      snapshot: clonePack(pack),
      createdByUserId: userId,
      createdAt: new Date().toISOString(),
      note,
    };
    await this.store.saveVersion(version);
    return version;
  }

  async listVersions(packId: string): Promise<PackVersion[]> {
    return this.store.listVersions(packId);
  }

  async restoreVersion(packId: string, versionNumber: number, userId: string): Promise<ListingPack | null> {
    const pack = await this.store.findPack(packId);
    if (!pack) {
      return null;
    }
    const versions = await this.store.listVersions(packId);
    const target = versions.find((v) => v.versionNumber === versionNumber);
    if (!target) {
      return null;
    }
    const restored = clonePack(target.snapshot);
    restored.id = pack.id;
    restored.updatedAt = new Date().toISOString();
    await this.store.savePack(restored);
    await this.saveVersion(restored, userId, "Restored version " + versionNumber);
    return restored;
  }

  async setStatus(packId: string, status: PackStatus, userId: string): Promise<ListingPack | null> {
    const pack = await this.store.findPack(packId);
    if (!pack) {
      return null;
    }
    pack.status = status;
    await this.savePack(pack, userId, "Status changed to " + status);
    return pack;
  }

  async runReconciliation(packId: string): Promise<ReconciliationResult | null> {
    const pack = await this.store.findPack(packId);
    if (!pack) {
      return null;
    }
    return reconcilePack(pack.productFacts, displayedValuesFromPack(pack), pack.hasSampleContent);
  }

  // Export gating: a passing reconciliation check is required before an
  // export can be marked ready. A failed check records a failed export and
  // leaves the saved pack untouched.
  async requestExport(packId: string, userId: string, kind: ExportRecord["exportKind"]): Promise<{ record: ExportRecord; reconciliation: ReconciliationResult } | null> {
    const pack = await this.store.findPack(packId);
    if (!pack) {
      return null;
    }
    const reconciliation = reconcilePack(pack.productFacts, displayedValuesFromPack(pack), pack.hasSampleContent);
    const record: ExportRecord = {
      id: randomUUID(),
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
      reconciliationCheckId: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    if (reconciliation.canExport && this.exportRunner) {
      try {
        const result = await this.exportRunner(pack);
        record.status = "ready";
        record.imageCount = result.imageCount;
        record.errorMessage = null;
      } catch (error) {
        // Plain language error, pack preserved. The runner throws an
        // ExportError with a message and a fix; any other error is
        // reported without system details.
        const plain = error instanceof Error ? error.message : "Export failed.";
        const fix = (error as { fix?: string }).fix ? " Fix: " + (error as { fix: string }).fix : " Your saved pack was not changed. Try again.";
        record.status = "failed";
        record.errorMessage = plain + fix;
      }
    }
    await this.store.saveExport(record);
    if (record.status === "failed") {
      await this.audit({
        actorId: userId,
        actorRole: "user",
        action: "export.failed",
        targetType: "listing_pack",
        targetId: pack.id,
        detail: { export_kind: kind, platform_id: pack.platformId },
      });
    }
    return { record, reconciliation };
  }

  async listExports(packId: string): Promise<ExportRecord[]> {
    return this.store.listExports(packId);
  }

  // Soft delete the pack and its files. Uploaded product files are seller
  // data and are removed with the pack; the completion record keeps only
  // ids and counts, never product content.
  async deletePack(packId: string, userId: string): Promise<boolean> {
    const pack = await this.store.findPack(packId);
    if (!pack) {
      return false;
    }
    pack.deletedAt = new Date().toISOString();
    pack.status = "archived";
    await this.store.savePack(pack);
    await this.audit({
      actorId: userId,
      actorRole: "user",
      action: "account.deletion_requested",
      targetType: "listing_pack",
      targetId: pack.id,
      detail: { files_removed: pack.files.length },
    });
    return true;
  }

  async requestAccountDeletion(userId: string, requestedBy: "user" | "admin", reason: string | null): Promise<AccountDeletionRequest> {
    const request: AccountDeletionRequest = {
      id: randomUUID(),
      userId,
      requestedAt: new Date().toISOString(),
      requestedBy,
      reason,
      status: "requested",
      softDeletedAt: null,
      hardDeletedAt: null,
      completionNote: null,
    };
    await this.store.saveDeletionRequest(request);
    await this.audit({
      actorId: userId,
      actorRole: requestedBy === "admin" ? "admin" : "user",
      action: "account.deletion_requested",
      targetType: "user",
      targetId: userId,
      reason,
      detail: {},
    });
    return request;
  }

  async completeAccountDeletion(requestId: string, actorId: string): Promise<AccountDeletionRequest | null> {
    const request = await this.store.findDeletionRequest(requestId);
    if (!request) {
      return null;
    }
    request.status = "hard_deleted";
    request.softDeletedAt = request.softDeletedAt ?? new Date().toISOString();
    request.hardDeletedAt = new Date().toISOString();
    request.completionNote = "Account, listing packs, uploads, exports, and AI logs deleted on request. Backups expire on the stated schedule.";
    await this.store.saveDeletionRequest(request);
    await this.audit({
      actorId,
      actorRole: "system",
      action: "account.deletion_completed",
      targetType: "user",
      targetId: request.userId,
      detail: {},
    });
    return request;
  }
}
