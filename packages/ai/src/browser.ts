// Browser safe entry point of @listing-photos-generator/ai.
// Exports only the pure modules: types, guardrails, provider stub, copy
// generation, credits, niche packs, and prompt helpers. The Node loaders
// (loaders.ts) use node:fs and live behind the main entry point, so a
// client bundle never pulls Node APIs in. Import this entry from client
// components:
//   import { ... } from "@listing-photos-generator/ai/browser"

export type {
  AiProviderConfig,
  AiSuggestion,
  CopyPrompt,
  CreditState,
  FlaggedKeyword,
  GenerationResult,
  GenerationStatus,
  GuardrailResult,
  MissingInfoPrompt,
  NichePackAi,
  PlatformLimits,
  SuggestionKind,
  VerifiedFacts,
} from "./types.ts";
export {
  aiLayoutLabel,
  canonicalFormat,
  checkClaimText,
  flagKeyword,
  missingInfoFor,
  mockupFrameLabel,
  sellerWords,
  suggestionLabel,
  validateSuggestion,
} from "./guardrails.ts";
export {
  DevelopmentStubProvider,
  createProvider,
  listAiProviders,
  providerLabel,
  registerAiProvider,
} from "./provider.ts";
export type { AiGenerateRequest, AiProvider, AiProviderFactory, AiRawOutput } from "./provider.ts";
export {
  checkKeyword,
  generateChecklist,
  generateCopy,
  generateDescription,
  generateTags,
  generateTitle,
  improveTitle,
  tailorForNiche,
} from "./copy.ts";
export type { GenerateInput } from "./copy.ts";
export {
  canUseCredit,
  aiGenerationGate,
  creditsRemaining,
  formatCreditDisplay,
  getCreditLimit,
  getTrialCreditAllowance,
} from "./credits.ts";
export type { AiGenerationGateCode, PlansConfigShape } from "./credits.ts";
export {
  NICHE_PACK_COUNT_V1,
  checkNichePackSet,
  getNichePack,
  isPackStale,
  nichePackNeedsReview,
  reviewChecklistFor,
} from "./niche.ts";
export type { NichePacksConfigShape } from "./niche.ts";
export {
  getPrompt,
  getPromptVersion,
  listPromptVersions,
  rollbackTarget,
  validatePrompts,
} from "./prompts.ts";
