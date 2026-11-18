// Reference data a fresh database needs before any seller can save a
// pack: the Etsy platform, its platform pack, and the pack version.
// Every listing pack, copy row, reconciliation check and export points
// at these rows. Values come from the platform pack config passed in
// (config/platform-packs/etsy.v1.json), never from this file.
//
// Idempotent: running it again finds the existing rows and returns
// their ids. It never edits a published pack version. A changed pack
// definition belongs in a new version through admin, not in a reseed.

import type { PlatformResolution } from "./db-adapter.ts";

export interface ReferenceSeedClient {
  platform: {
    upsert(args: { where: Record<string, unknown>; create: Record<string, unknown>; update: Record<string, unknown> }): Promise<Record<string, unknown>>;
  };
  platformPack: {
    upsert(args: { where: Record<string, unknown>; create: Record<string, unknown>; update: Record<string, unknown> }): Promise<Record<string, unknown>>;
  };
  platformPackVersion: {
    findFirst(args: { where: Record<string, unknown> }): Promise<Record<string, unknown> | null>;
    create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
  };
}

/** The slice of a platform pack config file this seed reads. */
export interface PlatformPackDefinition {
  platform_id: string;
  slug: string;
  name: string;
  version: number;
  [key: string]: unknown;
}

export interface ReferenceSeedOptions {
  definition: PlatformPackDefinition;
  /** Display name of the platform, from config. */
  platformName: string;
  /** The admin user recorded as creator of the pack version. */
  createdByUserId: string;
}

export async function seedReferenceData(client: ReferenceSeedClient, options: ReferenceSeedOptions): Promise<PlatformResolution> {
  const { definition } = options;
  if (!definition.platform_id || !definition.slug || !Number.isInteger(definition.version)) {
    throw new Error("The platform pack definition needs platform_id, slug and a whole number version.");
  }
  const platform = await client.platform.upsert({
    where: { slug: definition.platform_id },
    create: { slug: definition.platform_id, name: options.platformName, status: "active", is_digital_supported: true },
    update: {},
  });
  const platformId = String(platform["id"]);
  const pack = await client.platformPack.upsert({
    where: { platform_id_slug: { platform_id: platformId, slug: definition.slug } },
    create: { platform_id: platformId, slug: definition.slug, name: definition.name, is_active: true },
    update: {},
  });
  const packId = String(pack["id"]);
  let version = await client.platformPackVersion.findFirst({
    where: { platform_pack_id: packId, version_number: definition.version },
  });
  if (!version) {
    version = await client.platformPackVersion.create({
      data: {
        platform_pack_id: packId,
        platform_id: platformId,
        version_number: definition.version,
        definition_json: definition,
        status: "published",
        published_at: new Date(),
        published_by_user_id: options.createdByUserId,
        created_by_user_id: options.createdByUserId,
      },
    });
  }
  return {
    platformId,
    packVersionId: String(version["id"]),
    nichePackId: null,
    nichePackVersionId: null,
    // Template rows are not seeded yet, so no template id is resolved.
    // A null template_id is allowed on ListingPack; the full template
    // list lives in the pack version snapshot.
    templateIdBySlug: () => null,
  };
}
