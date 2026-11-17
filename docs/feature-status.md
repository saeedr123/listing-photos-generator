# Feature status

Status: 3D mockup studio added 2026-11-17, see the last section. Before
that: gap fill, 2026-11-10, coordinator verified. The Phase 2
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

## Server login and RefundRequest, 2026-11-11, coordinator verified

Local files only, no GitHub push. Phase 2 v1 core and the gap fill were not rebuilt.

What was built:
- Server login action: apps/web/src/lib/server-auth.ts (getServerAuthService singleton, AuthService on PrismaAuthProvider; InMemoryPrismaDelegate implementing the full PrismaAuthClient contract, DEVELOPMENT ONLY, store on globalThis so the action chunk and the admin page chunk share one store; first admin seed from LPG_SEED_ADMIN_EMAIL and LPG_SEED_ADMIN_PASSWORD only when the store is empty, never hard coded, never logged) and apps/web/src/app/auth/actions.ts (loginAction sets the httpOnly lpg_session cookie, logoutAction revokes and clears it). Admin layout passes the AuthService as the resolver and has a sign out button. LoginForm now calls loginAction instead of demoLogin. Middleware unchanged: cookie presence first layer only, layout stays authoritative. 9 new tests in tests/server-auth.test.ts.
- RefundRequest table: Prisma model RefundRequest, 45 models total, migration 0003_refund_request (generated, not applied to any database). PrismaBillingStore persists through the refundRequest delegate; InMemoryBillingStore through its own in memory table. 3 new billing tests plus 1 in memory test. The row id is database generated; requestRefund builds a "refund_" prefixed id which is not a valid UUID, so the returned request carries the row id.
- prisma generate tried once: failed with ECONNRESET while downloading the Prisma engine, no generated client exists. The install added @prisma/client ^6.19.3 to package.json dependencies; resolveDelegate falls back to the in memory delegate with a warning when the generated client cannot be loaded. No live database test was run or claimed.
- scripts/verify-server-login.sh automates the production login proof (7 checks) against a production build it starts itself.

Test results, coordinator run 2026-11-11:
- Root vitest: 43 pass, 0 fail.
- Engine suite ./tests/run-tests.sh: 56 pass, 0 fail.
- Node suites (billing, AI, billing provider, real pack): 87 pass, 0 fail.
- Auth package: 13 pass, 0 fail. Builder package: 17 pass, 0 fail. Admin package: 7 pass, 0 fail.
- Total: 223 pass, 0 fail.
- Full typecheck passes, lint passes, Prisma schema valid, Next build passes.
- Production click through with scripts/verify-server-login.sh: all 7 checks pass (logged out /admin 307, forged cookie 307, wrong password 200 with the generic message and no cookie, correct login 303 to /admin with the HttpOnly SameSite=Lax cookie, logged in /admin 200 with Admin panel and Sign out, logout 303 and the old token then 307). Mobile home 200, desktop home 200, login page 200.

Still open after this increment:
- No live database test: prisma generate failed (ECONNRESET), no generated client, Docker and Postgres absent here. Next step: on a machine with network and Docker, run npx prisma generate, apply migrations 0001, 0002, 0003 to a test database, then test the Prisma adapters against it.
- No admin read-only refund list yet (follow-up recorded): needs a generated client, DATABASE_URL, and a live database first, then a server data loader in apps/web/src/lib/admin-data.ts and a list on /admin/subscriptions or /admin/refunds with an honest empty state.
- Register is still demo: the register form still uses the demo store. Next step: a server register action on the same AuthService, in a later increment.
- No browser UI click through: login was proven over HTTP with the exact server action wire format the browser client sends; no one has clicked Sign in in a real browser yet.

Still open after the gap fill:
- Server login action for real admin access: DONE 2026-11-11, see the section above.
- Migration not applied to any database.
- Refund requests have no Prisma table; held in the store log only: DONE 2026-11-11, RefundRequest model and migration 0003 added, see the section above. Still open: no admin read-only refund list yet.
- Three decision flags are not wired into the admin flags UI.
- AI generateCopy still runs the local development stub when called directly; the gate must be called first in production wiring.
- Proof pack gaps: image 04 blank tablet screen, no portrait mobile-view or square who-it-is-for proof, 6 templates left out, no frame premium until Saeed approves it in plain words.
- Saeed-only decisions: price, currency, Stripe account, VAT treatment with accountant confirmation, refund policy final wording with a legal check, AI provider choice and budget cap, AI credit counts, hosting and database and storage providers, domain on hold, mockup frame licences, reconciliation fix vs flag, trial shape, mockup pricing, which niche pack converts first.

## 3D mockup studio, 2026-11-17, provisional

3D mockup studio built on branch claude/listing-photos-generator-mockup-cj66s8, in a draft pull request, not merged. No spending, no live site, no contact with real people, no licence bought. The 14 November direction change it follows is PROVISIONAL until Saeed approves it (PROMPT.md section 7.6, docs/architecture.md section 6.7).

Verification by the engineering session, 2026-11-17, at the head of the branch: 339 tests pass, 0 fail (root vitest 43, tests/run-tests.sh 177, node suites ai 39 plus billing 34 plus billing-provider 9, auth 13, builder 17, admin 7). The real-pack suite is skipped here because its source renders are outside the repository. Typecheck passes, lint passes, Prisma schema valid, Next build passes (one compile warning from the existing server-auth.ts, not from this work). No em dashes or en dashes in any text file. Browser checks on the production build in headless Chromium: 61 pass, 0 fail (tests/visual/studio-visual.cjs --e2e). prisma generate was not run and no database test was run or is claimed. GitHub Actions: the CI workflow passed on the pull request at commit 41c2d0f, 2026-11-17 (lint, typecheck, vitest, tests/run-tests.sh, Prisma validate, dash scan). CI on main had been failing before this branch, at tests/merge.test.ts line 181, because the workflow never installed Pillow, which the export tests need. The workflow now installs it. The first CI run on this branch failed because package-lock.json was missing the new storage workspace. That was fixed.

Baseline note: PROJECT_STATUS.md said 223 tests at 3744c03. The count measured at 3744c03 on 2026-11-16 was 213 pass, 0 fail. 5 of the missing 10 are the skipped real-pack tests. The other 5 could not be located.

Built and tested:
- Label fix: laptop-alone, phone-alone, tablet-alone and laptop-plus-phone relabelled basic at version 2, with honest premium criteria. A premium label now needs every criterion plus a recorded human review sign-off, at every status. No frame or model is labelled premium.
- Object storage interface (packages/storage) with a local file adapter for development only, an in memory adapter for tests, and versioned JSON documents. No production provider chosen.
- Model registry, admin managed, versioned: upload a GLB, name the screen mesh, set presets, preview, enable, with duplicate, edit, hide and roll back. A new model was added through /admin/models in a browser with no code change and appeared in the studio catalog.
- 3D scene engine in apps/web: three.js 0.170.0 and React Three Fiber 8.18.0. GLB models, design as a texture on the named mesh, PBR materials, environment lighting, soft contact shadows, free orbit camera, camera presets, device colours, background from the style kit.
- 9 in house GLB models (laptop, phone, 2 tablets, A4 sheet, US Letter sheet, 2 fanned stacks, clipboard), 1 procedural desk texture, 1 procedural lighting preset. All with licence records. All basic quality.
- 10 shots (working drafts, preview status) and a draft style kit with placeholder values.
- Batch export: one design plus one kit gives the ordered set. Every image goes through the export gate (size from the Etsy pack, sRGB, embedded sRGB profile proved from the bytes) and into a zip. Measured: 10 JPGs, each 3000 by 2000.
- Colour extraction: 3 to 5 dominant colours, offered as a style kit variant. The design colours are never changed.
- Migration: the 5 SVG frames are in the registry as basic 2D fallbacks.
- Visual regression: one reference render per shot in tests/visual/reference, with a compare script.

Not built, not verified, or waiting, in plain words:
- No human visual review of anything. The reference renders are not an approved look.
- No real product render exists in the repository. Everything was checked with test charts. So every built in model is in preview status, not published, and every exported set is a proof, marked as one.
- Checked only in headless Chromium with a software GPU. Not on a real GPU, not in Firefox or Safari, not on a phone, not by a person.
- The studio at /studio is not wired to listing packs, the reconciliation check, entitlements, export history or rate limits. /studio and the export gate route are open to any visitor. Gate them before any deployment.
- Rendering runs in the browser. docs/architecture.md says background jobs. The renderer is behind a job runner interface. Only the browser runner exists. The export gate trusts placement numbers reported by the browser.
- HDRI files and font files: the code paths exist and have never run, because no such asset exists.
- No premium sign-off form in admin. No preview thumbnails. No PDF input. No seller text editing. No desk prop models.
- Missing inputs that were not invented: docs/shot-list.md, fixtures/designs with 3 CV renders, reference screenshots for the target look, licensed GLBs and HDRIs. Placeholders made and marked: config/style-kits/modustemplates.json, the 10 shots, the test charts.

Decisions waiting on Saeed:
1. Approve, change or reject the 14 November 3D studio direction as written in PROMPT.md section 7.6.
2. Where rendering runs: in the browser as built, or as a background job.
3. Object storage provider for production.
4. Brand values for the modustemplates style kit: colours, fonts (with font files and licences), badge, wording, shot order.
5. The shot list.
6. Human visual review of the models and renders, before any premium label.
7. Design surfaces are unlit so colours stay exact. Lit paper would look more real and change colours. Keep the rule, or allow it with seller approval.
8. Real design renders to test with.

Full detail: docs/mockup-engine.md, section "3D mockup studio".
