# Admin panel, Listing Photos Generator

Status: Phase 2, Wave 2. Built 2026-11-07, local files only, no GitHub push.
No live database is connected yet. The admin panel in this build runs on
an in memory store for local development, and its pages show honest empty
states where live data does not exist yet. Nothing here writes to a live
database, and no admin change in this build is persisted. Production
persistence is through the Prisma adapters (packages/auth/src/prisma-provider.ts
and packages/builder/src/prisma-pack-store.ts) once DATABASE_URL is set.

Style rule for this file: no em dashes and no en dashes anywhere.

## Where it lives

- Logic: packages/admin/src/ (versioning, feature flags, governance,
  licence gate, entitlements, trial configuration, analytics, export
  monitoring, root config reader, in memory store). Browser safe entry
  point: packages/admin/src/browser.ts. Server only entry point:
  packages/admin/src/index.ts (also exports loadRootConfig).
- Pages: apps/web/src/app/admin/ (overview, users, templates, mockups,
  prompts, niche, platform, plans, subscriptions, analytics, exports,
  flags, logs). Client interactions:
  apps/web/src/components/admin/AdminClient.tsx.
- Server data: apps/web/src/lib/admin-data.ts reads the real template
  and mockup definitions and the root config at request time.

## What the admin can do

- User management: list users (empty until a live database is
  connected), change a role, with every change logged. Admin access to
  a user pack needs a recorded support reason.
- Template management: the 10 version 1 templates, from the template
  engine definitions. Every change creates a new version, with preview,
  publish, and rollback. A published template must not change silently
  for existing sellers without a version note.
- Mockup management: the 5 starter mockups, from the mockup library
  definitions, plus the easy add flow: upload a frame, mark the screen
  area, set allowed orientations and niche packs, preview with a real
  product render, then enable, no code change and no deploy, plus
  duplicate, edit, hide, and rollback.
- AI prompt management: title, description, tags, and checklist
  prompts, versioned. No prompt text is set yet: AI copy help is a
  parallel Wave 2 worker, and prompts are managed here once that work
  lands. No AI provider is chosen yet.
- Niche pack management: the 3 version 1 niche packs, each showing
  source, last verified date, and reviewer. Out of date packs are
  flagged for review.
- Platform pack management: the Etsy digital v1 pack, versioned, from
  verified rules only (check date 2026-11-05). eBay and Amazon packs do
  not exist yet.
- Feature controls: turn a template, mockup, niche pack, platform
  pack, or AI feature on or off per plan or globally, without a
  deployment.
- Free and premium entitlements and trial configuration: plan limits
  and trial rules from config/plans.json. Premium price is not set.
  The trial starting default is 7 days, no card, one per account.
- Subscription management: no subscriptions yet. Stripe is on hold, no
  Stripe product exists, no payment has been taken.
- AI usage analytics: counts only, aggregated, without reading
  personal product content. No events recorded yet, so all counts are
  zero.
- Export monitoring: export success rate, failure rate by template,
  mockup, and format, and average export time, without logging product
  content. No exports recorded yet.
- System logs: no entries yet. Admin changes, logins, subscription
  changes, trial starts, and export failures are logged with time,
  actor, and action, without product content or secrets.

## Rules enforced in code

- Versioning (packages/admin/src/versioning.ts): publish requires a
  version note. Rollback creates a new version from an older snapshot,
  never overwriting history. Only one published version per item.
- Licence gate (packages/admin/src/licence.ts): a frame with no
  licence record must not be enabled. Each licensed frame shows
  source, licence type, licence date, and where the licence is stored.
  The crisp render test must also pass before enabling.
- Governance (packages/admin/src/governance.ts): a pack is flagged
  when its source, reviewer, or last verified date is missing, or
  when the last verified date is older than the review interval the
  admin sets.
- Entitlements (packages/admin/src/entitlements.ts): a price must not
  be negative, a price needs a currency, maximum listing packs must be
  at least 1 or null, trial duration must be at least 1 day.
- Analytics (packages/admin/src/analytics.ts): events carry ids and
  counts only. No product content is read for analytics.

## Single source of truth

Admin reads the root config at build time
(packages/admin/src/root-config.ts): config/site-copy.json,
config/plans.json, config/niche-packs.json, and
config/platform-packs/*.json. It never reads the builder standalone
mirror in packages/builder/src/config.ts. If the mirror and the root
disagree, the root wins and the mirror must be updated.

## Billing persistence (Prisma store)

Billing records are persisted through
`packages/billing/src/prisma-billing-store.ts`, not held only in
session or in memory. `PrismaBillingStore` writes subscriptions,
trials, entitlements, AI credit ledger rows, and AI usage logs
through the existing Prisma models Subscription, Trial,
UserEntitlement, AICreditLedger, and AIUsageLog. `createBillingStore`
takes a Prisma client for real persistence, or null for the in
memory store used in tests and local development.

Two mapping gaps are stated in that file and are not hidden:
SubscriptionState.cancelled_at and card_authorized have no column,
and TrialState.card_taken and the per trial usage counters have no
column, so they are not persisted. There is also no RefundRequest
model in `prisma/schema.prisma`, so a refund request has no Prisma
table: the store holds it in its log, lists it back, and says so in
its result. A dedicated refund table needs a schema change, which is
a coordinator decision.

## Email hook (no provider yet)

Renewal reminders and account emails are records first, and sending
is a hook in `packages/billing/src/email-hook.ts` that does nothing
without configured provider credentials. No provider is chosen, no
email is sent, and no credential value appears in code, config, or
logs. The exact config a later provider needs, from env only:

- Provider name: `EMAIL_PROVIDER`, or null when no provider is
  chosen.
- From address: `EMAIL_FROM_ADDRESS`, or null when not set.
- API key: the env var named `EMAIL_API_KEY`. Only the var name is
  recorded. The value is never returned, logged, or written to a
  file. The config records only whether the var is set.

Until a provider name, a from address, and the API key are all set,
every send attempt returns sent false with reason
`no_email_provider_configured`, and the reminder record stays
unsent so it can be retried. When all three are set but no provider
implementation is wired in, the attempt returns sent false with
reason `email_provider_not_implemented`. The provider send step is a
separate wiring job.

## Feature decisions (three flags, safe defaults)

Three open decisions are held as admin configurable flags in
`config/feature-decisions.json`, with the safe current default on
each until Saeed decides otherwise. The reader is
`packages/billing/src/feature-decisions.ts`.

- `reconciliation_mode`: `flag_only` (default) or `auto_fix`.
  Flag only means a reconciliation mismatch is flagged for the
  seller to fix.
- `trial_shape`: `per_account_7_days_no_card` (default) or
  `per_listing_pack`. The default matches the trial in
  `config/plans.json`.
- `mockup_pricing`: `follow_plan_entitlements` (default) or
  `free_for_all`. The default matches the mockup gate in the
  billing entitlements: basic mockups on Free, full library on
  Premium.

Changing a flag value in that file records the choice; it does not
by itself build the alternative behaviour. Each alternative is a
separate build. The exact decision Saeed must make for each flag is
in `docs/monetization.md` section 10.

Note: these three flags live in config and are not yet wired to the
feature flags surface in `packages/admin/src/feature-flags.ts`,
which turns templates, mockups, niche packs, platform packs, and AI
features on or off by target kind and scope. Wiring them into that
surface needs a target kind for decision flags, which is an admin
worker job, not done here.

## Tests

packages/admin/src/__tests__/admin.test.ts, 7 tests, node:test:
versioning, feature flags, governance, licence gate, entitlements,
analytics and export monitoring, and the root config read. Run with
npm test --prefix packages/admin.

## Still open

- No live database, so admin changes are not persisted and user,
  subscription, log, and analytics lists are empty.
- No admin authentication gate on the /admin routes yet: the routes
  are reachable by any visitor in this local build. Before any
  deployment, gate /admin behind the admin role (packages/auth
  permissions, isAdmin) and test that a non admin cannot open it.
- AI prompts have no prompt text yet, pending the AI worker.
- Billing and subscription management are placeholders until a
  payment provider is chosen by Ali.
