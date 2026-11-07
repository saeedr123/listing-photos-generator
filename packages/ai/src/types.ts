// AI copy help types for Listing Photos Generator.
// Platform neutral: every limit is passed in by the caller, from the active
// platform pack version or plan config. No platform name, size, limit, or
// price lives here. No provider name or budget cap is invented here: the
// provider config holds null until Ali decides the provider and the cap.

export interface VerifiedFacts {
  productName: string;
  // Seller confirmed format, for example "Sheets" with detail "Google Sheets".
  format: string;
  formatDetail: string;
  // Tab count as a number. Null until the seller confirms it.
  tabCount: number | null;
  priceListMinor: number | null;
  priceLaunchMinor: number | null;
  currency: string | null;
  // One claim per entry. Only facts recorded here may appear in copy.
  claims: string[];
  features: string[];
}

export interface PlatformLimits {
  titleMaxChars: number;
  tagMaxCount: number;
  tagMaxChars: number;
}

export interface AiProviderConfig {
  // Null means Ali has not chosen a provider yet. Never invent one.
  provider: string | null;
  model: string | null;
  // Null means Ali has not set a budget cap yet. Never invent one.
  budgetCap: number | null;
  budgetCapCurrency: string | null;
  // Credits charged per suggestion. Read from config/copy-prompts.json.
  // Null means the value is not set in admin yet.
  creditsPerSuggestion: number | null;
}

export interface CreditState {
  // Credits already used this month. Null means usage is not recorded yet.
  used: number | null;
  // Monthly limit from config/plans.json. Null means not set in admin yet.
  limit: number | null;
  planSlug: string;
}

export type SuggestionKind = "title" | "description" | "tags" | "checklist";

export interface AiSuggestion {
  kind: SuggestionKind;
  // Plain text suggestion for title and description. Null for tags and
  // checklist kinds, which use the tags and checklist fields instead.
  text: string | null;
  tags: string[] | null;
  checklist: string[] | null;
  // Every suggestion is shown as a suggestion, not as a final fact.
  status: "suggestion";
  label: string;
  // Prompt version that produced this suggestion, from config/copy-prompts.json.
  promptVersion: string;
  promptSlug: string;
  providerName: string;
  // Niche pack slug that tailored this suggestion, or null for no niche.
  nichePackSlug: string | null;
  // Credits charged for this suggestion, from config. Null if not set.
  creditCost: number | null;
}

export interface MissingInfoPrompt {
  field: string;
  prompt: string;
}

export interface FlaggedKeyword {
  keyword: string;
  reasons: string[];
}

export interface GuardrailResult {
  ok: boolean;
  violations: string[];
  missingInfo: MissingInfoPrompt[];
  flaggedKeywords: FlaggedKeyword[];
}

export type GenerationStatus =
  | "suggestion"
  | "needs_info"
  | "rejected"
  | "needs_config"
  | "credit_limit_reached"
  | "not_ready";

export interface GenerationResult {
  status: GenerationStatus;
  suggestion: AiSuggestion | null;
  violations: string[];
  missingInfo: MissingInfoPrompt[];
  // Plain language note for the seller, for every non suggestion status.
  note: string;
  creditCost: number | null;
}

export interface CopyPrompt {
  slug: string;
  purpose: SuggestionKind | "niche_tailoring";
  version: number;
  status: "draft" | "preview" | "published" | "retired" | string;
  promptText: string;
  // Short preview of what the prompt does, with placeholder tokens only.
  preview: string;
  // Version to restore on rollback. Null when there is no earlier version.
  rollbackToVersion: number | null;
  previousVersion: number | null;
  changeNote: string;
}

export interface NichePackAi {
  slug: string;
  name: string;
  description: string;
  toneGuidance: string;
  // Keyword starting points come only from the seller's own product words.
  // This list starts empty on purpose and is never filled with invented words.
  keywordStartingPoints: string[];
  // Template roles in the order this niche suggests them, most useful first.
  templateRoles: string[];
  templateNotes: Record<string, string>;
  // Mockup kinds that suit this niche, with a plain note per kind.
  mockupKinds: string[];
  mockupNotes: Record<string, string>;
  lastVerifiedDate: string | null;
  sourceNotes: string;
  status: "active" | "backlog" | "retired" | string;
  aiGenerationReady: boolean;
  needsRealProductTesting: boolean;
  reviewStatus: "needs_review" | "in_review" | "passed" | string;
  lastReviewedBy: string | null;
}
