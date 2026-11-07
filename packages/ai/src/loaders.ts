// Node only config loaders for the AI package. These read the repo root
// config files: config/copy-prompts.json, config/plans.json,
// config/niche-packs.json, and config/platform-packs/etsy.v1.json. The
// browser entry point (browser.ts) does not import this file, so no Node
// API reaches the client bundle. The repo root defaults to three levels up
// from this file, which is packages/ai/src, and callers may pass an
// explicit root instead.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  AiProviderConfig,
  CopyPrompt,
  NichePackAi,
  PlatformLimits,
} from "./types.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

export function defaultRepoRoot(): string {
  return join(HERE, "..", "..", "..");
}

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export interface CopyPromptsConfig {
  version: number;
  provider: {
    name: string | null;
    model: string | null;
    budget_cap: number | null;
    budget_cap_currency: string | null;
  };
  credits_per_suggestion: number | null;
  prompts: CopyPrompt[];
}

export function loadCopyPrompts(repoRoot: string = defaultRepoRoot()): CopyPromptsConfig {
  const raw = loadJson<{
    version: number;
    provider: { name: string | null; model: string | null; budget_cap: number | null; budget_cap_currency: string | null; note?: string };
    credits_per_suggestion: number | null;
    prompts: Array<{
      slug: string;
      purpose: string;
      version: number;
      status: string;
      prompt_text: string;
      preview: string;
      rollback_to_version: number | null;
      previous_version: number | null;
      change_note: string;
    }>;
  }>(join(repoRoot, "config", "copy-prompts.json"));
  // Map the snake case config file to the camel case CopyPrompt type.
  // The config file is the single source; no prompt text is changed here.
  return {
    version: raw.version,
    provider: raw.provider,
    credits_per_suggestion: raw.credits_per_suggestion,
    prompts: raw.prompts.map((prompt) => ({
      slug: prompt.slug,
      purpose: prompt.purpose as CopyPrompt["purpose"],
      version: prompt.version,
      status: prompt.status,
      promptText: prompt.prompt_text,
      preview: prompt.preview,
      rollbackToVersion: prompt.rollback_to_version,
      previousVersion: prompt.previous_version,
      changeNote: prompt.change_note,
    })),
  };
}

export function loadAiProviderConfig(
  repoRoot: string = defaultRepoRoot(),
  env: Record<string, string | undefined> = process.env,
): AiProviderConfig {
  const prompts = loadCopyPrompts(repoRoot);
  return {
    provider: env.AI_PROVIDER && env.AI_PROVIDER !== "" ? env.AI_PROVIDER : prompts.provider.name,
    model: env.AI_MODEL && env.AI_MODEL !== "" ? env.AI_MODEL : prompts.provider.model,
    budgetCap: prompts.provider.budget_cap,
    budgetCapCurrency: prompts.provider.budget_cap_currency,
    creditsPerSuggestion: prompts.credits_per_suggestion,
  };
}

export interface PlansConfigFile {
  plans: Array<{
    slug: string;
    entitlements: { ai_credits_per_month: number | null };
  }>;
  trial: { ai_credit_allowance: number | null };
}

export function loadPlans(repoRoot: string = defaultRepoRoot()): PlansConfigFile {
  return loadJson<PlansConfigFile>(join(repoRoot, "config", "plans.json"));
}

export function loadNichePacks(repoRoot: string = defaultRepoRoot()): NichePackAi[] {
  const file = loadJson<{ packs: Array<Record<string, unknown>> }>(
    join(repoRoot, "config", "niche-packs.json"),
  );
  // Map the snake case config file to the camel case NichePackAi type.
  return file.packs.map((pack) => ({
    slug: pack.slug as string,
    name: pack.name as string,
    description: pack.description as string,
    toneGuidance: pack.tone_guidance as string,
    keywordStartingPoints: pack.keyword_starting_points as string[],
    templateRoles: pack.template_roles as string[],
    templateNotes: pack.template_notes as Record<string, string>,
    mockupKinds: pack.mockup_kinds as string[],
    mockupNotes: pack.mockup_notes as Record<string, string>,
    lastVerifiedDate: pack.last_verified_date as string | null,
    sourceNotes: pack.source_notes as string,
    status: pack.status as string,
    aiGenerationReady: pack.ai_generation_ready as boolean,
    needsRealProductTesting: pack.needs_real_product_testing as boolean,
    reviewStatus: pack.review_status as string,
    lastReviewedBy: pack.last_reviewed_by as string | null,
  }));
}

// Platform limits from the active platform pack file. Version 1 reads the
// Etsy pack. The file, not code, is the source of the 140 character title
// limit, the 13 tag count, and the 20 character tag limit.
export function loadEtsyLimits(repoRoot: string = defaultRepoRoot()): PlatformLimits {
  const pack = loadJson<{
    title: { max_chars: number };
    tags: { max_count: number; max_chars_each: number };
  }>(join(repoRoot, "config", "platform-packs", "etsy.v1.json"));
  return {
    titleMaxChars: pack.title.max_chars,
    tagMaxCount: pack.tags.max_count,
    tagMaxChars: pack.tags.max_chars_each,
  };
}
