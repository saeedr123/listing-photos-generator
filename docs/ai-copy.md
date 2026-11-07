# AI Copy Help

Status: Phase 2, Wave 2. Built 2026-11-07, local files only, no GitHub push.
Version 1 is Etsy only, digital products only, English only. No real AI
provider is connected. No spending. No live site change.

## What it does

AI helps with listing copy only: titles, descriptions, tags, and checklist
wording. AI never invents product content. Every suggestion is built only
from the seller's verified product facts, and every suggestion is shown as
a suggestion, editable, accept or reject, never as a final fact.

AI also helps with layout and composition only through templates. Any AI
assisted layout is labelled as a template, not as a real product photo.
No AI photos pretending to be real screenshots. No AI generated fake
product screenshot, ever.

## Provider: development stub only

The provider module lives in `packages/ai/src/provider.ts`. It is provider
agnostic: the copy engine calls one interface, `AiProvider`, so a real
provider can be swapped in later without rewriting the copy engine.

Version 1 ships only the development stub, marked DEVELOPMENT STUB ONLY
in the file. The stub builds suggestions only from the verified facts in
the request, in memory, with no network call, no API key, and no spending.
It must never be presented as a real AI provider.

Provider choice and budget cap are open decisions for Ali. The config
holds the provider name and the credit cap as null until he decides them.
`createProvider` throws instead of silently falling back to the stub when
a named provider has no real implementation, so the tool never pretends
to be a provider it is not.

Config: `config/copy-prompts.json`, `provider` section. Current values:
provider name null, model null, budget cap null, budget cap currency null.

## How generation works

`packages/ai/src/copy.ts`, function `generateCopy`, in this order:

1. Credit config and balance, from `config/plans.json`. When the monthly
   limit is null, generation stops with status `needs_config` and the
   message "AI credit limit not set in admin yet." When the limit is
   reached, generation stops with status `credit_limit_reached`.
2. Niche pack readiness, when a niche pack is picked. When the pack has
   `ai_generation_ready` false, generation stops with status `not_ready`.
   All 3 version 1 packs are not ready, so AI generation for a niche pack
   is refused until its review checklist passes. See the niche pack
   section below.
3. Missing information. When a needed fact is missing, generation stops
   with status `needs_info` and a clear missing info prompt, instead of
   filling the gap with invented text. The prompts ask for the product
   name, the format, the features, or the tab count, in plain words.
4. Provider call. In version 1 this is the development stub only.
5. Guardrails. A suggestion that fails the guardrails is rejected with
   status `rejected` and a list of violations. It is never shown as
   usable copy.

`improveTitle` checks a title the seller wrote: a title that invents a
fact is rejected, a title over the platform limit is shortened at a word
boundary, and a clean title is returned unchanged as a suggestion. No
price is ever added to a title.

## Guardrails

`packages/ai/src/guardrails.ts`. Checked mechanically from the verified
facts:

- Tab count numbers. A stated count that differs from the verified count,
  or any stated count when no count is confirmed, is a violation.
- Price amounts. A stated price that differs from a confirmed price, or
  any stated price when no price is confirmed, is a violation.
- Format tokens. A stated format that differs from the verified format,
  for example calling a Sheets product an Excel product, is a violation.
- Review and social proof tokens. Any review, customer, rating, star, or
  best seller wording is a violation, because it is not a verified
  product fact.
- Title length, tag count, tag length, and tag start characters, using
  the limits from the active platform pack, never hard coded values.
- Explicit claim entries, through `checkClaimText`. A claim passes only
  when it matches a verified claim or feature, or when it is a tab count
  or format statement that agrees with the verified facts.
- Keywords, through `flagKeyword`. A keyword is flagged when it states a
  wrong tab count, format, price, or review, when it uses a word that is
  not in the seller's own product words, when it is over the tag length,
  or when it starts with an apostrophe or a hyphen. A flagged keyword is
  held for the seller to confirm, never added silently.

What the guardrails do not claim: they check what can be checked
mechanically from the verified facts. They do not claim to catch every
paraphrased invention in free prose. Human review and the reconciliation
check before export are still required.

## Limits come from config, never from code

Title length, tag count, and tag length come from
`config/platform-packs/etsy.v1.json` at generation time, through
`loadEtsyLimits`. The copy engine receives them as `PlatformLimits`.
No platform limit is hard coded in `packages/ai/src`.

## Prompt management

Prompts live in `config/copy-prompts.json`, versioned, changeable without
code changes. Each prompt carries:

- `slug` and `purpose`: title, description, tags, checklist, niche_tailoring.
- `version`: increments on every change.
- `status`: draft, preview, published, retired. Only one published
  version per purpose is used.
- `prompt_text`: the prompt. It instructs the provider to use only the
  verified facts supplied with the request, to ask for missing
  information, and never to invent a fact. Limits are supplied with the
  request, not written into the prompt text as fixed numbers.
- `preview`: a short preview of what the prompt does, with placeholder
  tokens only, for example `[product name]`, `[format]`, `[tab count]`.
- `rollback_to_version`: the earlier version to restore on rollback, or
  null when there is no earlier version. Rollback creates a new version
  from the old text, it never overwrites history.
- `previous_version` and `change_note`: what changed and why.

To change a prompt: edit the config file in admin, set the new version
with `status` preview, preview it against a real test listing, publish
it, and keep the old version as the rollback target. Helpers are in
`packages/ai/src/prompts.ts`: `getPrompt`, `getPromptVersion`,
`rollbackTarget`, `listPromptVersions`, `validatePrompts`.

## Credit limits

Credits are a monthly count per plan, from `config/plans.json`. The
dashboard shows the count plainly through `formatCreditDisplay` in
`packages/ai/src/credits.ts`:

- When the limit is set: "AI credits used this month: X of Y."
- When the limit is not set: "AI credit limit not set in admin yet."

Current values in `config/plans.json` are null for both plans, because
Ali has not decided the monthly credit count. A null limit means not
decided, never zero and never a hidden amount. Generation is blocked
while the limit is null, so no seller is promised credits that do not
exist. The cost per suggestion is `credits_per_suggestion` in
`config/copy-prompts.json`, currently 1, admin editable. This is a usage
count, not a price.

Helpers: `getCreditLimit`, `getTrialCreditAllowance`, `canUseCredit`,
`creditsRemaining`, `formatCreditDisplay`.

## Niche packs

Version 1 ships exactly 3 packs, in `config/niche-packs.json`, version 2:

1. Wedding and events (`wedding-and-events`)
2. Personal finance (`personal-finance`)
3. Small business planners (`small-business-planners`)

Each pack carries: niche specific template suggestions in its own order,
copy tone guidance, keyword starting points (empty in config, because
starting points come only from the seller's own product words at
generation time), mockup suitability with a note per mockup kind, last
verified date, source notes, status, `ai_generation_ready`, and
`needs_real_product_testing`.

All 3 packs have `ai_generation_ready` false, `needs_real_product_testing`
true, `review_status` needs_review, and last verified date 2026-11-05.
Each pack is marked as needing review, never silently shown as current.

### Review checklist before a pack is launched for AI generation

Every item must pass against a real product in that niche before
`ai_generation_ready` is set to true in admin. The checklist is also
returned by `reviewChecklistFor` in `packages/ai/src/niche.ts`:

1. Sample title reviewed for grammar against a real product in the niche.
2. Sample description reviewed for tone against a real product in the niche.
3. Sample tags reviewed for accuracy against a real product in the niche.
4. Sample output states the real tab count, format, and price only, with
   no invented fact.
5. Sample output adds no feature, tab count, format, price, or claim the
   seller does not have.
6. Template suggestions fit a real product in the niche.
7. Mockup suitability checked with a real product render in the niche.
8. Last verified date and source notes updated in admin for the pack.

A pack that is out of date is marked as needing review. `isPackStale`
checks a pack against a reference date and a maximum age in days
supplied by the caller, because no review interval is decided in code.

### Expansion rule

Do not add niches by copying another pack and changing the name. A new
niche is added only after its pack is researched, sourced, and tested
with a real product in that niche. `checkNichePackSet` enforces this in
code: exactly 3 packs in version 1, unique slugs, required fields on
every pack, and distinct tone guidance and distinct template order per
pack. English only in version 1.

### Niche tailoring

`tailorForNiche` in `packages/ai/src/copy.ts` applies the pack tone
guidance and highlights relevant features from the seller's own product.
It never adds a feature, a tab count, a format, a price, or a claim the
seller does not have. When the pack is not ready for AI generation, it
refuses tailoring outright with status `not_ready`.

## Interface

`apps/web/src/components/ai/AiSuggestions.tsx` is the AI suggestion UI
in the builder copy step. It shows:

- The monthly credit count, from `config/plans.json`. While the limit is
  null it states plainly that the limit is not set in admin yet, and
  generation stays blocked.
- The niche pack readiness. When the picked pack is not ready for AI
  generation, it says so and does not generate.
- One generate action per kind: title, description, tags, checklist.
- Each suggestion with its label: "Suggestion, not a final fact. Edit
  it, accept it, or reject it." The seller edits the suggestion in the
  field before accepting. Accept runs the guardrails again on the edited
  text and blocks the accept when a violation is found. Reject discards
  the suggestion.
- Missing info prompts, in plain words, when a fact is missing.
- The AI layout label: "AI assisted layout. This is a template, not a
  real product photo." Mockups carry the label: "Mockup frame. This is
  a presentation frame, not a real product screenshot."

The component imports the browser safe entry point,
`@listing-photos-generator/ai/browser`, so no Node API reaches the
client bundle. It reads `config/copy-prompts.json` and
`config/plans.json` directly, the same way `apps/web/src/lib/config.ts`
reads the other root config files.

## Seller data

Uploaded product files are seller data, never training data. They are
deletable with the listing pack, through the account deletion flow in
the builder. AI logs for an account are deleted with the account. No
product text is stored in analytics: AI usage is counted only, by
suggestion accepted or rejected, never by reading the copy.

## Files

- `packages/ai/src/types.ts`: VerifiedFacts, PlatformLimits, AiProviderConfig, CreditState, AiSuggestion, GuardrailResult, CopyPrompt, NichePackAi.
- `packages/ai/src/guardrails.ts`: tab, price, format, review, title, tag, claim, and keyword checks, missing info prompts, labels.
- `packages/ai/src/provider.ts`: AiProvider interface and DevelopmentStubProvider, marked DEVELOPMENT STUB ONLY.
- `packages/ai/src/copy.ts`: generateTitle, generateDescription, generateTags, generateChecklist, improveTitle, tailorForNiche, checkKeyword.
- `packages/ai/src/credits.ts`: credit limit, allowance, remaining, and dashboard wording.
- `packages/ai/src/niche.ts`: niche pack lookup, review status, stale check, review checklist, pack set validation.
- `packages/ai/src/prompts.ts`: prompt lookup, version, and rollback helpers.
- `packages/ai/src/loaders.ts`: Node only loaders for the root config files.
- `packages/ai/src/browser.ts`: browser safe entry point, pure modules only.
- `packages/ai/src/index.ts`: main entry point, browser API plus loaders.
- `config/copy-prompts.json`: versioned prompts, provider null, credits per suggestion 1.
- `config/niche-packs.json`: the 3 version 1 packs, all not ready for AI generation.
- `apps/web/src/components/ai/AiSuggestions.tsx`: builder AI suggestion UI.
- `tests/ai.test.mjs`: guardrail, provider, prompt, credit, and niche pack tests.

## Tests

Run `node --test tests/ai.test.mjs` from the repo root. The suite covers:
invented tab count rejected, invented price rejected, invented format
rejected, invented review rejected, missing info prompts instead of
inventing, keyword adding a false claim flagged, title over the platform
limit rejected, tag over the tag length rejected, more than the platform
tag count rejected, stub provider identity, provider config null, prompt
versioning and rollback fields, credit display with a null limit, niche
pack set validation, niche tailoring refused while not ready, and no em
dash or en dash in any file this work produced.

## What is still open

- AI provider choice and budget cap. Open decision for Ali. No real
  provider call is made until he chooses one.
- Monthly AI credit count per plan. Null in `config/plans.json` until
  Ali sets it. Generation stays blocked while it is null.
- Niche pack AI launch. All 3 packs need sample outputs reviewed
  against a real product in each niche before `ai_generation_ready`
  is set to true.
- Test product facts. The Maid of Honor Planner facts used in tests
  (12 tabs, Google Sheets format) come from
  `tests/fixtures/maid-of-honor-facts.json`. Those figures are task
  supplied, not independently rechecked against a live Etsy listing.
  Reconfirm them against the real product before they are used in a
  published pack.
