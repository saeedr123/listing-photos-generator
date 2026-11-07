// Builder types. Platform neutral: platform_id and pack version travel on
// the pack, never a hard coded column per platform. Field names follow
// docs/database-design.md so the Prisma adapter can map them directly.

export type Edition = "listing-photos-generator" | "nvconsult";

export type PackStatus = "draft" | "ready_for_review" | "ready_to_export" | "exported" | "archived";

export type ProductFormat = "Sheets" | "PDF" | "ZIP" | "Other";

// Verified facts about the real product. Only facts recorded here may appear
// in copy or on images. A fact that is not verified here must not appear.
export interface ProductFacts {
  productName: string;
  format: ProductFormat;
  formatDetail: string;
  // Tab count as a number. Null until the seller confirms it.
  tabCount: number | null;
  priceListMinor: number | null;
  priceLaunchMinor: number | null;
  currency: string | null;
  // One claim per entry. Never a bundle, never an invented claim.
  claims: string[];
  features: string[];
  // How each fact was checked, in plain words. Empty until checked.
  verificationNote: string;
}

export interface UploadedFileMeta {
  id: string;
  productId: string;
  storageKey: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  widthPx: number | null;
  heightPx: number | null;
  pageCount: number | null;
  // sheet_pdf, screenshot, or render. A mockup frame is never stored here.
  sourceKind: "sheet_pdf" | "screenshot" | "render";
  uploadedByUserId: string;
  createdAt: string;
}

export interface ListingPackCopy {
  title: string;
  description: string;
  tags: string[];
  checklist: string[];
  // Claims the pack shows on images or in copy, one per entry. Every entry
  // must be a verified product fact, or reconciliation blocks export.
  claimsShown: string[];
  generationStatus: "draft" | "generated" | "reviewed" | "approved";
}

export interface PackImage {
  id: string;
  position: number;
  imageRole: string;
  templateVersionId: string | null;
  mockupVersionId: string | null;
  productRenderId: string | null;
  orientation: "landscape" | "portrait" | "square" | null;
  fitWarning: string | null;
  qualityGateStatus: "pass" | "warn" | "block" | "not_checked";
  qualityGateReason: string | null;
}

export interface ListingPack {
  id: string;
  userId: string;
  productId: string;
  productFacts: ProductFacts;
  platformId: string;
  packVersionId: string;
  nichePackId: string | null;
  nichePackVersionId: string | null;
  templateIds: string[];
  mockupIds: string[];
  copy: ListingPackCopy;
  images: PackImage[];
  files: UploadedFileMeta[];
  status: PackStatus;
  language: string;
  edition: Edition;
  // True while the pack still holds sample content. Sample content is never
  // exported as if it were the seller's real product.
  hasSampleContent: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PackVersion {
  id: string;
  listingPackId: string;
  versionNumber: number;
  snapshot: ListingPack;
  createdByUserId: string;
  createdAt: string;
  note: string;
}

export type ReconciliationStatus = "pass" | "fail" | "blocked";

export interface ReconciliationItem {
  factKey: "tab_count" | "price" | "format" | "claim" | "sample_content";
  expected: string;
  found: string;
  result: "match" | "mismatch";
  // Flag only: the fix is shown to the seller. The tool does not change a
  // product fact by itself.
  fix: string;
  action: "block_export" | "warn";
}

export interface ReconciliationResult {
  status: ReconciliationStatus;
  checkedAt: string;
  items: ReconciliationItem[];
  canExport: boolean;
  summary: string;
}

export interface ExportRecord {
  id: string;
  listingPackId: string;
  userId: string;
  platformId: string;
  packVersionId: string;
  exportKind: "images_zip" | "copy_text_pack" | "full_pack";
  fileFormat: string;
  shortestSidePx: number;
  imageCount: number;
  status: "queued" | "processing" | "ready" | "failed";
  errorMessage: string | null;
  reconciliationCheckId: string | null;
  createdAt: string;
}

export type SharePurpose = "share" | "review";

export interface ShareLink {
  id: string;
  listingPackId: string;
  userId: string;
  // Only the hash is stored. The plain token is shown once, at creation.
  tokenHash: string;
  purpose: SharePurpose;
  isActive: boolean;
  expiresAt: string | null;
  viewCount: number;
  createdAt: string;
  deactivatedAt: string | null;
}

export interface ReviewComment {
  id: string;
  shareLinkId: string;
  listingPackId: string;
  authorLabel: string;
  text: string;
  createdAt: string;
}

export interface SellerProfileField {
  key: string;
  label: string;
  type: "text" | "url" | "email" | "textarea" | "select";
  required: boolean;
  helpText: string;
  options?: string[];
}

// One seller profile per account, reused across listing packs. Values are
// stored as a plain record keyed by field key, so admin can add a field
// without a code change or a migration.
export interface SellerProfile {
  id: string;
  userId: string;
  edition: Edition;
  values: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface AccountDeletionRequest {
  id: string;
  userId: string;
  requestedAt: string;
  requestedBy: "user" | "admin";
  reason: string | null;
  status: "requested" | "soft_deleted" | "hard_deleted" | "cancelled";
  softDeletedAt: string | null;
  hardDeletedAt: string | null;
  completionNote: string | null;
}
