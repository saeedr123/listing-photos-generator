# Builder, auth, dashboard, and share link

Status: Phase 2, Wave 1. Built 2026-11-07, local files only, no GitHub push.
Foundation scaffold note: when this work started, no apps/web, packages,
or Prisma scaffold existed, so these modules were written self contained
to drop into apps/web. The foundation scaffold has since landed in the
same tree (Next.js app, Prisma schema, root config JSON, template engine,
mockup engine, export engine, shared package). This work was aligned to
it afterwards: package imports by workspace name, root config values
mirrored, template roles and mockup kinds taken from the real engines,
and the stored role value aligned to the Prisma schema. See the open
items at the end for the remaining integration gaps.

## What was built

### Auth: packages/auth/src

Modular auth service with a clear boundary. AuthService is the single
entry point; AuthProvider is the interface a real provider implements.
A later split to separate logins or single sign on is a provider swap
plus a configuration change, not a rewrite of the builder, templates,
mockups, or billing.

- Email login initially. No Google sign in yet.
- Passwords hashed with scrypt (Node crypto, server only). Sessions are
  opaque random tokens, stored as SHA-256 hashes only, returned once.
- Roles: the product role Seller is stored as "user", the Prisma schema
  default (prisma/schema.prisma, User.role defaults to "user"), and
  Admin is stored as "admin". ROLE_LABELS maps the stored value to the
  product label. isSeller() checks the stored "user" value.
- Edition tag on every User row: "listing-photos-generator" (commercial
  tools entry) or "nvconsult" (NVConsult entry). Both open the same app
  now. A user with packs in both editions is resolved explicitly at
  split time, never silently assigned to one side.
- Rate limiting on auth endpoints (login 5 attempts per 15 minutes,
  register 5 per hour, password change 5 per hour, configurable) with
  plain language user facing messages. Login failure never reveals
  whether the email exists.
- Audit log: login, login failure, registration, logout, password
  change, rate limit hits, subscription changes, trial starts, export
  failures, admin pack access, and account deletion, with time, actor,
  and action, without product content or secrets.
- LocalStubAuthProvider is marked DEVELOPMENT STUB ONLY in the file.
  It stores users in memory, sends no email, and verifies no real
  identity. It must never be presented as production authentication and
  must never hold real user data outside local development. No fake
  security claims are made for it.

### Seller profile: apps/web/src/app/dashboard/profile

One seller profile per account, reused across listing packs. Profile
fields are defined in packages/builder/src/config.ts
(sellerProfileFields), so admin can add a field without a code change.
All values start empty. No shop detail is hard coded anywhere.

### Dashboard: apps/web/src/app/dashboard

Seller profile, saved listing packs, pack history, templates, mockups,
downloads (export history), AI credits, subscription, and account
settings. Sections read the demo store in this build; empty states stay
honest and no counts are shown until real data exists. AI credit limit
shows "not set in admin yet" while config/plans.json leaves it null.
Subscription shows the trial terms (7 days, no card, one per account)
and states that no price is shown until the owner sets one.

Cold start: a new seller starts from the home page task (upload and
product check), creates a pack in one session, and walks six guided
steps with a live preview: product and facts, niche pack, templates and
mockups, copy, preview and check, share and export.

### Builder: apps/web/src/app/builder and packages/builder/src

- Upload and reconciliation: sheet PDFs, screenshots, or renders of
  the actual product, plus price, format, and features. Upload
  validation checks file type, size, and magic bytes (PDF, PNG, JPEG),
  rejects .xlsx and ZIP content with a plain message, and never leaks
  system details. Reconciliation is mandatory before export: tab count,
  price, format (Sheets, not Excel, no .xlsx claim), and claims must
  match the real product. The check reads what the pack actually shows
  in its copy, not the facts, so it cannot pass by construction.
- Flag only: on a mismatch the export is blocked and the fix is shown
  to the seller. The tool never changes a product fact by itself and
  never silently publishes. Whether the tool should fix a mismatch
  itself is still an open question for real sellers.
- Niche packs, version 1 only: wedding and events, personal finance,
  small business planners. Each pack is flagged as needing real product
  testing and is not ready for AI generation. Keyword starting points
  start empty and come only from the seller's own product words.
- Template and mockup choice: the 10 template roles and the 5 starter
  mockup kinds are taken from the real template engine definitions and
  the mockup engine vocabulary. Every mockup here is labelled basic,
  never premium. A frame with no licence record must not be enabled.
- Live preview: renders the pack state as the seller edits, with
  mockup frames labelled as frames, never as real screenshots.
- Autosave: every save appends a new version snapshot. History is
  never overwritten. Restore creates a new version.
- Sample content: clearly marked as sample, replaceable in one action
  (Replace sample content), and reconciliation blocks export while
  sample content is present. Sample content is never exported as if it
  were the seller's real product.
- Test product: the Maid of Honor Planner facts come from
  tests/fixtures/maid-of-honor-facts.json: 12 tabs, Google Sheets
  format, USD 13.97 list, USD 9.78 launch, with the claims and
  features recorded in that fixture. Those figures are task supplied,
  not independently rechecked against a live Etsy listing, and the
  builder says so next to the load test product action.

### Share and review link: apps/web/src/app/share/[token]

A read only share link for a listing pack. The plain token is shown
once at creation and is never stored; only the SHA-256 hash is stored.
The reviewer can view and comment, without editing the original.
Links expire (30 days in the demo), count views only, and can be
revoked. A revoked or expired link shows a plain message.

### Access control

Users can only access their own listing packs, unless they explicitly
share a read only link. Admin access to a user pack needs a recorded
support reason and must be written to the audit log by the caller;
the permission check alone is not the log. See
packages/auth/src/permissions.ts and
packages/builder/src/access-control.ts.

### Security and privacy

- File upload validation as above, with rejection messages that do not
  leak system details.
- Data deletion on request: the settings page asks the seller to type
  DELETE, then deletes packs, uploads, exports, and AI logs, and shows
  a completion record with time and wording. Backups expire on a stated
  schedule, which is an admin decision not yet set.
- Audit logs as above. No training on user data: uploaded product
  files are seller data, not training data, and are deletable with the
  listing pack.
- No live auth provider, no real secrets, no live charges, no live site
  changes, no contact with real people. Domain on hold, placeholder
  only.

### Design system

Tokens in apps/web/src/config/design-tokens.ts (navy #1B2A4A and gold
#D9A441 from the foundation Tailwind config, blush background from
the premium direction). Components in apps/web/src/components/ui.tsx
take labels as props. Copy lives in config: landing and dashboard copy
in config/site-copy.json at the repo root (single source, loaded
through apps/web/src/lib/config.ts), builder, auth, profile, settings,
and share copy in apps/web/src/config/site-copy.ts. The first screen
is the home page upload and product check, a task, not a slogan only
hero. Mobile layouts use the foundation responsive grid and the
builder steps wrap on small screens.

## Demo store, and what replaces it

apps/web/src/lib/demo-store.ts is a browser side stand in, marked
DEMO STORE ONLY in the file. It keeps data in localStorage, signs demo
users in with a browser SHA-256 hash, and reuses the pure package
functions (reconciliation, upload validation, sample handling, config)
so the demo exercises the same checks the server will run. Production
wiring replaces it with server actions that call AuthService
(packages/auth) and PackService (packages/builder) against the Prisma
database. The demo store must never hold real user data outside local
development.

## Tests

- packages/auth: 10 tests, node:test, `npm test` in packages/auth.
  Password hashing, register and login with edition tag, duplicate
  email, short password, login failure message sameness, login rate
  limit, logout revocation, password change revoking all sessions,
  permissions, audit log contents, rate limiter reset.
- packages/builder: 13 tests, node:test, `npm test` in
  packages/builder. Upload accept and reject cases (PDF, PNG, xlsx by
  extension and by magic bytes, extension mismatch, empty file,
  oversized file), reconciliation pass, tab mismatch, Excel claim,
  unverified claim, sample content block, price not stated, full seller
  flow (register, pack, wrong tab count, blocked export, fix, export,
  version restore, share link create, view, comment, revoke, second
  user denied, audit entry), sample replacement, account deletion
  completion record.
  server modules (packs.ts and share-link.ts) use node:crypto, the
  browser entry does not, so the client bundle builds cleanly.
- Typecheck: `tsc --noEmit` passes for packages/auth,
  packages/builder, and apps/web (root script `npm run typecheck`
  covers apps/web and packages/shared).
- Next build: `npm run build -w apps/web` passes, 11 routes generated.
- Click through, production server on port 3100, fetched as a visitor
  with no session: / 200 with the task first heading and the upload
  form, /auth/login 200 with the demo sign in notice, /auth/register
  200, /dashboard 200 with the sign in prompt, /dashboard/profile 200,
  /dashboard/packs 200, /dashboard/settings 200, /builder 200 with the
  sign in prompt, /builder/no-such-pack 200, /share/no-such-token 200
  with the loading state (the link resolves client side; the
  create, view, comment, revoke, and expiry behaviour is covered by
  the flow test). Two check strings were initially wrong on my side
  (home heading wording, logged out profile text) and were corrected
  against the real HTML; no page failed. The production server was
  stopped afterwards.
- One build failure was found and fixed during this work, not hidden:
  the first `next build` failed because the dashboard imported the
  builder server entry, which pulls node:crypto into the client
  bundle. Fixed by adding the browser safe entry point above; the
  rebuild passed.

## Files created or edited

Auth and builder packages:

- packages/auth/package.json, packages/auth/tsconfig.json
- packages/auth/src/types.ts, config.ts, password.ts, rate-limit.ts,
  sessions.ts, permissions.ts, audit.ts, stub-provider.ts,
  auth-service.ts, index.ts, __tests__/auth.test.ts
- packages/builder/package.json, packages/builder/tsconfig.json
  upload-validation.ts, reconciliation.ts, sample-content.ts,
  access-control.ts, share-link.ts, packs.ts, index.ts, browser.ts,
  __tests__/builder.test.ts, __tests__/flow.test.ts

Web (apps/web/src):

- config/design-tokens.ts, config/site-copy.ts
- components/ui.tsx, AuthForms.tsx, SellerProfileForm.tsx,
  builder/BuilderClient.tsx, builder/LivePreview.tsx,
  share/ShareView.tsx
- lib/demo-store.ts
- app/auth/login/page.tsx, app/auth/register/page.tsx
- app/dashboard/page.tsx (rewrote the foundation placeholder shell
  into the working dashboard), app/dashboard/profile/page.tsx,
  app/dashboard/packs/page.tsx, app/dashboard/settings/page.tsx
- app/builder/page.tsx, app/builder/[packId]/page.tsx
- app/share/[token]/page.tsx

Integration edits to foundation files, minimal:

- apps/web/tsconfig.json: path mappings for
  @listing-photos-generator/auth and
  @listing-photos-generator/builder, plus
  allowImportingTsExtensions for the workspace imports.

Not edited: the root scaffold, Prisma schema, template engine, mockup
engine, export engine, root config JSON files, home page, layout, or
any other worker's files.

## Missing APIs and open items

1. Prisma adapter for AuthService and PackService. The packages use
   store interfaces (AuthProvider, PackStore, ShareLinkStore,
   AuditStore). A Prisma backed implementation is needed before any
   real user data flows. The demo store stands in until then.
2. Builder working shape vs shared DB shape. The builder
   ListingPack carries productFacts, copy, images, and files inline;
   packages/shared ListingPack is the flat DB row shape. A mapping
   adapter is needed when the Prisma adapter lands. Do not unify by
   editing either shape without the foundation worker.
3. Builder config mirrors root config JSON. config/niche-packs.json,
   config/plans.json, and config/platform-packs/etsy.v1.json are the
   single source; packages/builder/src/config.ts mirrors them so the
   package stays usable standalone. If they disagree, root config
   wins. Wave 2 (admin panel) should read the root config at build
   time instead of mirroring.
4. No live auth provider, no email sending, no email verification
   flow, no Google sign in. The stub marks email unverified and
   provides markEmailVerified for development only.
5. Export produces a queued record and a reconciliation result. The
   real render and file download come from the export engine worker;
   the builder calls requestExport and records the outcome, it does
   not render images itself.
6. AI copy help, monetization, and the admin panel are Wave 2. The
   dashboard shows AI credits and subscription from config only.
7. Session lifetime (30 days) and upload size limit (20 MB per file)
   are configurable defaults in code, not decisions. The audit
   retention period is null until admin sets it.
8. Reconciliation fix vs flag is still an open question for real
   sellers. Flag only is implemented.

## What needs Ali only when awake

Spending, live charges, domain, live site changes, real people, final
legal wording, premium price, Stripe account and VAT treatment, AI
provider choice, mockup frame licences, and the reconciliation fix vs
flag decision. None of those was decided or built here.
