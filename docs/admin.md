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
