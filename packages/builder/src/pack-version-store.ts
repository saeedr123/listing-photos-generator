// Pack level version store, backed by the Prisma PackVersion table
// (prisma/schema.prisma). A PackVersion snapshots a whole ListingPack:
// product facts, copy, images, template ids, and mockup ids.
//
// This table is separate from ListingPackCopyVersion, which snapshots one
// ListingPackCopy row only. The two tables never share rows, and a version
// number in one table means nothing in the other. Nothing in this file
// reads or writes ListingPackCopyVersion.
//
// The client is typed as a minimal delegate interface, so this package
// compiles and tests without a generated client or a live database. A
// test double implements the same delegate methods with in memory maps;
// see packages/builder/src/__tests__/pack-version.test.ts.

import type { ListingPack, PackVersion } from "./types.ts";

// Minimal delegate shape of a real PrismaClient for the PackVersion model.
// A real PrismaClient satisfies this interface structurally.
export interface PackVersionClient {
  packVersion: {
    create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
    findMany(args: { where: Record<string, unknown>; orderBy?: Record<string, unknown> }): Promise<Record<string, unknown>[]>;
    findUnique(args: { where: Record<string, unknown> }): Promise<Record<string, unknown> | null>;
  };
}

function rowToPackVersion(row: Record<string, unknown>): PackVersion {
  return {
    id: String(row["id"] ?? ""),
    listingPackId: String(row["listing_pack_id"]),
    versionNumber: Number(row["version_number"]),
    snapshot: row["snapshot_json"] as ListingPack,
    createdByUserId: String(row["created_by_user_id"]),
    createdAt: new Date(String(row["created_at"] ?? new Date().toISOString())).toISOString(),
    note: row["change_note"] ? String(row["change_note"]) : "",
  };
}

function packVersionToRowData(version: PackVersion): Record<string, unknown> {
  return {
    listing_pack_id: version.listingPackId,
    version_number: version.versionNumber,
    snapshot_json: version.snapshot,
    change_note: version.note === "" ? null : version.note,
    created_by_user_id: version.createdByUserId,
  };
}

export class PrismaPackVersionStore {
  private client: PackVersionClient;

  constructor(client: PackVersionClient) {
    this.client = client;
  }

  async createPackVersion(version: PackVersion): Promise<void> {
    await this.client.packVersion.create({ data: packVersionToRowData(version) });
  }

  async listPackVersions(listingPackId: string): Promise<PackVersion[]> {
    const rows = await this.client.packVersion.findMany({
      where: { listing_pack_id: listingPackId },
      orderBy: { version_number: "asc" },
    });
    return rows.map(rowToPackVersion);
  }

  async getPackVersion(listingPackId: string, versionNumber: number): Promise<PackVersion | null> {
    const row = await this.client.packVersion.findUnique({
      where: { listing_pack_id_version_number: { listing_pack_id: listingPackId, version_number: versionNumber } },
    });
    return row ? rowToPackVersion(row) : null;
  }

  async latestPackVersion(listingPackId: string): Promise<PackVersion | null> {
    const versions = await this.listPackVersions(listingPackId);
    return versions.length === 0 ? null : versions[versions.length - 1];
  }
}
