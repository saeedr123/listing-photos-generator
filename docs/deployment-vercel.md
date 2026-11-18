# Deployment on Vercel: mockups.nvconsult.eu

Written 2026-11-18. Decided by the owner the same day:

- Host: **Vercel**, as for the CV tool.
- Database: **Neon** PostgreSQL, added through Vercel.
- File storage: **Vercel Blob**.
- Address: **mockups.nvconsult.eu**. The WordPress site on nvconsult.eu stays as it is.
- Use: **personal use only, not sold**, for now. Sign up is closed (`LPG_SIGNUP=closed`), so only the admin account created on the first deploy can sign in.

The Docker package in `deploy/` (docs/deployment-nvconsult.md) stays in the repository as a fallback. It is not needed for Vercel.

Nothing has been bought or created on Vercel, Neon or Hostinger. The owner does every step below in their own accounts. Prices are not given here: check each provider's own pricing page.

## 1. What changed in the code so it runs on Vercel

| Before | On Vercel | Where |
| --- | --- | --- |
| The studio export ran a Python script with Pillow to write the JPG. | The JPG is written in Node with `sharp`. The sRGB profile bytes are identical to the Python ones (tested), and on a real 3000 by 2000 render the pixels matched Pillow exactly. | `packages/export/src/studio-gate.ts`, `srgb-icc.ts` |
| Uploaded models, thumbnails and admin edits were files on the server's disk. | They are private objects in Vercel Blob, read by the app with the store token and served through its own signed-in routes. | `packages/storage/src/vercel-blob.ts` |
| Rate limits were counted in one process's memory. | They are counted in the `RateLimitHit` table (migration 0006), shared by every copy of the app, with a lock so simultaneous requests cannot all pass. | `packages/auth/src/prisma-rate-limit-store.ts` |
| Repository files were found from the working folder. | The app walks up to the folder holding `config/studio.json`, and Next.js is told to ship those files. | `apps/web/src/lib/repo-root.ts`, `apps/web/next.config.js` |
| Migrations were run by hand or by the container start script. | The Vercel build runs them for the production deployment only. | `scripts/vercel-build.mjs` |

The template export (`packages/export/src/export.ts`) still uses Python. The web app does not call it.

## 2. Before you start: check these on the providers' own pages

1. **Vercel plan.** As far as I know, the free Hobby plan is for personal, non-commercial use, which matches the decision of 2026-11-18 (personal use, not sold). Confirm in Vercel's terms, especially if the tool is used for a business that earns from the images. If it is ever sold to sellers, Pro is likely needed.
2. **Upload size.** Vercel functions limit the size of one request body. I believe it is 4.5 MB. Each exported image is sent to the server as one PNG. Renders measured here were 1.1 to 1.7 MB, but a photo-heavy design may be larger. If a seller hits the limit, the studio says so plainly and exports nothing. The fix then is a direct upload to Blob (not built).
3. **Private Blob objects.** The app stores every object as private, a feature of `@vercel/blob` 2.8.2. If the first admin upload fails with an access error, check in Vercel that the Blob store allows private objects.

## 3. Set up, step by step

### 3.1 Project

1. In Vercel: **Add New, Project**, import `saeedr123/listing-photos-generator` from GitHub.
2. **Root Directory:** `apps/web`. Keep **Include files outside the root directory** turned on (the app reads `config/` and `packages/`).
3. **Framework:** Next.js. Install and build commands come from `apps/web/vercel.json`, so leave them empty in the dashboard.
4. **Node.js version:** 22.x (also set in `apps/web/package.json`). The build stops with a plain message on an older Node.
5. **Function region:** pick an EU region (for example Frankfurt) in the project settings, close to the Neon database and simpler for GDPR.
6. **Production branch:** `main`. Merge pull requests saeedr123/listing-photos-generator#1 and #2 first. Until then, deploy the branch as a preview to try it.

### 3.2 Database (Neon)

1. In the project: **Storage, Create Database, Neon**. Choose an EU region.
2. Connect it to the project for **Production**. Vercel adds the connection settings. As I understand it, these include `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct). Check the names on the project's Environment Variables page.
   - The app uses `DATABASE_URL` and adds `pgbouncer=true` when the host is a Neon pooler.
   - The build runs migrations over the first of `DATABASE_URL_UNPOOLED`, `POSTGRES_URL_NON_POOLING`, `DIRECT_DATABASE_URL`, `DATABASE_URL` that is set.
3. **Preview deployments.** Previews also run in production mode, so they need a database too. Either turn on Neon's option to create a database branch for each preview, and set `LPG_MIGRATE_ON_BUILD=true` for Preview only. Or accept that previews show an error page. Never point previews at the production database with migrations on.

### 3.3 File storage (Blob)

1. In the project: **Storage, Create, Blob**. Connect it to the project. Vercel adds `BLOB_READ_WRITE_TOKEN`.
2. Add `OBJECT_STORAGE_PROVIDER` = `vercel_blob`.

Previews and production share this store unless you create a second one for Preview.

### 3.4 Other settings (Environment Variables)

| Name | Value | Environments |
| --- | --- | --- |
| `OBJECT_STORAGE_PROVIDER` | `vercel_blob` | Production, Preview |
| `APP_URL` | `https://mockups.nvconsult.eu` | Production |
| `NEXT_PUBLIC_APP_URL` | `https://mockups.nvconsult.eu` | Production |
| `LPG_SEED_ADMIN_EMAIL` | the first admin's email | Production, first deploy only |
| `LPG_SEED_ADMIN_PASSWORD` | at least 10 characters, long and random | Production, first deploy only |
| `LPG_SIGNUP` | `closed` (personal use: no new accounts) | Production, Preview |
| `LPG_TRUSTED_PROXY_HOPS` | `1` (the default) | optional |

- **Seed admin.** The first production build creates that admin once, only if no admin exists. Sign in, then delete both values from Vercel. They are not needed again.
- **Proxy hops.** For rate limits the app reads the visitor address from `X-Forwarded-For`. Vercel's documentation, as I understand it, says Vercel sets that header itself and does not pass on a value the visitor sent. With 1 hop the app takes that value. I have not verified this on a live deployment.

### 3.5 Address: mockups.nvconsult.eu

1. In the Vercel project: **Settings, Domains, Add** `mockups.nvconsult.eu`.
2. Vercel shows the DNS record to create, normally a `CNAME` for `mockups`. Use the exact value Vercel shows.
3. In Hostinger hPanel, open the DNS records of nvconsult.eu and add that record. Change nothing else: the WordPress site keeps its own records.
4. Vercel issues the HTTPS certificate once the record resolves.

### 3.6 First deploy and checks

1. Deploy production. In the build log, look for the migrations applied, "First admin account created." and "Reference data ready".
2. Open `https://mockups.nvconsult.eu/api/health`. It should answer `{"ok":true,"database":"connected","referenceData":"ready"}`.
3. Sign in at `/auth/login` with the seed admin. Remove the two seed values from Vercel.
4. In `/admin/models`, upload a small GLB to prove Blob storage works. Then open `/studio` as a seller and export one set.

## 4. Updates and backups

- Every push to `main` deploys. Migrations run in that production build. A migration that fails stops the deploy, and the previous version keeps running.
- Database backups: Neon keeps a history you can restore from (its retention depends on the plan, see Neon's page). For your own copy, run `pg_dump` against the direct URL from your computer.
- Blob files: this project makes no copy of them. Keep the original GLB files you upload, so a model can be uploaded again.

## 5. What was tested here, and what was not

Tested in the engineering session, 2026-11-18:

- `scripts/vercel-build.mjs` run from `apps/web` with `VERCEL_ENV=production` against a fresh PostgreSQL 16, with separate pooled and direct URLs. It applied all 6 migrations, created the admin once, loaded the reference data, and built the app.
- The traced output (Next.js standalone build, which uses the same file tracing Vercel uses) was copied away from the repository and run on its own. The health check passed, and the browser suites passed against it. See PROJECT_STATUS.md for the counts.
- The JPG encoder against Pillow, the Blob adapter against a fake of the Blob calls, and the database rate limits against real PostgreSQL with 20 simultaneous requests.

Not tested:

- A real Vercel deployment, a real Neon database or pooler, a real Blob store. There are no such accounts or tokens in this environment.
- Vercel's request size limit and its `X-Forwarded-For` handling.
- Firefox, Safari, phones, a real GPU.

## 6. Only if it is ever opened to sellers

Not needed for personal use (decided 2026-11-18). Needed before anyone else signs up:

- **Open sign up.** Remove `LPG_SIGNUP=closed`.
- **Billing is a stub.** Every seller is on the free plan.
- **No password reset or email.**
- **No privacy policy or terms pages.** The wording needs a legal check.
- **Product files.** The builder stores file names and metadata only.

Whatever the use: the decisions in pull request saeedr123/listing-photos-generator#1 still stand.

**Your admin password.** With sign up closed and no password reset, the admin account is the only way in. Keep its password in a password manager. If it is lost, setting the two `LPG_SEED_ADMIN_*` values again does not help, because an admin already exists. Recovery then needs a direct change in the database.
