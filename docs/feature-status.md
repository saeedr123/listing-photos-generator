# Feature status

Status: gap fill, 2026-11-10, coordinator verified. The Phase 2
foundation and Wave 2 sections below are kept for history; their
test results and still open lists are superseded by the gap fill
section at the end of this file. Nothing here is live, no spending,
no domain, no Stripe, no AI provider.

## Built in the Phase 2 foundation

- Next.js 14 + React 18 + TypeScript + Tailwind CSS 3 app scaffold in `apps/web/`, with a working dev server and a production build (see test results below).
- Landing page at `/` that is not a slogan only hero: the first screen has the upload and product check as the front door, with a client side form that previews the reconciliation checklist from the facts entered. Copy comes from `config/site-copy.json`, not from hard coded strings in components.
- Dashboard shell placeholder at `/dashboard`, with navigation and honest empty states. No sample counts, no fake data.
- Prisma schema in `prisma/schema.prisma` with all 43 tables from `docs/database-design.md`. The design doc says "Total: 41 tables" in its last line, but its own tables list counts 43, and the schema implements all 43 named tables. Platform neutral: `platform_id` and `pack_version_id` wherever a platform is touched, no per platform columns. Versioning tables for Template, Mockup, PlatformPack, NichePack, CopyPrompt, and ListingPackCopy. Edition tag on User, Product, and ListingPack (no invented default value; the edition values are to be confirmed by Ali). Mockup licence record fields on MockupVersion: source, licence type, licence date, licence storage location.
- Initial migration SQL in `prisma/migrations/0001_init/migration.sql`, generated from the schema with `prisma migrate diff`. No live database connection was used, and no migration renames existing data (there is no existing data; this is the first migration).
- Etsy platform pack config in `config/platform-packs/etsy.v1.json`, versioned, from verified Etsy rules only (check date 2026-11-05): 2000px shortest side, title max 140 chars, max 13 tags each max 20 chars, JPG export, sRGB, up to 20 photos, digital files max 5 at 20MB each. Unverified items (hard file size cap, max pixel dimension, mandatory aspect ratio, description character limit) are marked unverified with null values, not invented. No eBay or Amazon pack in code; `config/platform-packs/README.md` is a placeholder note for later packs only.
- Admin editable config: `config/plans.json` (free and premium entitlements, trial 7 days, no card, one per account, price fields null with a note that Ali decides), `config/niche-packs.json` (3 packs only: wedding and events, personal finance, small business planners, each with last verified date 2026-11-05 and source notes, marked as needing real product testing before AI use), `config/site-copy.json` (landing and dashboard copy).
- `.env.example` with every required variable and no real secrets. Stripe keys and AI keys are empty placeholders.
- Shared types in `packages/shared/src/` for Product, ProductVerifiedFact, ReconciliationCheck, ListingPack, Template, Mockup, PlatformPack, Plan, Entitlement, Trial, with `platform_id` and `pack_version_id` everywhere a platform is touched, plus pure helpers that take limits as arguments.
- CI skeleton in `.github/workflows/ci.yml`: lint, typecheck, tests, Prisma validation, and an em dash and en dash grep check on push and pull request.
- Tests in `tests/`: Etsy pack rules, plans and trial config, niche packs, no em dash or en dash in config copy, shared helpers, Prisma schema shape (43 models, platform neutrality, mockup licence fields, edition tags).
- README updated: how to run, how to deploy (placeholder hosting, no provider chosen), how to test.

## Test results

Run 2026-11-07, in `~/workspace/listing-studio/`:

- `npm install --ignore-scripts`: PASS, added 475 packages in 24s. A plain `npm install` failed 3 times on the `@prisma/engines` postinstall step, which downloads engine binaries from binaries.prisma.sh and hit ECONNRESET. Cause found: the sandbox `/tmp` (512 MB tmpfs) was 100 percent full (493 MB in `/tmp/tsc-check`, left by another process), so downloads staged to `/tmp` failed with 0 byte files. Workaround used: the two Prisma 6.19.3 engine binaries were downloaded with curl to the workspace (not `/tmp`) and placed in `node_modules/@prisma/engines/` (schema-engine and libquery_engine, debian-openssl-3.0.x). `node_modules` is gitignored, so a fresh checkout needs the engines again; if the postinstall download still fails there, the same curl workaround applies. No engine binary is committed.
- `npm test`: PASS, 2 test files, 18 tests passed (config rules, shared helpers, Prisma schema shape).
- `npm run typecheck` (full): FAIL, but only in files written by sibling Wave 1 workers, not in foundation files. Errors are in `apps/web/src/components/builder/LivePreview.tsx`, `apps/web/src/components/share/ShareView.tsx`, `apps/web/src/components/ui.tsx`, and `apps/web/src/lib/demo-store.ts`, which reference modules that do not exist yet (`../../../packages/builder/src/index.ts`, `../config/site-copy.ts`, `../config/design-tokens.ts`, `./ui.tsx`). Scoped typecheck of foundation files only (landing, dashboard, UploadCheckForm, lib/config, plus packages/shared) with a temporary tsconfig: PASS, exit 0. The temporary tsconfig was deleted after the check. Foundation files were not edited to work around this, and sibling files were not touched.
- `npm run lint` (full, `next lint`): PASS, no ESLint warnings or errors.
- `npm run build` (full, `next build`): FAIL, webpack module-not-found errors in sibling workers' files only: `apps/web/src/app/auth/login/page.tsx` cannot resolve `../../components/ui.tsx` and `../../config/site-copy.ts` (wrong relative paths), and `apps/web/src/lib/demo-store.ts` cannot resolve `../../../packages/builder/src/index.ts` (packages/builder does not exist yet). No error names a foundation file.
- `npm run prisma:validate`: PASS, "The schema at prisma/schema.prisma is valid", run with a placeholder `DATABASE_URL` (no database connection). Note: the command fails with "Environment variable not found: DATABASE_URL" if the variable is unset, so CI sets a placeholder value in the validate step.
- Prisma migration generation: PASS, `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` produced `prisma/migrations/0001_init/migration.sql` with 43 CREATE TABLE statements and 123 CREATE INDEX statements. (Prisma 6.19 uses `--to-schema-datamodel`, not `--to-schema`.)
- Dev server: PASS. `next dev -p 3107` served `/` with HTTP 200 (21,473 bytes, contains the landing heading and "Start a listing pack") and `/dashboard` with HTTP 200 (11,596 bytes, contains "Dashboard"). Server stopped after the check; port 3107 is free.
- Repo wide em dash and en dash scan (Python scan of all text files except node_modules, .git, .next, package-lock.json): NONE found. The dash test in `tests/config.test.ts` uses `\u2014` and `\u2013` escapes so the test file itself holds no dash character.

## Coordination notes for the parent (found while building)

- Sibling Wave 1 workers wrote into `apps/web/src/` at the same time: auth pages and forms, builder and share components, `apps/web/src/config/site-copy.ts`, `apps/web/src/config/design-tokens.ts`, `apps/web/src/lib/demo-store.ts`, plus `docs/export-testing.md`, `docs/mockup-engine.md`, `docs/template-engine.md`. Their files are in progress and currently break the full typecheck and full build, as recorded above. Foundation files are intact and pass in isolation.
- Duplicate copy source: the auth worker added `apps/web/src/config/site-copy.ts` while the foundation keeps copy in `config/site-copy.json` at the repo root (single source, loaded by `apps/web/src/lib/config.ts`). One of the two should be removed or made the single source at merge time.
- The design doc line "Total: 41 tables" disagrees with its own 43 item tables list. The schema follows the list (43).

## Still open

- No live database. The migration has not been applied anywhere. A hosted Postgres (or containerized Postgres) and a real `DATABASE_URL` are needed before any database test.
- No auth, no seller profile, no builder, no upload storage, no reconciliation engine, no template engine, no mockup library, no export engine, no AI copy help, no Stripe, no admin panel. Those are later Phase 2 workers and phases.
- Upload and product check on the landing page is a client side preview only. It is not connected to a server, storage, or the reconciliation engine.
- Edition values for the edition tag are to be confirmed by Ali (the design doc leaves them open).
- Premium price, currency, billing interval, AI credit amounts, export allowances, and storage limits are null in config until Ali decides them.
- Niche packs need real product testing before AI use. Their `ai_generation_ready` flag is false.
- The Etsy pack is status `draft` in config. It needs preview against a real test listing before it is enabled.
- Hosting provider, database provider, object storage provider, domain, and legal wording are all open decisions for Ali.
- The design doc line "Total: 41 tables" disagrees with its own 43 item tables list. The schema follows the list (43). Worth one line in the design doc at the next docs pass.

## Wave 2 admin panel, merge pass, and deployment preparation, 2026-11-07

Built and tested 2026-11-07, local files only. No live database, no live site, no spending, no Stripe, no AI provider.

- Merge pass: copy single source (root config/site-copy.json, supplement reads it at build time), builder to DB adapter (packages/builder/src/db-adapter.ts), admin reads root config at build time (packages/admin/src/root-config.ts), Prisma adapters for AuthService and PackService (packages/auth/src/prisma-provider.ts, packages/builder/src/prisma-pack-store.ts, tested against test doubles, no live Postgres), real export engine wired into the builder export flow (packages/builder/src/export-runner.ts, PackService export runner injection, plain language error and pack preservation on failure). One minimal fix outside this ownership: packages/rendering/src/layout.ts now imports AdaptedTemplate from platform-adapter.ts instead of types.ts.
- Admin panel: packages/admin and apps/web/src/app/admin/ (overview, users, templates, mockups with the easy add flow, prompts, niche, platform, plans, subscriptions, analytics, exports, flags, logs). Versioning, feature flags, governance, licence gate, entitlements, and trial configuration are implemented and tested. Admin changes are held in session only until a live database is connected. The /admin routes are not gated behind the admin role yet.
- SEO landing pages: /templates/[slug] (10), /niches/[slug] (3), /platforms/[slug] (Etsy only), generated from real template, niche, and platform data.
- Deployment preparation: docs/deployment.md (hosting, database, and object storage placeholders, no provider chosen; backups; monitoring; terms, privacy policy, and refund policy placeholder outlines needing Ali and a legal check; launch checklist). Admin docs: docs/admin.md.

Test results, 2026-11-07:
- npm test (root vitest): 25 pass, 0 fail.
- ./tests/run-tests.sh: 49 pass, 0 fail.
- node --test tests/ai.test.mjs: 35 pass, 0 fail.
- node --test tests/billing.test.mjs: 18 pass, 0 fail.
- packages/auth: 10 pass. packages/builder: 13 pass. packages/admin: 7 pass.
- Total: 157 tests pass, 0 fail.
- Full npm run typecheck: FAIL, 3 errors, all in the parallel AI worker file apps/web/src/components/ai/AiSuggestions.tsx (missing config/copy-prompts.json, wrong relative path to config/plans.json, possibly null creditCost). Not in this work, not edited.
- npm run build: FAIL, same AI worker module not found errors. No error names a file from this work.
- Visitor click through, dev server only: 200 for home, auth, dashboard, builder, share, all admin pages, template, niche, and platform pages, including a fresh server check for /templates/hero and mobile user agent checks for / and /admin/templates. Production server click through NOT done, because the production build fails.

Still open: no live database, /admin not gated, AI prompts have no text yet, no live auth provider or email, no Stripe, no hosting, domain, price, VAT, or legal wording decisions, and the production build must pass before launch.

## Gap fill, 2026-11-10, coordinator verified

Local files only, no GitHub push. Phase 2 v1 core was not rebuilt.

What was filled:
- Admin gate: middleware plus admin layout gate behind the admin role, reusing isAdmin and canManageAdminContent. Logged out and forged cookie requests return 307 to login. The gate fails closed for everyone until the server login action lands; see still open below.
- PackVersion table: Prisma model PackVersion, 44 models total, migration 0002_pack_version, adapter in packages/builder/src/pack-version-store.ts, 4 separation tests. Builder saveVersion and listVersions now use PackVersion.
- sRGB ICC profile: embedded in every exported JPG (6600 bytes, sRGB IEC61966-2.1), verified from file bytes and recorded in the export manifest.
- Real proof pack: tests/proof-output/real-pack/, 4 images from real Maid of Honor renders, manifest with source file and sha256 per image. No frame is called premium. Image 04 has a blank white tablet screen in its source, recorded as a defect, layout proof only.
- Billing persistence: PrismaBillingStore through the existing Prisma models, Stripe stub charge always 0, VAT null, prices null.
- Email hook: records plus a send step that does nothing without configured provider credentials. No email sent.
- Google sign-in: placeholder only, returns not configured without both env vars and not implemented with both set. No live OAuth.
- Live database readiness: docker-compose.yml for a local Postgres test database. Migration not applied anywhere here because Docker, Podman, and Postgres binaries are absent in this environment.
- AI credit gate: blocks when the credit limit is null, when no provider is configured, and when the limit is reached. No credit counts or provider invented.
- Three Saeed decisions as admin-configurable flags in config/feature-decisions.json with safe defaults: flag only, per account 7 day trial, mockups follow plan entitlements.
- Provider-agnostic standing rule, 2026-11-10: billing, AI, email, object storage, auth, and hosting are adapters or config choices, swappable without rewriting the builder, templates, mockups, or billing core. Recorded in docs/architecture.md section 9.4. Test tests/billing-provider.test.mjs (9 pass) proves a fake second provider registered through config is called through the interface.

Test results, coordinator run 2026-11-10:
- Root vitest: 34 pass, 0 fail.
- Engine suite ./tests/run-tests.sh: 56 pass, 0 fail.
- Node suites (billing, AI, billing provider, real pack): 84 pass, 0 fail.
- Auth package: 13 pass, 0 fail. Builder package: 17 pass, 0 fail. Admin package: 7 pass, 0 fail.
- Total: 211 pass, 0 fail.
- Full typecheck passes, lint passes, Prisma schema valid, Next build passes.
- Production click through: 14 routes return 200, admin routes return 307 to login for logged out visitors, forged cookie returns 307, mobile user agent on home returns 200.

Still open after the gap fill:
- Server login action for real admin access (see PROJECT_STATUS.md).
- Migration not applied to any database.
- Refund requests have no Prisma table; held in the store log only.
- Three decision flags are not wired into the admin flags UI.
- AI generateCopy still runs the local development stub when called directly; the gate must be called first in production wiring.
- Proof pack gaps: image 04 blank tablet screen, no portrait mobile-view or square who-it-is-for proof, 6 templates left out, no frame premium until Saeed approves it in plain words.
- Saeed-only decisions: price, currency, Stripe account, VAT treatment with accountant confirmation, refund policy final wording with a legal check, AI provider choice and budget cap, AI credit counts, hosting and database and storage providers, domain on hold, mockup frame licences, reconciliation fix vs flag, trial shape, mockup pricing, which niche pack converts first.
