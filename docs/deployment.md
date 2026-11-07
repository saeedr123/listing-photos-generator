# Deployment preparation, Listing Photos Generator

Status: Phase 2, Wave 2. Prepared 2026-11-07, local files only, no
GitHub push. Nothing here is deployed. No hosting provider is chosen,
no spending, no live site, no domain purchase. Domain is on hold, do
not check domain availability and do not buy anything until Ali
reopens it.

Style rule for this file: no em dashes and no en dashes anywhere.

## Production hosting, placeholder

No hosting provider is chosen. No database provider is chosen. No
object storage provider is chosen. Those are open decisions for Ali.
Placeholders only:

- Web app: a Node hosting provider that runs Next.js 14, with
  environment variables from .env.example, no secrets in code.
- Database: a hosted PostgreSQL service, or a containerized
  Postgres, not a local Postgres install. Apply the Prisma migration
  prisma/migrations/0001_init/migration.sql with a real DATABASE_URL,
  on a test database first, before any production database.
- Object storage: uploads, renders, and exports live in object
  storage with signed access, not as blobs in the database, with
  deletion on pack deletion where the user requests it.
- Domain: on hold. Use placeholder domain configuration only.

## Environment variables

See .env.example. Every required variable is listed there, with no
real secrets in the repository. Stripe keys and AI keys are empty
placeholders until Ali decides the provider, price, and budget.

## Backups

- Database: take a backup before every migration and before every
  release. Keep the backup until the release is verified on the live
  site. The backup retention schedule is an admin decision, not yet
  set. Record it here when Ali sets it.
- Object storage: exports and uploads are seller data. A deleted
  account must delete its uploads, renders, exports, and AI logs,
  with a completion record. Backups must expire on a stated schedule;
  that schedule is not set yet.
- Code: the GitHub repository saeedr123/listing-photos-generator is
  the single source of truth. Releases are tagged, for example
  v1.0.0 for the first commercial core. Do not deploy from a manual
  file drop.

## Monitoring

- Health: the web app responds on / and /dashboard. Check those
  after every deploy, as a logged out visitor, after purging cache.
- Export monitoring (admin, /admin/exports): export success rate,
  failure rate by template, mockup, and format, and average export
  time, without logging product content. An export failure must show
  a plain language error and preserve the seller listing pack.
- Usage analytics (admin, /admin/analytics): signups, trial starts,
  trial conversions, cancellations, packs created, exports, AI
  credits used, template use, mockup use, export success, and churn
  counts, aggregated and privacy conscious. Do not track product
  content, product text, or personal details for marketing analytics.
- Logs (admin, /admin/logs): admin changes, logins, subscription
  changes, trial starts, and export failures, with time, actor, and
  action, without product content or secrets.
- Uptime and error alerting: no provider is chosen yet. Choose one
  before launch and record it here. No alerting is claimed until it
  is configured and tested.

## Terms, privacy policy, and refund policy, placeholders

The wording below is a placeholder outline only. It is NOT final
legal wording. Final wording needs Ali and a Czech legal check
before launch. Do not publish this wording as if it were approved.

### Terms, placeholder outline

- What the product does: turns a real digital product into a
  listing pack (images, title, description, tags, checklist) for
  the seller to upload to Etsy themselves. No auto publishing.
- What the seller must do: upload only their own real product,
  confirm the facts, and check the pack before publishing it.
- Free and premium: one complete pack free, premium as configured
  in admin. Premium price is not set yet and must be published in
  plain words before any payment is taken.
- Trial: 7 days, no card, one per account, starting default,
  configurable in admin. At trial end the user downgrades to Free
  automatically, keeps viewing and downloading packs they created,
  and is never charged without clear authorization.
- Cancellation: cancel in the account, in a small number of clicks,
  with immediate confirmation and end of period access.

### Privacy policy, placeholder outline

- Seller product files, listing packs, and copy are seller business
  data. They are never used to train AI models, unless the seller
  gives separate, explicit consent for a specific purpose.
- Analytics count use only: signups, trial starts, conversions,
  template use, mockup use, export success, and churn, aggregated.
  Product text, sheet content, tab names, prices in product files,
  and personal details in listings are not tracked for marketing
  analytics.
- Data deletion: delete account, listing packs, uploads, exports,
  and AI logs for that account on request, with a confirmation and
  a completion record. Backups expire on a stated schedule, not yet
  set.
- GDPR: the business is a Czech trade business. The exact data
  controller details, retention periods, and cookie and analytics
  wording need Ali and a legal check before launch.

### Refund policy, placeholder outline

- Publish a refund policy before launch. Handle refund requests
  through the payment provider and admin, with a log.
- No refund terms are promised here: the payment provider is not
  chosen, the price is not set, and the refund window is not
  decided. Those are open decisions for Ali. Do not state a refund
  window or a refund promise to a seller until Ali decides it.

## SEO landing pages

Generated from template, niche, and platform data, with real
content, not thin placeholder pages:

- Per template: /templates/[slug], 10 pages, from the template
  engine definitions (name, role, version, status, best use, niche
  packs, change note) plus the verified Etsy export facts.
- Per niche pack: /niches/[slug], 3 pages, from config/niche-packs.json
  (source notes, last verified date, status, AI generation readiness)
  plus the mockups that suit the niche.
- Per platform pack: /platforms/[slug], 1 page in version 1 (Etsy),
  from config/platform-packs/etsy.v1.json (verified rules only,
  check date 2026-11-05, unverified items listed, not used as limits).

## Analytics

Measured in admin, aggregated and privacy conscious: signups, trial
starts, conversions, template use, mockup use, export success, and
churn. No product content, product text, or personal details are
tracked for marketing analytics. Feedback loop: in product feedback
for templates, mockups, and AI suggestions, with a simple rating and
optional comment, reviewed in admin, is planned, not built yet.

## Launch checklist

- [ ] Hosting, database, and object storage providers chosen by Ali.
- [ ] DATABASE_URL set on a test database first; migration applied
  and Prisma adapters tested against it, not only against test
  doubles.
- [ ] /admin gated behind the admin role and tested as a non admin.
- [ ] Premium price, currency, billing interval, Stripe account,
  and VAT treatment decided by Ali and confirmed with his
  accountant. No price invented.
- [ ] AI provider chosen and budget cap set by Ali.
- [ ] Terms, privacy policy, and refund policy final wording
  approved by Ali with a Czech legal check.
- [ ] Mockup frame licences decided: which frames are built in
  house, which need a licence, licence source and type recorded
  for each licensed frame. No licence bought until Ali approves.
- [ ] Full test suite passes, including the production build.
  (2026-11-07: the production build FAILS because of the parallel
  AI worker file apps/web/src/components/ai/AiSuggestions.tsx,
  which imports config/copy-prompts.json that does not exist and
  config/plans.json on a wrong relative path. That file belongs to
  the AI worker, not to this work. The build must pass before launch.)
- [ ] Visitor click through on the production server: home, auth,
  dashboard, builder, share, admin, logged out where relevant,
  mobile viewport, full click through. (2026-11-07: not done on a
  production server because the build fails, see above. Dev server
  click through is recorded in docs/feature-status.md.)
- [ ] Reconciliation fix vs flag, trial shape, and mockup pricing
  decisions tested with real sellers.
- [ ] Etsy pack previewed against a real test listing and enabled
  from draft, with a human visual review of the proof templates
  before any frame is called premium.
- [ ] Domain reopened by Ali, or launch stays on the placeholder
  domain configuration.
