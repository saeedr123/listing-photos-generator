// Mapping adapter between the builder working pack shape and the shared
// flat database row shape (packages/shared and prisma/schema.prisma).
//
// The two shapes are deliberately NOT unified. Reason, documented here:
// the builder working shape is an in memory editing model (product facts,
// copy, images, and files inline, so the builder, reconciliation, and live
// preview can read one object), while the shared shape is the flat,
// platform neutral database model (one row per table, platform_id plus
// pack_version_id, facts as separate ProductVerifiedFact rows, copy as a
// ListingPackCopy row, versions as snapshots). Unifying them would force
// either the editor to query many tables on every keystroke or the
// database to store nested editing state. This adapter is the single place
// where the two shapes meet, so either side can change without the other
// changing silently.
//
// Known mapping notes, all preserved by round trip tests:
// - platform_id and pack_version_id in the builder are plain strings
//   ("etsy", "etsy_digital_v1"). In the database they are UUID foreign
//   keys to Platform and PlatformPackVersion. The caller supplies the UUID
//   resolution (platformIdBySlug, packVersionIdBySlug); the adapter never
//   invents a UUID and never hard codes one.
// - The shared ListingPack row holds one template_id only. The builder
//   holds templateIds as a list. The first id maps to template_id; the
//   full list is preserved in the snapshot JSON carried by
//   extra.templateIds, which the caller stores in ListingPackCopyVersion
//   snapshot_json (or an equivalent version snapshot), never dropped.
// - Product facts map to ProductVerifiedFact rows: tab_count, price (list
//   and launch as separate claim style facts is avoided; price list and
//   launch are stored as fact_value_number on two rows, tab_count as one
//   row, format as one row, and one row per claim). A fact that is null
//   in the builder produces no row, never an invented value.
// - Mockup ids, images, and files have no columns on ListingPack; they
//   map to ListingPackImage rows and ProductSourceFile rows, which the
//   caller writes. This adapter returns them as plain row objects so the
//   Prisma store can write them without knowing builder internals.
// - Dates are ISO strings in the builder and Date objects in the Prisma
//   layer. This adapter keeps ISO strings; the Prisma store converts
//   them at the boundary (see prisma-pack-store.ts).

import type { ListingPack, PackImage, ProductFacts, UploadedFileMeta } from "./types.ts";

export interface PlatformResolution {
  platformId: string;
  packVersionId: string;
  nichePackId: string | null;
  nichePackVersionId: string | null;
  templateIdBySlug: (slug: string) => string | null;
}

export interface ListingPackRow {
  id: string;
  user_id: string;
  product_id: string;
  platform_id: string;
  pack_version_id: string;
  niche_pack_id: string | null;
  niche_pack_version_id: string | null;
  template_id: string | null;
  status: string;
  language: string;
  edition: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProductRow {
  id: string;
  user_id: string;
  edition: string;
  name: string;
  product_type: string;
  format: string;
  price_amount_minor: number | null;
  price_currency: string | null;
  description_seller: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface VerifiedFactRow {
  product_id: string;
  fact_key: string;
  fact_value_text: string;
  fact_value_number: number | null;
  verified_by_user_id: string;
  verification_note: string | null;
}

export interface ListingPackCopyRow {
  listing_pack_id: string;
  platform_id: string;
  pack_version_id: string;
  copy_prompt_version_id: string | null;
  title_text: string | null;
  description_text: string | null;
  tags_text: string[];
  checklist_text: string[];
  generation_status: string;
}

export interface ListingPackImageRow {
  listing_pack_id: string;
  platform_id: string;
  pack_version_id: string;
  template_version_id: string | null;
  mockup_version_id: string | null;
  product_render_id: string | null;
  position: number;
  image_role: string;
  orientation: string | null;
  fit_warning: string | null;
  quality_gate_status: string;
  quality_gate_reason: string | null;
}

export interface DbPackRows {
  listingPack: ListingPackRow;
  product: ProductRow;
  facts: VerifiedFactRow[];
  copy: ListingPackCopyRow;
  images: ListingPackImageRow[];
  files: UploadedFileMeta[];
  extra: {
    templateIds: string[];
    mockupIds: string[];
    hasSampleContent: boolean;
    productId: string;
  };
}

export function builderPackToDbRows(pack: ListingPack, resolution: PlatformResolution): DbPackRows {
  const facts: VerifiedFactRow[] = [];
  const f: ProductFacts = pack.productFacts;
  if (f.tabCount !== null) {
    facts.push({ product_id: pack.productId, fact_key: "tab_count", fact_value_text: String(f.tabCount), fact_value_number: f.tabCount, verified_by_user_id: pack.userId, verification_note: f.verificationNote || null });
  }
  if (f.priceListMinor !== null) {
    facts.push({ product_id: pack.productId, fact_key: "price_list", fact_value_text: String(f.priceListMinor), fact_value_number: f.priceListMinor, verified_by_user_id: pack.userId, verification_note: f.verificationNote || null });
  }
  if (f.priceLaunchMinor !== null) {
    facts.push({ product_id: pack.productId, fact_key: "price_launch", fact_value_text: String(f.priceLaunchMinor), fact_value_number: f.priceLaunchMinor, verified_by_user_id: pack.userId, verification_note: f.verificationNote || null });
  }
  facts.push({ product_id: pack.productId, fact_key: "format", fact_value_text: f.format, fact_value_number: null, verified_by_user_id: pack.userId, verification_note: f.verificationNote || null });
  for (const claim of f.claims) {
    facts.push({ product_id: pack.productId, fact_key: "claim", fact_value_text: claim, fact_value_number: null, verified_by_user_id: pack.userId, verification_note: f.verificationNote || null });
  }
  const firstTemplateId = pack.templateIds.length > 0 ? (resolution.templateIdBySlug(pack.templateIds[0]) ?? pack.templateIds[0]) : null;
  return {
    listingPack: {
      id: pack.id,
      user_id: pack.userId,
      product_id: pack.productId,
      platform_id: resolution.platformId,
      pack_version_id: resolution.packVersionId,
      niche_pack_id: resolution.nichePackId,
      niche_pack_version_id: resolution.nichePackVersionId,
      template_id: firstTemplateId,
      status: pack.status,
      language: pack.language,
      edition: pack.edition,
      created_at: pack.createdAt,
      updated_at: pack.updatedAt,
      deleted_at: pack.deletedAt,
    },
    product: {
      id: pack.productId,
      user_id: pack.userId,
      edition: pack.edition,
      name: f.productName,
      product_type: "sheets_planner",
      format: f.format,
      price_amount_minor: f.priceListMinor,
      price_currency: f.currency,
      description_seller: null,
      status: "draft",
      created_at: pack.createdAt,
      updated_at: pack.updatedAt,
      deleted_at: pack.deletedAt,
    },
    facts,
    copy: {
      listing_pack_id: pack.id,
      platform_id: resolution.platformId,
      pack_version_id: resolution.packVersionId,
      copy_prompt_version_id: null,
      title_text: pack.copy.title || null,
      description_text: pack.copy.description || null,
      tags_text: pack.copy.tags,
      checklist_text: pack.copy.checklist,
      generation_status: pack.copy.generationStatus,
    },
    images: pack.images.map((img: PackImage): ListingPackImageRow => ({
      listing_pack_id: pack.id,
      platform_id: resolution.platformId,
      pack_version_id: resolution.packVersionId,
      template_version_id: img.templateVersionId,
      mockup_version_id: img.mockupVersionId,
      product_render_id: img.productRenderId,
      position: img.position,
      image_role: img.imageRole,
      orientation: img.orientation,
      fit_warning: img.fitWarning,
      quality_gate_status: img.qualityGateStatus,
      quality_gate_reason: img.qualityGateReason,
    })),
    files: pack.files,
    extra: { templateIds: pack.templateIds, mockupIds: pack.mockupIds, hasSampleContent: pack.hasSampleContent, productId: pack.productId },
  };
}

export interface DbPackInput {
  listingPack: ListingPackRow;
  product: ProductRow;
  facts: VerifiedFactRow[];
  copy: ListingPackCopyRow | null;
  images: ListingPackImageRow[];
  files: UploadedFileMeta[];
  extraTemplateIds: string[];
  extraMockupIds: string[];
  hasSampleContent: boolean;
  // Slug resolution for the UUID platform and pack version ids on the row.
  // The caller supplies these from Platform and PlatformPackVersion; the
  // adapter never guesses a slug from a UUID. Defaults are the v1 Etsy
  // values only when the caller does not supply them.
  platformSlug?: string;
  packVersionSlug?: string;
}

export function dbRowsToBuilderPack(input: DbPackInput): ListingPack {
  const row = input.listingPack;
  const product = input.product;
  const factByKey = new Map<string, VerifiedFactRow[]>();
  for (const fact of input.facts) {
    const list = factByKey.get(fact.fact_key) ?? [];
    list.push(fact);
    factByKey.set(fact.fact_key, list);
  }
  const tabCount = factByKey.get("tab_count")?.[0]?.fact_value_number ?? null;
  const priceListMinor = factByKey.get("price_list")?.[0]?.fact_value_number ?? product.price_amount_minor ?? null;
  const priceLaunchMinor = factByKey.get("price_launch")?.[0]?.fact_value_number ?? null;
  const formatRow = factByKey.get("format")?.[0];
  const claims = (factByKey.get("claim") ?? []).map((c) => c.fact_value_text);
  const templateIds = input.extraTemplateIds.length > 0 ? input.extraTemplateIds : row.template_id ? [row.template_id] : [];
  return {
    id: row.id,
    userId: row.user_id,
    productId: row.product_id,
    productFacts: {
      productName: product.name,
      format: (formatRow?.fact_value_text ?? product.format) as ProductFacts["format"],
      formatDetail: formatRow?.fact_value_text ?? product.format,
      tabCount: tabCount === null ? null : Math.trunc(tabCount),
      priceListMinor,
      priceLaunchMinor,
      currency: product.price_currency,
      claims,
      features: [],
      verificationNote: formatRow?.verification_note ?? "",
    },
    platformId: input.platformSlug ?? "etsy",
    packVersionId: input.packVersionSlug ?? "etsy_digital_v1",
    nichePackId: row.niche_pack_id,
    nichePackVersionId: row.niche_pack_version_id,
    templateIds,
    mockupIds: input.extraMockupIds,
    copy: {
      title: input.copy?.title_text ?? "",
      description: input.copy?.description_text ?? "",
      tags: input.copy?.tags_text ?? [],
      checklist: input.copy?.checklist_text ?? [],
      claimsShown: claims,
      generationStatus: (input.copy?.generation_status ?? "draft") as ListingPack["copy"]["generationStatus"],
    },
    images: input.images.map((img, index) => ({
      id: "image-" + (index + 1),
      position: img.position,
      imageRole: img.image_role,
      templateVersionId: img.template_version_id,
      mockupVersionId: img.mockup_version_id,
      productRenderId: img.product_render_id,
      orientation: img.orientation as PackImage["orientation"],
      fitWarning: img.fit_warning,
      qualityGateStatus: img.quality_gate_status as PackImage["qualityGateStatus"],
      qualityGateReason: img.quality_gate_reason,
    })),
    files: input.files,
    status: row.status as ListingPack["status"],
    language: row.language,
    edition: row.edition as ListingPack["edition"],
    hasSampleContent: input.hasSampleContent,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}
