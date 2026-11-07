# Listing Photos Generator

Listing Photos Generator turns a real digital product into a complete, Etsy ready listing pack: images, title, description, tags, and a pre publish checklist, without inventing anything about the product.

Status: Phase 2 foundation built 2026-11-07 (local files only, no GitHub push by workers). Phase 1 planning docs are in `docs/`. The controlling brief is `PROMPT.md`. Feature status is in `docs/feature-status.md`.

## What version 1 is

- Etsy only, digital products only. eBay is second, Amazon is third and Phase 2.
- English only in version 1.
- No auto publishing, no video generation, no AI photos pretending to be real product screenshots.
- Free tier: one complete, watermark free, commercially usable pack free. Premium price is not set yet. Ali decides it.

## How to run

Requirements: Node 20 or newer, npm 10 or newer. No local Postgres is assumed. Use a hosted Postgres service or a containerized Postgres for development.

```bash
npm install
cp .env.example .env
# Fill in DATABASE_URL in .env with a real Postgres connection string.
# Keep Stripe keys and AI keys empty until Ali decides the provider and account.
npm run dev
```

Open http://localhost:3000. The landing page starts with the upload and product check, not a slogan only hero. The dashboard shell placeholder is at `/dashboard`.

Other commands:

```bash
npm run build       # production build of apps/web
npm run lint        # ESLint for apps/web
npm run typecheck   # TypeScript check for apps/web and packages/shared
npm test            # vitest suite: config rules, shared helpers, Prisma schema shape
npm run prisma:validate  # validate prisma/schema.prisma (no database connection needed)
npm run prisma:format    # format prisma/schema.prisma
```

## How to deploy

No hosting provider is chosen yet. No domain is chosen yet. The tools site domain is on hold. Do not check domain availability and do not buy anything until Ali reopens it.

Placeholder deployment shape, to be confirmed by Ali:

1. Deploy `apps/web` (Next.js) to a hosting provider of Ali's choice.
2. Provision a hosted PostgreSQL database and set `DATABASE_URL` as a secret, never in the repository.
3. Apply the Prisma migration in `prisma/migrations/` against that database.
4. Provision object storage for uploads, renders, and exports, and set the `OBJECT_STORAGE_*` variables from `.env.example`.
5. Set `NEXT_PUBLIC_APP_URL` and `APP_URL` to the deployed address.
6. Leave Stripe and AI variables empty until Ali decides the provider, account, and price. There is no payment flow and no AI integration in this foundation.

## Project layout

- `apps/web/`: Next.js, React, TypeScript, Tailwind CSS app. Landing page and dashboard shell. Copy comes from `config/`, never hard coded in components where admin copy is required.
- `packages/shared/`: shared platform neutral types (`Product`, `ProductVerifiedFact`, `ReconciliationCheck`, `ListingPack`, `Template`, `Mockup`, `PlatformPack`, `Plan`, `Entitlement`, `Trial`) and pure helpers. Every type that touches a platform carries `platform_id` and `pack_version_id`.
- `prisma/schema.prisma`: all 43 tables from `docs/database-design.md`, platform neutral. `prisma/migrations/` holds the initial migration generated from the schema.
- `config/`: admin editable config. `config/platform-packs/etsy.v1.json` (verified Etsy rules only, check date 2026-11-05), `config/plans.json` (free and premium entitlements, trial 7 days, no card, one per account, prices null until Ali decides), `config/niche-packs.json` (3 version 1 packs), `config/site-copy.json` (landing and dashboard copy).
- `docs/`: architecture, database design, platform rules, competitor research, feature status.
- `.github/workflows/ci.yml`: lint, typecheck, tests, Prisma validation, and an em dash and en dash check on push and pull request.

## Rules that apply to this repository

- No em dashes or en dashes anywhere. CI fails on them.
- Nothing content bearing is hard coded. Copy, templates, mockups, platform rules, pricing, limits, trial rules, niche rules, and AI prompts are editable through admin or configuration, with versioning, preview, and rollback.
- No invented figures, prices, fees, platform rules, or claims. Unverified items are marked unverified, never built on.
- No secrets in the repository. Use `.env` (never committed) and a secure secret store.

## Repo rule, same as Global Career Studio

This repo is the single source of truth, not manual file drops. Nothing is built on the live tools website until the idea and prompt are approved.
