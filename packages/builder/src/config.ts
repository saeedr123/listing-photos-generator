// Builder configuration. Nothing content bearing is hard coded in the
// builder logic; it reads this configuration. Admin edits the configuration,
// with preview and rollback, to change copy, limits, niches, templates, or
// mockups. No price, platform rule, or product fact is invented here.
//
// Single source of truth: config/niche-packs.json, config/plans.json, and
// config/platform-packs/etsy.v1.json at the repo root hold the admin
// editable values, and packages/template-engine/templates/*.json hold the
// template definitions. The values below mirror those files so this
// package stays usable standalone. If a value here and a value in the root
// config disagree, the root config wins and this file must be updated.
// See docs/builder.md, open item: read the root config at build time.
//
// Etsy values below are the verified rules from docs/platform-rules.md,
// check date 2026-11-05. A value marked UNVERIFIED in that file is not used
// as a generator limit here.

import type { SellerProfileField } from "./types.ts";

export interface EtsyPackConfig {
  platformId: string;
  packVersion: string;
  source: string;
  checkDate: string;
  titleMaxChars: number;
  titleWordGuidance: string;
  tagMaxCount: number;
  tagMaxChars: number;
  shortestSidePx: number;
  firstPhotoMinPx: number;
  maxImages: number;
  exportFormat: string;
  colourProfile: string;
  digitalFileMaxCount: number;
  digitalFileMaxMb: number;
  digitalFileNameMaxChars: number;
}

export const etsyPack: EtsyPackConfig = {
  platformId: "etsy",
  packVersion: "etsy_digital_v1",
  source: "docs/platform-rules.md, Etsy Help and Seller Handbook",
  checkDate: "2026-11-05",
  titleMaxChars: 140,
  titleWordGuidance: "Consider less than 15 words.",
  tagMaxCount: 13,
  tagMaxChars: 20,
  shortestSidePx: 2000,
  firstPhotoMinPx: 635,
  maxImages: 20,
  exportFormat: "jpg",
  colourProfile: "sRGB",
  digitalFileMaxCount: 5,
  digitalFileMaxMb: 20,
  digitalFileNameMaxChars: 70,
};

// Upload limits are tool configuration, not Etsy rules. The Etsy digital
// file limits above apply to files the seller uploads to Etsy, not to files
// the seller uploads to this tool.
export const uploadConfig = {
  allowedExtensions: ["pdf", "jpg", "jpeg", "png"],
  allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
  // Tool default, configurable in admin. Not an Etsy rule.
  maxFileBytes: 20 * 1024 * 1024,
  maxFilesPerProduct: 10,
  // File names the seller will later upload to Etsy are limited by Etsy to
  // 70 characters. The tool warns at export time, it does not block upload.
  etsyFileNameMaxChars: 70,
};

export interface NichePackConfig {
  id: string;
  slug: string;
  name: string;
  description: string;
  toneGuidance: string;
  // Starting keywords come only from the seller's own product words.
  // This list starts empty on purpose. It is never filled with invented
  // keywords.
  keywordStartingPoints: string[];
  templateRoles: string[];
  mockupKinds: string[];
  // Last verified date and source notes live in admin. The date below is
  // the date the niche was chosen (2026-11-05), not a product verification.
  // Each pack still needs testing with a real product in that niche before
  // it is used for AI generation.
  lastVerifiedDate: string | null;
  sourceNotes: string;
  status: "active" | "backlog" | "retired";
  aiGenerationReady: boolean;
  needsRealProductTesting: boolean;
}

// Version 1 ships 3 niche packs only: wedding and events, personal finance,
// and small business planners. Other niches go to backlog.
export const nichePacks: NichePackConfig[] = [
  {
    id: "wedding-and-events",
    slug: "wedding-and-events",
    name: "Wedding and events",
    description: "Planners and sheets for weddings and events.",
    toneGuidance: "Warm and practical. Describe what the planner helps the buyer organise, using only the seller's confirmed features.",
    keywordStartingPoints: [],
    templateRoles: ["hero", "features-grid", "what-is-inside", "how-it-works", "mobile-view", "sizes-and-formats", "feature-close-up", "bundle-all-tabs", "who-it-is-for", "final-call-to-action"],
    mockupKinds: ["laptop-alone", "phone-alone", "tablet-alone", "laptop-plus-phone", "flat-feature-frame"],
    lastVerifiedDate: "2026-11-05",
    sourceNotes: "Chosen as a version 1 test niche in PROMPT.md section 12, decided by Ali 2026-11-05. Pack content is not yet researched or tested with a real product.",
    status: "active",
    aiGenerationReady: false,
    needsRealProductTesting: true,
  },
  {
    id: "personal-finance",
    slug: "personal-finance",
    name: "Personal finance",
    description: "Budget, money, and finance planners and sheets.",
    toneGuidance: "Clear and direct. Describe what the planner tracks, using only the seller's confirmed features. No outcome or savings claims.",
    keywordStartingPoints: [],
    templateRoles: ["hero", "features-grid", "what-is-inside", "how-it-works", "mobile-view", "sizes-and-formats", "feature-close-up", "bundle-all-tabs", "who-it-is-for", "final-call-to-action"],
    mockupKinds: ["laptop-alone", "phone-alone", "tablet-alone", "laptop-plus-phone", "flat-feature-frame"],
    lastVerifiedDate: "2026-11-05",
    sourceNotes: "Chosen as a version 1 test niche in PROMPT.md section 12, decided by Ali 2026-11-05. Pack content is not yet researched or tested with a real product.",
    status: "active",
    aiGenerationReady: false,
    needsRealProductTesting: true,
  },
  {
    id: "small-business-planners",
    slug: "small-business-planners",
    name: "Small business planners",
    description: "Planners and sheets for small business owners.",
    toneGuidance: "Practical and businesslike. Describe what the planner organises, using only the seller's confirmed features.",
    keywordStartingPoints: [],
    templateRoles: ["hero", "features-grid", "what-is-inside", "how-it-works", "mobile-view", "sizes-and-formats", "feature-close-up", "bundle-all-tabs", "who-it-is-for", "final-call-to-action"],
    mockupKinds: ["laptop-alone", "phone-alone", "tablet-alone", "laptop-plus-phone", "flat-feature-frame"],
    lastVerifiedDate: "2026-11-05",
    sourceNotes: "Chosen as a version 1 test niche in PROMPT.md section 12, decided by Ali 2026-11-05. Pack content is not yet researched or tested with a real product.",
    status: "active",
    aiGenerationReady: false,
    needsRealProductTesting: true,
  },
];

// Template choice list. The template engine owns template definitions in
// packages/template-engine/templates/*.json. This list records only the
// choice the builder offers, with the structure, section order, typography,
// and orientations read from those definitions. It must not grow into a
// second template engine. The distinctness facts come from the engine
// registry (layout structure, section order, typography system).
export interface TemplateRoleConfig {
  id: string;
  role: string;
  name: string;
  layoutStructure: string;
  sectionOrder: string;
  typography: string;
  allowedOrientations: string[];
  bestUse: string;
}

export const templateRoles: TemplateRoleConfig[] = [
  { id: "hero", role: "hero", name: "Hero", layoutStructure: "title-top-devices-centre-pill-bar-bottom", sectionOrder: "header, devices, pill-bar", typography: "Georgia italic serif title, small caps bold subtitle", allowedOrientations: ["landscape"], bestUse: "First image in the pack" },
  { id: "features-grid", role: "features-grid", name: "Features Grid", layoutStructure: "title-top-left-grid-2x3-cards", sectionOrder: "header, grid, footer-note", typography: "Arial bold sans title, regular sans subtitle", allowedOrientations: ["landscape"], bestUse: "Showing the main features at a glance" },
  { id: "what-is-inside", role: "what-is-inside", name: "What Is Inside", layoutStructure: "left-rail-title-numbered-list-two-columns", sectionOrder: "rail, tab-list, pill-bar", typography: "Georgia serif bold title, serif italic subtitle", allowedOrientations: ["landscape"], bestUse: "Showing the contents of the product" },
  { id: "how-it-works", role: "how-it-works", name: "How It Works", layoutStructure: "title-top-three-step-row", sectionOrder: "header, steps, support-strip", typography: "Arial extra bold sans title, medium sans subtitle", allowedOrientations: ["landscape"], bestUse: "Explaining the buyer journey" },
  { id: "mobile-view", role: "mobile-view", name: "Mobile View", layoutStructure: "device-centre-title-bottom", sectionOrder: "device, title-block, pill-bar", typography: "Georgia serif italic title, letter spaced caps subtitle", allowedOrientations: ["portrait"], bestUse: "Showing the product on a phone" },
  { id: "sizes-and-formats", role: "sizes-and-formats", name: "Sizes and Formats", layoutStructure: "left-facts-panel-right-device-table", sectionOrder: "header, facts-table, device, note", typography: "Arial bold sans title, serif subtitle, mono body", allowedOrientations: ["landscape"], bestUse: "Stating format and file facts" },
  { id: "feature-close-up", role: "feature-close-up", name: "Feature Close Up", layoutStructure: "title-top-tablet-dominant-callouts-side", sectionOrder: "header, tablet, callouts, pill-bar", typography: "Georgia serif bold italic title, small caps bold subtitle", allowedOrientations: ["landscape"], bestUse: "Showing one feature in detail" },
  { id: "bundle-all-tabs", role: "bundle-all-tabs", name: "Bundle and All Tabs Overview", layoutStructure: "title-top-mini-card-grid-4x3", sectionOrder: "header, tab-grid, count-strip", typography: "Arial black sans title, bold sans subtitle", allowedOrientations: ["landscape"], bestUse: "Showing everything included" },
  { id: "who-it-is-for", role: "who-it-is-for", name: "Who It Is For", layoutStructure: "centred-title-three-audience-cards", sectionOrder: "header, audience-cards, note", typography: "Georgia serif title, medium sans subtitle", allowedOrientations: ["square"], bestUse: "Naming who the product is for" },
  { id: "final-call-to-action", role: "final-call-to-action", name: "Final Call to Action", layoutStructure: "centred-title-cta-recap-strip", sectionOrder: "hero-line, fact-strip, recap-strip", typography: "Arial extra bold sans title, Georgia serif italic subtitle", allowedOrientations: ["landscape"], bestUse: "Closing image in the pack" },
];

// Mockup choice list. The mockup library owns mockup definitions. This
// list records only the v1 starter set of kinds. Quality label follows the
// mockup engine vocabulary: every entry here is "basic". A flat basic
// frame is not premium, and must not be labelled premium. A frame with no
// licence record must not be enabled in the live library.
export interface MockupKindConfig {
  id: string;
  kind: string;
  name: string;
  qualityLabel: "basic" | "premium";
  licence: string | null;
  note: string;
}

export const mockupKinds: MockupKindConfig[] = [
  { id: "laptop-alone", kind: "laptop-alone", name: "Laptop alone", qualityLabel: "basic", licence: null, note: "Straight on laptop frame. Basic frame, not premium." },
  { id: "phone-alone", kind: "phone-alone", name: "Phone alone", qualityLabel: "basic", licence: null, note: "Straight on phone frame. Basic frame, not premium." },
  { id: "tablet-alone", kind: "tablet-alone", name: "Tablet alone", qualityLabel: "basic", licence: null, note: "Straight on tablet frame. Basic frame, not premium." },
  { id: "laptop-plus-phone", kind: "laptop-plus-phone", name: "Laptop plus phone hero", qualityLabel: "basic", licence: null, note: "Laptop plus phone combination. Basic frame, not premium." },
  { id: "flat-feature-frame", kind: "flat-feature-frame", name: "Flat feature frame", qualityLabel: "basic", licence: null, note: "Flat frame for a single sheet or feature close up. Basic frame, not premium." },
];

// Seller profile fields are admin configurable. Add a field here to add it
// to the profile form. No shop detail is hard coded anywhere in the app.
export const sellerProfileFields: SellerProfileField[] = [
  { key: "shopName", label: "Shop name", type: "text", required: false, helpText: "The name buyers see on your shop." },
  { key: "sellerName", label: "Seller name", type: "text", required: false, helpText: "Your name, as you want it shown." },
  { key: "shopUrl", label: "Shop URL", type: "url", required: false, helpText: "Link to your shop, if you have one." },
  { key: "email", label: "Contact email", type: "email", required: false, helpText: "Where buyers and reviewers can reach you." },
  { key: "tagline", label: "Shop tagline", type: "text", required: false, helpText: "One short line about your shop." },
  { key: "defaultCurrency", label: "Default currency", type: "select", required: false, helpText: "Currency used when a price has no currency yet.", options: ["USD", "EUR", "GBP"] },
  { key: "brandNotes", label: "Brand notes", type: "textarea", required: false, helpText: "Notes about your branding, for your own use in future packs." },
];

// Plans and trial. Starting defaults from PROMPT.md section 16, mirrored
// from config/plans.json, all configurable in admin. No price is set here:
// price is an open decision for Ali, and must not be invented. A null
// value means not set in admin, never zero and never a hidden price.
export const planConfig = {
  free: {
    slug: "free",
    name: "Free",
    // One complete pack free. The free limit is a count, not a watermark.
    maxListingPacks: 1,
    maxStoragePacks: null as number | null,
    templates: "selected",
    mockups: "basic",
    // Monthly AI credit count. Null means not set in admin yet.
    aiCreditsPerMonth: null as number | null,
    exportFormats: ["jpg"],
  },
  premium: {
    slug: "premium",
    name: "Premium",
    maxListingPacks: null as number | null,
    maxStoragePacks: null as number | null,
    templates: "all",
    mockups: "full",
    aiCreditsPerMonth: null as number | null,
    exportFormats: ["jpg"],
  },
  trial: {
    // Starting default: 7 days, no card, one trial per account.
    durationDays: 7,
    cardRequired: false,
    maxTrialsPerAccount: 1,
    aiCreditAllowance: null as number | null,
    exportAllowance: null as number | null,
    listingPackAllowance: null as number | null,
  },
};
