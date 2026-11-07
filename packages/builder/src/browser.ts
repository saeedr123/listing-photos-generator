// Browser safe entry point of @listing-photos-generator/builder.
// Exports only the pure modules: config, reconciliation, upload validation,
// sample content, test product facts, access control, and types. The
// server modules (packs.ts and share-link.ts) use node:crypto and live
// behind the main entry point, so a client bundle never pulls node APIs
// in. Import this entry from client components:
//   import { ... } from "@listing-photos-generator/builder/browser"

export type {
  AccountDeletionRequest,
  Edition,
  ExportRecord,
  ListingPack,
  ListingPackCopy,
  PackImage,
  PackStatus,
  PackVersion,
  ProductFacts,
  ProductFormat,
  ReconciliationItem,
  ReconciliationResult,
  ReconciliationStatus,
  ReviewComment,
  SellerProfile,
  SellerProfileField,
  ShareLink,
  SharePurpose,
  UploadedFileMeta,
} from "./types.ts";
export { etsyPack, mockupKinds, nichePacks, planConfig, sellerProfileFields, templateRoles, uploadConfig } from "./config.ts";
export type { EtsyPackConfig, MockupKindConfig, NichePackConfig, TemplateRoleConfig } from "./config.ts";
export { maidOfHonorFacts, formatPrice } from "./test-product.ts";
export { detectTypeByMagic, validateUpload } from "./upload-validation.ts";
export type { UploadCandidate, UploadValidation } from "./upload-validation.ts";
export { displayedValuesFromPack, reconcilePack } from "./reconciliation.ts";
export type { DisplayedValues } from "./reconciliation.ts";
export { SAMPLE_MARKER, clearSampleContent, containsSampleMarker, sampleCopy, sampleFacts } from "./sample-content.ts";
export { adminAccessRequiresReason, canAdminAccessPack, canDeletePack, canEditPack, canViewPack } from "./access-control.ts";
export type { PackActor, PackOwner } from "./access-control.ts";
