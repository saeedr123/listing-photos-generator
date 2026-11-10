# Deployment preparation, Listing Photos Generator

Status: Phase 2 complete, verified by coordinator 2026-11-07,
rechecked 2026-11-10. Local files only, no GitHub push. Nothing here
is deployed. No hosting provider is chosen, no spending, no live
site, no domain purchase. Domain is on hold, do not check domain
availability and do not buy anything until Ali reopens it.

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
  Still open 2026-11-10: no provider is chosen.
- [ ] DATABASE_URL set on a test database first; migration applied
  and Prisma adapters tested against it, not only against test
  doubles. Still open 2026-11-10: the migration has not been
  applied anywhere, and no live or test database exists yet.
- [x] /admin gated behind the admin role and tested as a non admin.
  Checked 2026-11-10 by the coordinator on the production server:
  logged out GET /admin returns 307 to /auth/login?next=%2Fadmin,
  logged out GET /admin/users returns 307, a forged lpg_session
  cookie returns 307, and 9 admin gate unit tests pass. Server
  login landed 2026-11-11, so a signed in admin now reaches /admin
  with 200; see the item below.
- [x] Server login action for real admin access: loginAction and
  logoutAction in apps/web/src/app/auth/actions.ts, AuthService on
  PrismaAuthProvider passed as the resolver in the admin layout,
  httpOnly lpg_session cookie on success. Checked 2026-11-11 by
  the coordinator on the production server with
  scripts/verify-server-login.sh, all 7 checks pass: logged out
  /admin 307, forged cookie 307, wrong password 200 with the
  generic message and no cookie, correct login 303 to /admin with
  the cookie, logged in /admin 200 with Admin panel and Sign out,
  logout 303 and the old token then 307. Still open: no live
  database test, because prisma generate failed with ECONNRESET
  and no generated client exists; the in memory delegate is the
  only path proven live. Register is still demo.
- [ ] Premium price, currency, billing interval, Stripe account,
  and VAT treatment decided by Ali and confirmed with his
  accountant. No price invented. Still open 2026-11-10: prices
  stay null placeholders, VAT is null, no Stripe account.
- [ ] AI provider chosen and budget cap set by Ali. Still open
  2026-11-10: the AI module is a development stub only, no
  provider and no key.
- [ ] Terms, privacy policy, and refund policy final wording
  approved by Ali with a Czech legal check. Still open
  2026-11-10: the outlines in this file are placeholders only.
- [ ] Mockup frame licences decided: which frames are built in
  house, which need a licence, licence source and type recorded
  for each licensed frame. No licence bought until Ali approves.
  Still open 2026-11-10: no licence decision is recorded.
- [x] Full test suite passes, including the production build.
  Checked 2026-11-07, rechecked 2026-11-10 by the coordinator:
  211 tests pass, 0 fail (root vitest 34, engine suite 56, node
  suites 84, auth 13, builder 17, admin 7), full typecheck passes,
  lint passes, Prisma schema valid, Next build passes. Rechecked
  2026-11-11 by the coordinator: 223 tests pass, 0 fail (root
  vitest 43, engine suite 56, node suites 87, auth 13, builder 17,
  admin 7), full typecheck passes, lint passes, Prisma schema
  valid (45 models), Next build passes. The earlier
  failure note is removed: the AI worker fixed its imports in
  apps/web/src/components/ai/AiSuggestions.tsx while still running,
  config/copy-prompts.json now exists on disk (verified
  2026-11-10, 5,271 bytes), and the build passes, so that blocker
  is cleared.
- [x] Visitor click through on the production server: home, auth,
  dashboard, builder, share, admin, logged out where relevant,
  mobile viewport, full click through. Checked 2026-11-07,
  rechecked 2026-11-10 by the coordinator: 14 routes return 200
  (home, auth login and register, dashboard and profile and
  settings, builder, share, templates hero and features-grid,
  niches wedding-and-events, platforms Etsy, account, checkout),
  admin routes return 307 to login for logged out visitors (the
  gate working, not a failure), a forged session cookie returns
  307, and a mobile user agent on home returns 200. Rechecked
  2026-11-11 by the coordinator with scripts/verify-server-login.sh:
  all 7 server login checks pass on the production server, and
  mobile home, desktop home, and the login page all return 200.
- [ ] Reconciliation fix vs flag, trial shape, and mockup pricing
  decisions tested with real sellers. Still open 2026-11-10:
  the three decisions are now admin-configurable flags in
  config/feature-decisions.json with safe defaults standing
  (flag only, per account 7 day trial, mockups follow plan
  entitlements), but no decision is recorded and the alternative
  behaviours are not built.
- [ ] Etsy pack previewed against a real test listing and enabled
  from draft, with a human visual review of the proof templates
  before any frame is called premium. Still open 2026-11-10:
  a real proof pack now exists in tests/proof-output/real-pack/
  (4 images from real Maid of Honor renders, sRGB ICC embedded),
  but image 04 has a blank white tablet screen, 6 templates have
  no real proof, and human visual review is still required. No
  frame is called premium.
- [ ] Domain reopened by Ali, or launch stays on the placeholder
  domain configuration. Still open 2026-11-10: domain is on hold.
