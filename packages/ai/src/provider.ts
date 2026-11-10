// AI provider module. Provider agnostic: the interface below is the only
// thing the copy engine calls. No real provider is wired in version 1, no
// real API key exists, no real provider call is made, and no spending
// happens. The provider choice and the budget cap are open decisions for
// Ali, so the config holds the provider name and the credit cap as null
// until he decides them. Never invent a provider or a price here.
//
// DEVELOPMENT STUB ONLY. The stub below builds suggestions only from the
// seller's verified product facts, in memory, with no network call. It must
// never be presented as a real AI provider and must never hold real user
// data outside local development.

import type {
  AiProviderConfig,
  PlatformLimits,
  SuggestionKind,
  VerifiedFacts,
} from "./types.ts";
import { canonicalFormat } from "./guardrails.ts";

export interface AiGenerateRequest {
  purpose: SuggestionKind;
  facts: VerifiedFacts;
  limits: PlatformLimits;
  promptText: string;
  promptVersion: string;
  promptSlug: string;
  // Tone guidance from the niche pack, or null when no niche is picked.
  nicheTone: string | null;
  nichePackSlug: string | null;
}

export interface AiRawOutput {
  text: string | null;
  tags: string[] | null;
  checklist: string[] | null;
}

export interface AiProvider {
  readonly kind: string;
  readonly name: string;
  generate(request: AiGenerateRequest): Promise<AiRawOutput>;
}

export type AiProviderFactory = (config: AiProviderConfig) => AiProvider;

const aiProviderRegistry = new Map<string, AiProviderFactory>();

// Register an AI provider implementation under its config name. The
// copy engine calls only the AiProvider interface, never a registered
// implementation directly. No real provider is registered in this
// build. A later provider is added by registering its factory and
// naming it in config, never by editing the copy engine.
export function registerAiProvider(name: string, factory: AiProviderFactory): void {
  if (!name || typeof factory !== "function") {
    throw new Error("An AI provider needs a name and a factory function.");
  }
  aiProviderRegistry.set(name, factory);
}

export function listAiProviders(): string[] {
  return [...aiProviderRegistry.keys()].sort();
}

function truncateAtWord(text: string, maxChars: number): string {
  if ([...text].length <= maxChars) {
    return text;
  }
  const words = text.split(" ");
  let out = "";
  for (const word of words) {
    const next = out === "" ? word : out + " " + word;
    if ([...next].length > maxChars) {
      break;
    }
    out = next;
  }
  return out;
}

function titleFromFacts(facts: VerifiedFacts, limits: PlatformLimits): string {
  const format = canonicalFormat(facts);
  const parts = [facts.productName, format];
  if (facts.tabCount !== null) {
    parts.push(facts.tabCount + " tabs");
  }
  return truncateAtWord(parts.join(", "), limits.titleMaxChars);
}

function descriptionFromFacts(facts: VerifiedFacts): string {
  const format = canonicalFormat(facts);
  const sentences: string[] = [];
  sentences.push(facts.productName + " in " + format + ".");
  if (facts.tabCount !== null) {
    sentences.push("It has " + facts.tabCount + " tabs.");
  }
  if (facts.features.length > 0) {
    sentences.push("It includes: " + facts.features.join("; ") + ".");
  }
  if (facts.claims.length > 0) {
    sentences.push(facts.claims.join(". ") + ".");
  }
  return sentences.join(" ");
}

function tagsFromFacts(facts: VerifiedFacts, limits: PlatformLimits): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  const candidates: string[] = [];
  for (const feature of facts.features) {
    candidates.push(feature);
  }
  for (const claim of facts.claims) {
    candidates.push(claim);
  }
  candidates.push(facts.productName);
  for (const candidate of candidates) {
    const words = candidate
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word !== "" && word !== "and" && word !== "the");
    for (let take = 2; take >= 1; take -= 1) {
      for (let start = 0; start + take <= words.length; start += 1) {
        const tag = words.slice(start, start + take).join(" ");
        if (/^\d+$/.test(tag)) {
          continue;
        }
        if ([...tag].length > limits.tagMaxChars || [...tag].length < 2) {
          continue;
        }
        if (seen.has(tag)) {
          continue;
        }
        seen.add(tag);
        tags.push(tag);
        if (tags.length >= limits.tagMaxCount) {
          return tags;
        }
      }
    }
    if (tags.length >= limits.tagMaxCount) {
      return tags;
    }
  }
  return tags;
}

function checklistFromFacts(facts: VerifiedFacts): string[] {
  const items: string[] = [];
  items.push("Check the title names the real product and states no price.");
  if (facts.tabCount !== null) {
    items.push("Check the tab count shown matches the real product: " + facts.tabCount + " tabs.");
  }
  items.push("Check the format shown matches the real product: " + canonicalFormat(facts) + ".");
  if (facts.features.length > 0) {
    items.push("Check every feature listed is a real feature of the product.");
  }
  items.push("Check the first image is the clearest, most realistic preview of the product.");
  return items;
}

// DEVELOPMENT STUB ONLY. See the header note. No network call, no API key,
// no spending. The stub assembles text only from the verified facts in the
// request, so it cannot invent a tab count, a price, a format, a feature,
// or a review. Every stub output still passes through the guardrails in
// guardrails.ts before it is shown to a seller.
export class DevelopmentStubProvider implements AiProvider {
  readonly kind = "development-stub";
  readonly name = "development-stub";

  async generate(request: AiGenerateRequest): Promise<AiRawOutput> {
    const facts = request.facts;
    switch (request.purpose) {
      case "title":
        return { text: titleFromFacts(facts, request.limits), tags: null, checklist: null };
      case "description":
        return { text: descriptionFromFacts(facts), tags: null, checklist: null };
      case "tags":
        return { text: null, tags: tagsFromFacts(facts, request.limits), checklist: null };
      case "checklist":
        return { text: null, tags: null, checklist: checklistFromFacts(facts) };
      default:
        return { text: null, tags: null, checklist: null };
    }
  }
}

// Resolve a provider from config. A null provider name means no provider
// has been chosen, so the development stub is returned for local work only.
// A named provider that has a registered factory is returned from the
// registry. A named provider that has no real implementation throws, instead of
// silently falling back to the stub and pretending to be that provider.
export function createProvider(config: AiProviderConfig): AiProvider {
  if (config.provider === null || config.provider === "") {
    return new DevelopmentStubProvider();
  }
  const factory = aiProviderRegistry.get(config.provider);
  if (factory) {
    return factory(config);
  }
  throw new Error(
    "AI provider \"" + config.provider + "\" is not configured. The provider choice is an open decision for Ali, and no real provider call is made until he chooses one.",
  );
}

export function providerLabel(config: AiProviderConfig): string {
  if (config.provider === null || config.provider === "") {
    return "Development stub only. No real AI provider is connected.";
  }
  return "Provider " + config.provider + " is not connected yet.";
}
