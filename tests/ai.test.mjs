// AI copy help tests, per PROMPT.md sections 11 and 12.
// Guardrails, provider stub, prompt management, credit limits, and niche
// packs. Limits come from config/platform-packs/etsy.v1.json, never hard
// coded here except as the verified values the pack file itself states.
// Prices in the test product facts come from
// tests/fixtures/maid-of-honor-facts.json, task supplied, not rechecked
// against a live Etsy listing.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import {
  DevelopmentStubProvider,
  aiLayoutLabel,
  checkClaimText,
  checkKeyword,
  checkNichePackSet,
  createProvider,
  flagKeyword,
  formatCreditDisplay,
  generateChecklist,
  generateDescription,
  generateTags,
  generateTitle,
  getCreditLimit,
  getPrompt,
  getTrialCreditAllowance,
  improveTitle,
  isPackStale,
  loadAiProviderConfig,
  loadCopyPrompts,
  loadEtsyLimits,
  loadNichePacks,
  loadPlans,
  mockupFrameLabel,
  reviewChecklistFor,
  suggestionLabel,
  tailorForNiche,
  validatePrompts,
  validateSuggestion,
  canUseCredit,
  creditsRemaining,
  nichePackNeedsReview,
  getNichePack,
} from "../packages/ai/src/index.ts";

const ROOT = new URL("../", import.meta.url).pathname;
const fixture = JSON.parse(readFileSync(`${ROOT}tests/fixtures/maid-of-honor-facts.json`, "utf8"));

const facts = {
  productName: fixture.productName,
  format: "Sheets",
  formatDetail: "Google Sheets",
  tabCount: fixture.tabCount,
  priceListMinor: Math.round(fixture.priceList.amount * 100),
  priceLaunchMinor: Math.round(fixture.priceLaunch.amount * 100),
  currency: fixture.priceList.currency,
  claims: fixture.claims,
  features: fixture.features,
};

const limits = loadEtsyLimits(ROOT);
const promptsConfig = loadCopyPrompts(ROOT);
const prompts = promptsConfig.prompts;
const providerConfig = loadAiProviderConfig(ROOT, {});
const plans = loadPlans(ROOT);
const nichePacks = loadNichePacks(ROOT);
const creditsOk = { used: 0, limit: 10, planSlug: "free" };
const stub = new DevelopmentStubProvider();

function suggestion(kind, text, extra = {}) {
  return {
    kind,
    text: text ?? null,
    tags: extra.tags ?? null,
    checklist: extra.checklist ?? null,
    status: "suggestion",
    label: "Suggestion, not a final fact.",
    promptVersion: "1",
    promptSlug: kind + "-v1",
    providerName: "development-stub",
    nichePackSlug: null,
    creditCost: 1,
  };
}

describe("platform limits come from the Etsy pack", () => {
  it("reads title 140, 13 tags, 20 characters per tag from the pack file", () => {
    assert.equal(limits.titleMaxChars, 140);
    assert.equal(limits.tagMaxCount, 13);
    assert.equal(limits.tagMaxChars, 20);
  });
});

describe("provider is a development stub only", () => {
  it("returns the stub when no provider is chosen", () => {
    const provider = createProvider({
      provider: null,
      model: null,
      budgetCap: null,
      budgetCapCurrency: null,
      creditsPerSuggestion: 1,
    });
    assert.equal(provider.kind, "development-stub");
    assert.equal(provider.name, "development-stub");
  });

  it("is marked DEVELOPMENT STUB ONLY in source and makes no network call", () => {
    const source = readFileSync(`${ROOT}packages/ai/src/provider.ts`, "utf8");
    assert.ok(source.includes("DEVELOPMENT STUB ONLY"));
    assert.ok(!source.includes("fetch("));
    assert.ok(!source.includes("api.openai"));
    assert.ok(!source.includes("api.anthropic"));
  });

  it("throws for a named provider with no real implementation", () => {
    assert.throws(
      () =>
        createProvider({
          provider: "example-provider",
          model: null,
          budgetCap: null,
          budgetCapCurrency: null,
          creditsPerSuggestion: 1,
        }),
      /not configured/,
    );
  });

  it("holds provider name, model, and budget cap as null until Ali decides", () => {
    assert.equal(providerConfig.provider, null);
    assert.equal(providerConfig.model, null);
    assert.equal(providerConfig.budgetCap, null);
    assert.equal(promptsConfig.provider.name, null);
    assert.equal(promptsConfig.provider.budget_cap, null);
  });
});

describe("generation from verified facts only", () => {
  it("generates a title within the platform limit, with no price", async () => {
    const result = await generateTitle({
      kind: "title",
      facts,
      limits,
      provider: stub,
      prompt: getPrompt(prompts, "title"),
      credits: creditsOk,
      providerConfig,
      nichePack: null,
    });
    assert.equal(result.status, "suggestion");
    assert.ok(result.suggestion);
    assert.ok([...result.suggestion.text].length <= limits.titleMaxChars);
    assert.ok(result.suggestion.text.includes(facts.productName));
    assert.ok(result.suggestion.text.includes("Google Sheets"));
    assert.ok(!result.suggestion.text.includes("$"));
  });

  it("generates a description from verified facts, with no invented price or review", async () => {
    const result = await generateDescription({
      kind: "description",
      facts,
      limits,
      provider: stub,
      prompt: getPrompt(prompts, "description"),
      credits: creditsOk,
      providerConfig,
      nichePack: null,
    });
    assert.equal(result.status, "suggestion");
    assert.ok(result.suggestion.text.includes(facts.productName));
    assert.ok(result.suggestion.text.includes("Google Sheets"));
    assert.ok(result.suggestion.text.includes("12 tabs"));
    assert.ok(result.suggestion.text.includes("Master To-Do List"));
    assert.ok(!result.suggestion.text.includes("$"));
    assert.ok(!/reviews?/i.test(result.suggestion.text));
  });

  it("generates tags from the seller's own product words, within the limits", async () => {
    const result = await generateTags({
      kind: "tags",
      facts,
      limits,
      provider: stub,
      prompt: getPrompt(prompts, "tags"),
      credits: creditsOk,
      providerConfig,
      nichePack: null,
    });
    assert.equal(result.status, "suggestion");
    const tags = result.suggestion.tags;
    assert.ok(tags.length >= 1);
    assert.ok(tags.length <= limits.tagMaxCount);
    for (const tag of tags) {
      assert.ok([...tag].length <= limits.tagMaxChars, tag);
      const flagged = flagKeyword(tag, facts, limits);
      for (const reason of flagged.reasons) {
        assert.ok(!reason.startsWith("Keyword states"), tag + ": " + reason);
      }
    }
  });

  it("generates a checklist from verified facts only", async () => {
    const result = await generateChecklist({
      kind: "checklist",
      facts,
      limits,
      provider: stub,
      prompt: getPrompt(prompts, "checklist"),
      credits: creditsOk,
      providerConfig,
      nichePack: null,
    });
    assert.equal(result.status, "suggestion");
    const text = result.suggestion.checklist.join(" ");
    assert.ok(text.includes("12 tabs"));
    assert.ok(text.includes("Google Sheets"));
    assert.ok(!text.includes("$"));
  });
});

describe("guardrails reject invented facts", () => {
  it("rejects an invented tab count", () => {
    const result = validateSuggestion(
      facts,
      suggestion("title", "Maid of Honor Planner, 14 tabs, Google Sheets"),
      limits,
    );
    assert.equal(result.ok, false);
    assert.ok(result.violations.some((item) => item.includes("14 tabs")));
  });

  it("rejects an invented price", () => {
    const result = validateSuggestion(
      facts,
      suggestion("description", "Maid of Honor Planner in Google Sheets for $25.00."),
      limits,
    );
    assert.equal(result.ok, false);
    assert.ok(result.violations.some((item) => item.includes("price")));
  });

  it("rejects an invented format", () => {
    const result = validateSuggestion(
      facts,
      suggestion("description", "Maid of Honor Planner in Excel, 12 tabs."),
      limits,
    );
    assert.equal(result.ok, false);
    assert.ok(result.violations.some((item) => item.includes("Excel")));
  });

  it("rejects an invented review", () => {
    const result = validateSuggestion(
      facts,
      suggestion("description", "Maid of Honor Planner in Google Sheets. 500 happy customers love it."),
      limits,
    );
    assert.equal(result.ok, false);
    assert.ok(result.violations.some((item) => item.includes("review") || item.includes("social proof")));
  });

  it("rejects a claim that is not a verified fact", () => {
    const problems = checkClaimText("Includes a printable meal planner", facts);
    assert.ok(problems.length > 0);
    assert.deepEqual(checkClaimText("Google Sheets only", facts), []);
    assert.deepEqual(checkClaimText("12 tabs", facts), []);
  });

  it("rejects a title over the platform limit", () => {
    const longTitle = "Maid of Honor Planner, Google Sheets, 12 tabs, Master To-Do List, Master Budget and Split Calculator, Itinerary and Event Schedules, MOH Speech Builder, Mobile Quick-Expense Log";
    assert.ok([...longTitle].length > limits.titleMaxChars);
    const result = validateSuggestion(facts, suggestion("title", longTitle), limits);
    assert.equal(result.ok, false);
    assert.ok(result.violations.some((item) => item.includes("characters")));
  });

  it("rejects a tag over the tag length", () => {
    const result = validateSuggestion(
      facts,
      suggestion("tags", null, { tags: ["master budget and split calculator"] }),
      limits,
    );
    assert.equal(result.ok, false);
    assert.ok(result.violations.some((item) => item.includes("master budget and split calculator")));
  });

  it("rejects more than the platform tag count", () => {
    const tags = [
      "maid of honor", "honor planner", "budget planner", "wedding planner",
      "bridal planner", "event planner", "google sheets", "sheets planner",
      "digital planner", "instant download", "to do list", "budget tracker",
      "speech builder", "itinerary planner",
    ];
    assert.equal(tags.length, 14);
    const result = validateSuggestion(facts, suggestion("tags", null, { tags }), limits);
    assert.equal(result.ok, false);
    assert.ok(result.violations.some((item) => item.includes("Too many tags")));
  });

  it("shortens an over limit title at a word boundary, and rejects an invented title", () => {
    const longTitle = "Maid of Honor Planner, Google Sheets, 12 tabs, Master To-Do List, Master Budget and Split Calculator, Itinerary and Event Schedules, MOH Speech Builder, Mobile Quick-Expense Log";
    const shortened = improveTitle(longTitle, facts, limits, getPrompt(prompts, "title"));
    assert.equal(shortened.status, "suggestion");
    assert.ok([...shortened.suggestion.text].length <= limits.titleMaxChars);
    const invented = improveTitle("Maid of Honor Planner in Excel, 14 tabs", facts, limits, getPrompt(prompts, "title"));
    assert.equal(invented.status, "rejected");
  });
});

describe("missing information prompts instead of inventing", () => {
  it("asks for the tab count instead of inventing one", async () => {
    const noTabFacts = { ...facts, tabCount: null };
    const result = await generateChecklist({
      kind: "checklist",
      facts: noTabFacts,
      limits,
      provider: stub,
      prompt: getPrompt(prompts, "checklist"),
      credits: creditsOk,
      providerConfig,
      nichePack: null,
    });
    assert.equal(result.status, "needs_info");
    assert.equal(result.suggestion, null);
    assert.ok(result.missingInfo.some((item) => item.field === "tab_count"));
  });

  it("asks for features instead of inventing them", async () => {
    const noFeatureFacts = { ...facts, features: [], claims: [] };
    const result = await generateDescription({
      kind: "description",
      facts: noFeatureFacts,
      limits,
      provider: stub,
      prompt: getPrompt(prompts, "description"),
      credits: creditsOk,
      providerConfig,
      nichePack: null,
    });
    assert.equal(result.status, "needs_info");
    assert.ok(result.missingInfo.some((item) => item.field === "features"));
  });
});

describe("keywords that add a false claim are flagged", () => {
  it("flags a false format keyword", () => {
    const flagged = flagKeyword("excel planner", facts, limits);
    assert.ok(flagged.reasons.some((reason) => reason.includes("Excel")));
    assert.equal(checkKeyword("excel planner", facts, limits).flagged, true);
  });

  it("flags a use the product does not have", () => {
    const flagged = flagKeyword("meal planner", facts, limits);
    assert.ok(flagged.reasons.some((reason) => reason.includes("'meal'")));
  });

  it("does not flag keywords built from the seller's own product words", () => {
    // "maid of honor planner" is 21 characters, over the 20 character tag
    // limit, so the guardrail rightly flags its length. In limit keywords
    // from the seller's own words pass clean.
    assert.deepEqual(flagKeyword("maid of honor", facts, limits).reasons, []);
    assert.deepEqual(flagKeyword("budget planner", facts, limits).reasons, []);
    assert.deepEqual(flagKeyword("honor planner", facts, limits).reasons, []);
  });
});

describe("credit limits", () => {
  it("leaves the monthly credit count null in plans config until Ali sets it", () => {
    assert.equal(getCreditLimit("free", plans), null);
    assert.equal(getCreditLimit("premium", plans), null);
    assert.equal(getTrialCreditAllowance(plans), null);
  });

  it("shows a clear not set message and blocks generation while the limit is null", async () => {
    assert.equal(
      formatCreditDisplay({ used: 0, limit: null, planSlug: "free" }),
      "AI credit limit not set in admin yet.",
    );
    assert.equal(canUseCredit({ used: 0, limit: null, planSlug: "free" }).allowed, false);
    const result = await generateTitle({
      kind: "title",
      facts,
      limits,
      provider: stub,
      prompt: getPrompt(prompts, "title"),
      credits: { used: 0, limit: null, planSlug: "free" },
      providerConfig,
      nichePack: null,
    });
    assert.equal(result.status, "needs_config");
  });

  it("blocks generation when the stated limit is reached, and allows it below the limit", async () => {
    assert.equal(canUseCredit({ used: 10, limit: 10, planSlug: "free" }).allowed, false);
    assert.equal(creditsRemaining({ used: 3, limit: 10, planSlug: "free" }), 7);
    assert.equal(
      formatCreditDisplay({ used: 3, limit: 10, planSlug: "free" }),
      "AI credits used this month: 3 of 10.",
    );
    const blocked = await generateTitle({
      kind: "title",
      facts,
      limits,
      provider: stub,
      prompt: getPrompt(prompts, "title"),
      credits: { used: 10, limit: 10, planSlug: "free" },
      providerConfig,
      nichePack: null,
    });
    assert.equal(blocked.status, "credit_limit_reached");
  });
});

describe("prompt management", () => {
  it("has a published versioned prompt for every purpose, with preview and rollback fields", () => {
    for (const purpose of ["title", "description", "tags", "checklist", "niche_tailoring"]) {
      const prompt = getPrompt(prompts, purpose);
      assert.ok(prompt, purpose);
      assert.ok(prompt.version >= 1);
      assert.equal(prompt.status, "published");
      assert.ok(prompt.promptText.trim() !== "");
      assert.ok(prompt.preview.trim() !== "");
      assert.ok(prompt.rollbackToVersion === null || prompt.rollbackToVersion < prompt.version);
    }
    assert.deepEqual(validatePrompts(prompts), []);
  });

  it("holds one credit per suggestion in config, admin editable", () => {
    assert.equal(promptsConfig.credits_per_suggestion, 1);
  });
});

describe("niche packs", () => {
  it("ships exactly the 3 version 1 packs, none ready for AI generation", () => {
    assert.equal(nichePacks.length, 3);
    assert.deepEqual(
      nichePacks.map((pack) => pack.slug),
      ["wedding-and-events", "personal-finance", "small-business-planners"],
    );
    for (const pack of nichePacks) {
      assert.equal(pack.aiGenerationReady, false);
      assert.equal(pack.needsRealProductTesting, true);
      assert.equal(pack.reviewStatus, "needs_review");
      assert.ok(pack.lastVerifiedDate);
      assert.ok(pack.sourceNotes);
      assert.ok(nichePackNeedsReview(pack));
    }
    assert.deepEqual(checkNichePackSet(nichePacks), []);
  });

  it("gives each pack its own tone guidance, template order, and mockup suitability", () => {
    const tones = new Set(nichePacks.map((pack) => pack.toneGuidance));
    assert.equal(tones.size, 3);
    const orders = new Set(nichePacks.map((pack) => pack.templateRoles.join(",")));
    assert.equal(orders.size, 3);
    for (const pack of nichePacks) {
      assert.ok(pack.templateRoles.length > 0);
      assert.ok(pack.mockupKinds.length > 0);
      assert.deepEqual(pack.keywordStartingPoints, []);
    }
  });

  it("refuses AI generation and tailoring while a pack is not ready", async () => {
    const wedding = getNichePack(nichePacks, "wedding-and-events");
    assert.ok(wedding);
    const result = await generateTitle({
      kind: "title",
      facts,
      limits,
      provider: stub,
      prompt: getPrompt(prompts, "title"),
      credits: creditsOk,
      providerConfig,
      nichePack: wedding,
    });
    assert.equal(result.status, "not_ready");
    const made = await generateTitle({
      kind: "title",
      facts,
      limits,
      provider: stub,
      prompt: getPrompt(prompts, "title"),
      credits: creditsOk,
      providerConfig,
      nichePack: null,
    });
    const tailored = tailorForNiche(made.suggestion, facts, wedding, limits);
    assert.equal(tailored.status, "not_ready");
  });

  it("marks a pack stale only when its verified date is older than the interval", () => {
    const wedding = getNichePack(nichePacks, "wedding-and-events");
    assert.equal(isPackStale(wedding, "2026-11-07", 30), false);
    assert.equal(isPackStale(wedding, "2026-11-07", 1), true);
    assert.equal(isPackStale({ ...wedding, lastVerifiedDate: null }, "2026-11-07", 30), true);
  });

  it("carries a review checklist of 8 items per pack", () => {
    for (const pack of nichePacks) {
      assert.equal(reviewChecklistFor(pack).length, 8);
    }
  });
});

describe("honest labels", () => {
  it("labels AI layouts as templates, not real product photos", () => {
    assert.ok(aiLayoutLabel().includes("template, not a real product photo"));
    assert.ok(mockupFrameLabel().includes("not a real product screenshot"));
    assert.ok(suggestionLabel().includes("Suggestion, not a final fact"));
  });
});

describe("no em dash or en dash in files produced by this work", () => {
  it("finds no em dash or en dash in the AI package, configs, docs, tests, or AI UI", () => {
    const emDash = "\u2014";
    const enDash = "\u2013";
    const files = [
      ...readdirSync(`${ROOT}packages/ai/src`).map((name) => `${ROOT}packages/ai/src/${name}`),
      `${ROOT}config/copy-prompts.json`,
      `${ROOT}config/niche-packs.json`,
      `${ROOT}docs/ai-copy.md`,
      `${ROOT}tests/ai.test.mjs`,
      `${ROOT}apps/web/src/components/ai/AiSuggestions.tsx`,
      `${ROOT}apps/web/src/components/ai/index.ts`,
    ];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      assert.ok(!text.includes(emDash), file);
      assert.ok(!text.includes(enDash), file);
    }
  });
});
