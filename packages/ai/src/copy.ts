// AI copy generation. Every function here follows the same order:
// 1. Check the credit config and balance, from config/plans.json.
// 2. Check the niche pack is ready for AI generation, if one is picked.
// 3. Ask the seller for missing information instead of inventing it.
// 4. Call the provider (the development stub in version 1).
// 5. Run the guardrails. A suggestion that fails the guardrails is rejected,
//    never shown as usable copy.
// A suggestion is always returned as a suggestion, editable, accept or
// reject, never as a final fact.

import {
  flagKeyword,
  missingInfoFor,
  suggestionLabel,
  validateSuggestion,
} from "./guardrails.ts";
import type { AiProvider } from "./provider.ts";
import type {
  AiProviderConfig,
  CopyPrompt,
  CreditState,
  GenerationResult,
  GenerationStatus,
  AiSuggestion,
  NichePackAi,
  PlatformLimits,
  SuggestionKind,
  VerifiedFacts,
} from "./types.ts";

export interface GenerateInput {
  kind: SuggestionKind;
  facts: VerifiedFacts;
  limits: PlatformLimits;
  provider: AiProvider;
  prompt: CopyPrompt;
  credits: CreditState;
  providerConfig: AiProviderConfig;
  nichePack: NichePackAi | null;
}

function creditBlock(credits: CreditState, providerConfig: AiProviderConfig): GenerationResult | null {
  if (providerConfig.creditsPerSuggestion === null) {
    return {
      status: "needs_config",
      suggestion: null,
      violations: [],
      missingInfo: [],
      note: "The credit cost per suggestion is not set in admin yet.",
      creditCost: null,
    };
  }
  if (credits.limit === null) {
    return {
      status: "needs_config",
      suggestion: null,
      violations: [],
      missingInfo: [],
      note: "AI credit limit not set in admin yet.",
      creditCost: providerConfig.creditsPerSuggestion,
    };
  }
  if (credits.used !== null && credits.used >= credits.limit) {
    return {
      status: "credit_limit_reached",
      suggestion: null,
      violations: [],
      missingInfo: [],
      note: "AI credit limit reached for this month: " + credits.used + " of " + credits.limit + " used.",
      creditCost: providerConfig.creditsPerSuggestion,
    };
  }
  return null;
}

export async function generateCopy(input: GenerateInput): Promise<GenerationResult> {
  const blocked = creditBlock(input.credits, input.providerConfig);
  if (blocked !== null) {
    return blocked;
  }
  if (input.nichePack !== null && !input.nichePack.aiGenerationReady) {
    return {
      status: "not_ready",
      suggestion: null,
      violations: [],
      missingInfo: [],
      note:
        "Niche pack \"" + input.nichePack.name + "\" is not ready for AI generation. Sample outputs must be reviewed for grammar, tone, and accuracy against a real product first. See docs/ai-copy.md.",
      creditCost: input.providerConfig.creditsPerSuggestion,
    };
  }
  const missing = missingInfoFor(input.facts, [input.kind]);
  if (missing.length > 0) {
    return {
      status: "needs_info",
      suggestion: null,
      violations: [],
      missingInfo: missing,
      note: "More information is needed before copy can be suggested. Nothing was invented to fill the gap.",
      creditCost: input.providerConfig.creditsPerSuggestion,
    };
  }
  const raw = await input.provider.generate({
    purpose: input.kind,
    facts: input.facts,
    limits: input.limits,
    promptText: input.prompt.promptText,
    promptVersion: String(input.prompt.version),
    promptSlug: input.prompt.slug,
    nicheTone: input.nichePack ? input.nichePack.toneGuidance : null,
    nichePackSlug: input.nichePack ? input.nichePack.slug : null,
  });
  const suggestion: AiSuggestion = {
    kind: input.kind,
    text: raw.text,
    tags: raw.tags,
    checklist: raw.checklist,
    status: "suggestion",
    label: suggestionLabel(),
    promptVersion: String(input.prompt.version),
    promptSlug: input.prompt.slug,
    providerName: input.provider.name,
    nichePackSlug: input.nichePack ? input.nichePack.slug : null,
    creditCost: input.providerConfig.creditsPerSuggestion,
  };
  const guardrail = validateSuggestion(input.facts, suggestion, input.limits);
  if (!guardrail.ok) {
    return {
      status: "rejected",
      suggestion: null,
      violations: guardrail.violations,
      missingInfo: guardrail.missingInfo,
      note: "The suggestion was rejected by the guardrails. It is not shown as usable copy.",
      creditCost: input.providerConfig.creditsPerSuggestion,
    };
  }
  return {
    status: "suggestion",
    suggestion,
    violations: [],
    missingInfo: [],
    note: "",
    creditCost: input.providerConfig.creditsPerSuggestion,
  };
}

export function generateTitle(input: GenerateInput): Promise<GenerationResult> {
  return generateCopy({ ...input, kind: "title" });
}

export function generateDescription(input: GenerateInput): Promise<GenerationResult> {
  return generateCopy({ ...input, kind: "description" });
}

export function generateTags(input: GenerateInput): Promise<GenerationResult> {
  return generateCopy({ ...input, kind: "tags" });
}

export function generateChecklist(input: GenerateInput): Promise<GenerationResult> {
  return generateCopy({ ...input, kind: "checklist" });
}

// Improve an existing title the seller wrote. The title is checked first:
// a title that invents a fact is rejected, a title over the platform limit
// is shortened at a word boundary, and a clean title is returned unchanged
// as a suggestion. No price is ever added to a title.
export function improveTitle(
  existingTitle: string,
  facts: VerifiedFacts,
  limits: PlatformLimits,
  prompt: CopyPrompt,
): GenerationResult {
  const trimmed = existingTitle.trim();
  const candidate: AiSuggestion = {
    kind: "title",
    text: trimmed,
    tags: null,
    checklist: null,
    status: "suggestion",
    label: suggestionLabel(),
    promptVersion: String(prompt.version),
    promptSlug: prompt.slug,
    providerName: "seller text, checked only",
    nichePackSlug: null,
    creditCost: null,
  };
  const guardrail = validateSuggestion(facts, candidate, limits);
  const overLimit = [...trimmed].length > limits.titleMaxChars;
  const hardViolations = guardrail.violations.filter(
    (violation) => !violation.startsWith("Title is "),
  );
  if (hardViolations.length > 0 || guardrail.missingInfo.length > 0) {
    return {
      status: "rejected",
      suggestion: null,
      violations: guardrail.violations,
      missingInfo: guardrail.missingInfo,
      note: "The title was rejected by the guardrails. Fix the flagged items instead of publishing it.",
      creditCost: null,
    };
  }
  if (overLimit) {
    const words = trimmed.split(" ");
    let out = "";
    for (const word of words) {
      const next = out === "" ? word : out + " " + word;
      if ([...next].length > limits.titleMaxChars) {
        break;
      }
      out = next;
    }
    return {
      status: "suggestion",
      suggestion: { ...candidate, text: out },
      violations: [],
      missingInfo: [],
      note: "Title shortened at a word boundary to fit the platform limit of " + limits.titleMaxChars + " characters.",
      creditCost: null,
    };
  }
  return {
    status: "suggestion",
    suggestion: candidate,
    violations: [],
    missingInfo: [],
    note: "Title is within the platform limit and states no invented fact.",
    creditCost: null,
  };
}

// Niche tailoring. Tailoring highlights relevant features from the seller's
// own product and applies the pack tone guidance. It never adds a feature,
// a tab count, a format, a price, or a claim the seller does not have. A
// pack that is not ready for AI generation refuses tailoring outright.
export function tailorForNiche(
  suggestion: AiSuggestion,
  facts: VerifiedFacts,
  nichePack: NichePackAi,
  limits: PlatformLimits,
): GenerationResult {
  if (!nichePack.aiGenerationReady) {
    const status: GenerationStatus = "not_ready";
    return {
      status,
      suggestion: null,
      violations: [],
      missingInfo: [],
      note:
        "Niche pack \"" + nichePack.name + "\" is not ready for AI generation. Sample outputs must be reviewed for grammar, tone, and accuracy against a real product first.",
      creditCost: null,
    };
  }
  const tailored: AiSuggestion = {
    ...suggestion,
    nichePackSlug: nichePack.slug,
  };
  const guardrail = validateSuggestion(facts, tailored, limits);
  if (!guardrail.ok) {
    return {
      status: "rejected",
      suggestion: null,
      violations: guardrail.violations,
      missingInfo: guardrail.missingInfo,
      note: "The tailored suggestion was rejected by the guardrails.",
      creditCost: null,
    };
  }
  return {
    status: "suggestion",
    suggestion: tailored,
    violations: [],
    missingInfo: [],
    note: "Tailored with the \"" + nichePack.name + "\" tone guidance, using only the seller's confirmed facts.",
    creditCost: null,
  };
}

// Check a seller supplied keyword before it is added to a pack. Returns
// the flag result so the interface can hold the keyword for confirmation
// instead of adding it silently.
export function checkKeyword(
  keyword: string,
  facts: VerifiedFacts,
  limits: PlatformLimits,
): { flagged: boolean; reasons: string[] } {
  const flagged = flagKeyword(keyword, facts, limits);
  return { flagged: flagged.reasons.length > 0, reasons: flagged.reasons };
}
