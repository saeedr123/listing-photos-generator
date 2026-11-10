# Local setup, Listing Photos Generator

Fresh checkout guide for this repository only. No hosting, no
deployment, no spending, no live site. For deployment preparation,
see docs/deployment.md.

Style rule for this file: no em dashes and no en dashes anywhere.

## Prerequisites

- Node.js 20 or newer (package.json engines field: node >= 20).
- npm, with workspaces (apps/*, packages/*).
- No local Postgres install is assumed. The database is a hosted
  PostgreSQL service, or a containerized Postgres, configured later.
  Local development and tests run without a live database.
- Git, for the checkout.

## Checkout and install

```bash
git clone https://github.com/saeedr123/listing-photos-generator.git
cd listing-photos-generator
npm install --ignore-scripts
```

Use `npm install --ignore-scripts` first. A plain `npm install` runs
the `@prisma/engines` postinstall step, which downloads engine
binaries and stages them in `/tmp`. On this machine `/tmp` is a
512 MB tmpfs, and a full `/tmp` makes that download fail with
0 byte files (see the `/tmp` warning below). Installing with
`--ignore-scripts` skips the download, then fetch the engines with
the curl workaround below.

## The /tmp warning (read before installing)

`/tmp` on this machine is a 512 MB tmpfs. Prisma engine downloads,
test runs, and other tools stage files there, so it can fill up
fast. What happened before: on 2026-11-07 the sandbox `/tmp` was
100 percent full (493 MB in `/tmp/tsc-check`, left by another
process), and plain `npm install` failed 3 times on the
`@prisma/engines` postinstall download with ECONNRESET and 0 byte
files.

Current state, rechecked 2026-11-10:

```text
Filesystem  Size  Used Avail Use% Mounted on
tmpfs       512M  0     512M   0%  /tmp
```

`/tmp` is empty except for the X11 and ICE socket directories
(.ICE-unix, .X11-unix, .XIM-unix, .font-unix). Check it yourself
before installing:

```bash
df -h /tmp
ls -la /tmp
```

### Clearing /tmp safely

Only delete files you can identify as safe temp files. Safe to
remove: files and directories created by your own earlier runs,
for example a stale `/tmp/tsc-check`, or clearly abandoned tool
scratch directories with no running process behind them. Never
delete the socket directories (.ICE-unix, .X11-unix, .XIM-unix,
.font-unix), and never delete files owned by another running
process. When in doubt, leave the file alone and free space another
way (point TMPDIR at the workspace, see below), or ask the
coordinator.

```bash
du -sh /tmp/* 2>/dev/null | sort -h | tail -10
rm -rf /tmp/tsc-check
```

The last command is an example only. Replace `/tmp/tsc-check`
with the exact path you identified, and only after checking no
process is using it.

### If /tmp is full during install

Point TMPDIR at a directory inside the workspace, where there is
free space, and retry the install. Node and Prisma stage downloads
under TMPDIR when it is set.

```bash
mkdir -p .tmp
TMPDIR="$PWD/.tmp" npm install
rm -rf .tmp
```

If the postinstall download still fails, use the curl workaround
below instead of retrying plain `npm install`.

## Prisma engine workaround (curl fallback)

`node_modules` is gitignored, so a fresh checkout has no engine
binaries and no committed binary is in the repo. After
`npm install --ignore-scripts`, download the two Prisma 6.19.3
engine binaries with curl to the workspace (not to `/tmp`), then
place them in `node_modules/@prisma/engines/`.

The engine commit hash for Prisma 6.19.3 is
c2990dca591cba766e3b7ef5d9e8a84796e47ab7. If package.json moves to
a newer Prisma version, get the new hash first with
`npx prisma version` (it prints "Default Engines Hash") and use
that hash in the URLs below. The platform suffix
`debian-openssl-3.0.x` is for Debian and Ubuntu with OpenSSL 3.
On another platform, check `npx prisma version` output for the
engine file names that install expects, and use the matching
suffix in the URLs.

```bash
ENGINE_HASH=c2990dca591cba766e3b7ef5d9e8a84796e47ab7
mkdir -p .prisma-engines-tmp node_modules/@prisma/engines
curl -fsSL "https://binaries.prisma.sh/all_commits/${ENGINE_HASH}/debian-openssl-3.0.x/libquery_engine.so.node.gz" \
  -o .prisma-engines-tmp/libquery_engine.so.node.gz
curl -fsSL "https://binaries.prisma.sh/all_commits/${ENGINE_HASH}/debian-openssl-3.0.x/schema-engine.gz" \
  -o .prisma-engines-tmp/schema-engine.gz
gunzip -c .prisma-engines-tmp/libquery_engine.so.node.gz \
  > node_modules/@prisma/engines/libquery_engine-debian-openssl-3.0.x.so.node
gunzip -c .prisma-engines-tmp/schema-engine.gz \
  > node_modules/@prisma/engines/schema-engine-debian-openssl-3.0.x
chmod +x node_modules/@prisma/engines/schema-engine-debian-openssl-3.0.x
rm -rf .prisma-engines-tmp
```

The two download URLs return HTTP 200 (verified 2026-11-10).
Note the `.gz` suffix: the plain binary URLs without `.gz`
return 404, the gzipped files are the ones Prisma serves.

Expected result in `node_modules/@prisma/engines/`:

```text
libquery_engine-debian-openssl-3.0.x.so.node  (about 17 MB)
schema-engine-debian-openssl-3.0.x           (about 19 MB, executable)
```

Verified 2026-11-10 on this checkout: both files present, 36 MB
total, Prisma 6.19.3, engines hash
c2990dca591cba766e3b7ef5d9e8a84796e47ab7.

Verify the engines work:

```bash
npx prisma version
```

That prints the Prisma version and the two engine paths, for
example "Query Engine (Node-API): libquery-engine ... (at
node_modules/@prisma/engines/libquery_engine-debian-openssl-3.0.x.so.node)".

## Environment variables

Copy the example file and fill in placeholders. Never commit a
real `.env` file, and never put a real secret in any file in this
repo.

```bash
cp .env.example .env
```

`.env.example` lists every variable the app is expected to need:
DATABASE_URL, NEXT_PUBLIC_APP_URL, APP_URL, NEXTAUTH_SECRET,
NEXTAUTH_URL, object storage placeholders, Stripe placeholders,
AI placeholders (AI_PROVIDER, AI_MODEL, AI_API_KEY), and email
placeholders. All values are empty placeholders until Ali decides
the provider, price, and budget. Prices stay null placeholders.

Note: `prisma validate` needs DATABASE_URL set, or it fails with
error P1012 ("Environment variable not found: DATABASE_URL").
That is expected when no `.env` file exists. With a placeholder
DATABASE_URL it passes:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/listing_photos_generator?schema=public" \
  npx prisma validate
```

Expected output: "The schema at prisma/schema.prisma is valid".
Verified 2026-11-10 with Prisma 6.19.3. A placeholder URL only
proves the schema is valid; it does not connect to a database.
The migration in prisma/migrations/0001_init/migration.sql has
not been applied anywhere yet, and must be applied to a test
database first (see docs/deployment.md).

## Verify the checkout

```bash
npm test
npm run typecheck
npm run build
```

Phase 2 verification by the coordinator, 2026-11-07: 157 tests
pass, 0 fail, full typecheck passes, Next build passes,
production click through 17 routes all 200. See
PROJECT_STATUS.md, Phase 2 complete section, and
docs/feature-status.md for the per worker breakdown.

Start the dev server:

```bash
npm run dev
```

Then open http://localhost:3000 as a logged out visitor. The
dev server port may differ if 3000 is taken; check the terminal
output for the actual port.

## What is not set up here

- No database: DATABASE_URL is a placeholder, no migration
  applied, Prisma adapters are tested against in memory test
  doubles only.
- No auth provider or email: auth is a local stub (scrypt
  hashing, opaque sessions), it sends no email.
- No AI provider: the AI module is a development stub only.
- No Stripe: billing is a stub with charge always 0, prices
  null, VAT null.
- No object storage provider chosen.
- /admin routes are gated behind the admin role since 2026-11-10
  (apps/web/src/lib/admin-gate.ts, apps/web/src/middleware.ts,
  apps/web/src/app/admin/layout.tsx; tests in
  tests/admin-gate.test.ts). The gate fails closed: until a server
  login action sets the lpg_session cookie, every visitor is treated
  as signed out and redirected to /auth/login. See the admin gate
  section below.

## Local Postgres test database (docker-compose)

Added 2026-11-10. A local Postgres for testing only, defined in
docker-compose.yml at the repo root (image postgres:16-alpine,
host port 5433, database listing_test, local named volume). No
hosted service, no spending, no production data.

Status on this machine, checked 2026-11-10: Docker is not
installed (`docker` command not found), and neither is Podman,
psql, or a local Postgres server, so the container could not be
started here and the migrations could not be applied here. The
steps below are the exact ones to run on a machine with Docker,
or for a later run here once Docker is installed. Do not fake the
result: until these commands run against a real Postgres, the
migrations are validated by schema only (prisma validate, and the
migrate diff reproducibility check below), not by applying them.

```bash
docker compose up -d postgres
docker compose exec postgres pg_isready -U listing_test -d listing_test
```

Set the test database URL (test database only, never production):

```bash
export DATABASE_URL="postgresql://listing_test:listing_test@localhost:5433/listing_test"
```

Apply both migrations to the test database only, then check the
schema is valid:

```bash
npx prisma migrate deploy --schema prisma/schema.prisma
npx prisma validate --schema prisma/schema.prisma
```

Expected: migrate deploy reports 2 migrations applied
(0001_init, 0002_pack_version), and validate prints "The schema
at prisma/schema.prisma is valid". To confirm the PackVersion
table landed, run:

```bash
docker compose exec postgres psql -U listing_test -d listing_test -c "\d \"PackVersion\""
```

Stop and remove the test data when done:

```bash
docker compose down -v
```

Migration 0002 (prisma/migrations/0002_pack_version/migration.sql)
adds the PackVersion table only. It was generated with
`prisma migrate diff` from the committed schema to the new
schema, not hand written, and re-running that command produces
identical output (verified 2026-11-10). The repo has no
migration_lock.toml, so `migrate diff --from-migrations` does
not work here; the from-schema form recorded in the migration
header is the reproducible equivalent.

## Admin gate status (2026-11-10)

All /admin routes are gated. The decision lives in
apps/web/src/lib/admin-gate.ts and reuses isAdmin and
canManageAdminContent from packages/auth/src/permissions.ts.
Middleware (apps/web/src/middleware.ts) redirects requests with
no lpg_session cookie to /auth/login. The admin layout
resolves the cookie through AuthService and refuses signed in
non-admin users with a 403 panel that renders no admin content.

What is still open: no server login action sets the lpg_session
cookie yet, and no generated PrismaClient exists in this repo,
so the layout currently passes no session resolver and the gate
fails closed (everyone is redirected to login). To open the
gate for real admins, wire a server login action that sets the
cookie, generate the Prisma client, and pass an AuthService
built on PrismaAuthProvider as the resolver in the layout. Do
not wire the demo store into the gate: it keeps its session in
browser storage, which server code cannot read and must not
trust.

Live check, run 2026-11-10 against `next build` plus
`next start` on port 3100: logged out GET /admin returned 307
to /auth/login?next=%2Fadmin, logged out GET /admin/users
returned 307 to /auth/login?next=%2Fadmin%2Fusers, and a forged
lpg_session cookie still returned 307 to /auth/login?next=%2Fadmin
(the layout refused it after middleware passed it). The
non-admin 403 panel is covered by tests/admin-gate.test.ts with
a stub resolver; it could not be exercised live because no
server session exists yet to mint a real non-admin login.

## /tmp recheck (2026-11-10, evening)

Rechecked during the PackVersion and admin gate work. /tmp is a
512 MB tmpfs with about 3 MB used: two tool output files owned
by the runtime and a node compile cache, none of them created by
this work, so nothing was deleted. No file created by this work
needed clearing. Before installing or running Prisma commands,
recheck with `df -h /tmp` and `ls -la /tmp`, and only delete
files you can identify as your own temp files.
