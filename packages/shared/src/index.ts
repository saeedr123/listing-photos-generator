// Shared types for Listing Photos Generator.
// Platform neutral: every type that touches a platform carries platform_id
// and pack_version_id, never a column or field named for one platform only.
// No price, platform rule, or limit is hard coded here. Values come from
// config files (config/plans.json, config/platform-packs/) or from admin.

export type Edition = string;

export type PlatformRef = {
  platform_id: string;
  pack_version_id: string;
};

export type FactKey = "tab_count" | "price" | "format" | "claim" | string;

export type Product = {
  id: string;
  user_id: string;
  edition: Edition;
  name: string;
  product_type: string;
  format: string;
  price_amount_minor: number | null;
  price_currency: string | null;
  description_seller: string | null;
  status: "draft" | "active" | "archived" | string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ProductVerifiedFact = {
  id: string;
  product_id: string;
  fact_key: FactKey;
  fact_value_text: string;
  fact_value_number: number | null;
  source_file_id: string | null;
  verified_by_user_id: string;
  verified_at: string;
  verification_note: string | null;
};

export type ReconciliationCheckItem = {
  id: string;
  reconciliation_check_id: string;
  fact_key: FactKey;
  expected_value_text: string;
  generated_value_text: string;
  result: "match" | "mismatch" | string;
  action: "block_export" | "warn" | "allow_with_override" | string;
  override_reason: string | null;
  override_by_user_id: string | null;
};

export type ReconciliationCheck = PlatformRef & {
  id: string;
  listing_pack_id: string;
  status: "pass" | "fail" | "blocked" | string;
  checked_at: string;
  checked_by: "system" | "user" | string;
  items: ReconciliationCheckItem[];
};

export type ListingPack = PlatformRef & {
  id: string;
  user_id: string;
  product_id: string;
  niche_pack_id: string | null;
  niche_pack_version_id: string | null;
  template_id: string | null;
  status:
    | "draft"
    | "ready_for_review"
    | "ready_to_export"
    | "exported"
    | "archived"
    | string;
  language: string;
  edition: Edition;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ListingPackCopy = PlatformRef & {
  id: string;
  listing_pack_id: string;
  copy_prompt_version_id: string;
  title_text: string | null;
  title_char_count: number | null;
  description_text: string | null;
  tags_text: string[] | null;
  keywords_text: string | null;
  checklist_text: string[] | null;
  generation_status: "draft" | "generated" | "reviewed" | "approved" | string;
};

export type TemplateVersionRef = {
  template_id: string;
  version_number: number;
  definition: Record<string, unknown>;
  status: "draft" | "preview" | "published" | "retired" | string;
};

export type Template = {
  id: string;
  slug: string;
  name: string;
  template_role: string;
  is_active: boolean;
  versions: TemplateVersionRef[];
};

export type MockupLicence = {
  source: string | null;
  licence_type: string | null;
  licence_date: string | null;
  licence_storage_location: string | null;
};

export type MockupVersionRef = MockupLicence & {
  mockup_id: string;
  version_number: number;
  frame_storage_key: string;
  frame_width_px: number;
  frame_height_px: number;
  screen_area: Record<string, unknown>;
  allowed_orientations: string[];
  status: "draft" | "preview" | "published" | "retired" | string;
  crisp_test_status: "not_tested" | "pass" | "fail" | string;
};

export type Mockup = {
  id: string;
  slug: string;
  name: string;
  mockup_kind: string;
  is_active: boolean;
  is_hidden: boolean;
  versions: MockupVersionRef[];
};

export type PlatformPack = PlatformRef & {
  id: string;
  slug: string;
  name: string;
  version_number: number;
  status: "draft" | "preview" | "published" | "retired" | string;
  last_verified_date: string | null;
  definition: Record<string, unknown>;
};

export type Entitlement = {
  entitlement_key: string;
  limit_value_text: string | null;
  limit_value_number: number | null;
};

export type Plan = {
  id: string;
  slug: string;
  name: string;
  // Null price means not decided by Ali, never zero and never a hidden price.
  price_amount_minor: number | null;
  price_currency: string | null;
  billing_interval: string | null;
  is_active: boolean;
  entitlements: Entitlement[];
};

export type Trial = {
  id: string;
  user_id: string;
  plan_id: string;
  starts_at: string;
  ends_at: string;
  status: "active" | "converted" | "expired" | "cancelled" | string;
  requires_card: boolean;
  ai_credit_allowance: number | null;
  export_allowance: number | null;
  listing_pack_allowance: number | null;
};

export type TrialConfig = {
  duration_days: number;
  requires_card: boolean;
  one_per_account: boolean;
  ai_credit_allowance: number | null;
  export_allowance: number | null;
  listing_pack_allowance: number | null;
};

export { countChars, isTagWithinLimit, isTitleWithinLimit, trialEndsAt, validateTags } from "./checks";
