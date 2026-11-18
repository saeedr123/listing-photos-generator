# Deployment on a subdomain of nvconsult.eu

Written 2026-11-18. Decision recorded: "we can host for now on our own site nvconsult.eu" (owner, 2026-11-18). This guide says how to do that, what was tested, and what was not.

## 1. Finding: the app cannot run inside the current nvconsult.eu website

Seen from the public response headers and page source of nvconsult.eu on 2026-11-18:

- The site is WordPress, built with Elementor.
- The web server is LiteSpeed with PHP 8.3, the setup Hostinger uses for its web hosting plans. That it is a shared (not VPS) plan is an inference from the headers. Confirm it in hPanel.

This app needs three things a WordPress hosting plan does not normally give:

1. A long running Node.js process (Next.js server).
2. Python 3 with Pillow (the JPG encoder that embeds the sRGB profile).
3. PostgreSQL. WordPress hosting plans normally give MySQL only.

I am not certain whether the current Hostinger plan offers Node.js app hosting. Some plans may. Even if it does, items 2 and 3 are still needed. Check in hPanel before choosing a route.

## 2. Route: keep WordPress as it is, add a subdomain on its own server

- nvconsult.eu stays on WordPress, unchanged.
- A subdomain of nvconsult.eu (name to be chosen by the owner) points at a separate server that runs this app.
- The WordPress site links to the subdomain from a menu item or button. Where the links go is an owner decision (PROMPT.md section 23).

The server needs:

- Linux with Docker Engine and the Docker Compose plugin.
- Ports 80 and 443 open to the internet.
- A suggested size of 2 vCPU, 4 GB RAM and 40 GB disk. This is an estimate, not a measured figure. The Next.js build uses the most memory. Watch the first build.
- No GPU. 3D rendering runs in the seller's browser (WebGL), not on the server.
- For GDPR, a server located in the EU is the simpler choice. Confirm with the privacy policy wording.

Any VPS provider works, including a Hostinger VPS on the same account. No price is given here: check the provider's own page. Nothing has been bought.

## 3. What runs on the server

`deploy/docker-compose.yml` starts three containers:

| Container | What it does |
| --- | --- |
| `db` | PostgreSQL 16. Data in the `pgdata` volume. |
| `app` | This repository, built by the `Dockerfile`. On every start, `deploy/entrypoint.sh` applies pending database migrations, creates the first admin if none exists, loads the Etsy reference data, then starts the web server. Uploaded models, thumbnails and registry edits are kept in the `storage` volume (local file storage). |
| `caddy` | HTTPS in front of the app. Gets and renews the certificate for the subdomain by itself. |

`GET /api/health` answers 200 with `{"ok":true,...}` when the database is reachable and the reference data is loaded, and 503 otherwise.

## 4. First start, step by step

1. **DNS.** In hPanel, open the DNS records for nvconsult.eu and add an `A` record. The name is the chosen subdomain, the value is the server's public IPv4 address. If the server has IPv6, also add an `AAAA` record. Wait until `dig +short <subdomain>.nvconsult.eu` returns that address.
2. **Server.** Install Docker Engine and the Compose plugin with the official Docker instructions for the server's Linux distribution.
3. **Code.** Clone the repository on the server and check out the branch or tag to deploy.
4. **Settings.** Copy the example settings and fill them in:

```bash
cp deploy/env.example deploy/.env
```

   - `LPG_DOMAIN`: the full subdomain, for example `<subdomain>.nvconsult.eu`.
   - `POSTGRES_PASSWORD`: letters and digits only, for example the output of `openssl rand -hex 32`. It goes inside a connection URL, so `@`, `/` or `:` would break it.
   - `LPG_SEED_ADMIN_EMAIL` and `LPG_SEED_ADMIN_PASSWORD`: the first admin account. The password must be at least 10 characters (the rule in `packages/auth`). Use a long random one.
   - `deploy/.env` is ignored by git. Never commit it.
5. **Start.**

```bash
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
```

6. **Check.**

```bash
curl -s https://<subdomain>.nvconsult.eu/api/health
```

7. **Sign in** at `/auth/login` with the admin account. Then delete the two `LPG_SEED_ADMIN_*` values from `deploy/.env`. They are used only when no admin exists, so removing them changes nothing at run time. Removing them keeps the password off the server.

## 5. Updates

```bash
git pull
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
```

Migrations run by themselves on start. Take a backup first.

## 6. Backups

```bash
sh deploy/backup.sh
```

This writes a database dump and a tar of the stored files into `./backups` (ignored by git). Run it daily from cron and copy the files off the server: a backup on the same disk is lost with the disk. Restore with `pg_restore` into an empty database and untar into the `storage` volume. The restore was not tested here.

## 7. What was tested, and what was not

Tested in the engineering session, 2026-11-18:

- `deploy/entrypoint.sh` run twice against a fresh PostgreSQL 16, with production settings and local file storage: all 5 migrations applied on the first run, none pending on the second. The admin was created once and not again. Reference data loaded. `/api/health` returned 200 both times.
- The production build, the seller flow and the studio against PostgreSQL in headless Chromium (see PROJECT_STATUS.md).
- The compose file parses and the shell scripts pass a syntax check.

Not tested:

- **The Docker image was never built and the compose stack was never started.** This environment has no Docker. Expect the first build on the server to be the real test.
- Caddy getting a certificate, and HTTPS end to end.
- The backup restore.
- A real GPU, Firefox, Safari or a phone for the studio.

Visitor address for rate limits: the app reads `X-Forwarded-For` and takes the entry `LPG_TRUSTED_PROXY_HOPS` places from the right (1 here, for Caddy). Whether Caddy replaces the header or appends to it, its rightmost entry is the address Caddy itself saw, so 1 is right for this stack. I have not verified Caddy's exact header behaviour on a live server. If another proxy or a CDN is put in front of Caddy, raise the number.

## 8. Before opening to sellers

The stack is fit for the owner to use it. These are still open before real sellers use it:

- **One app container only.** Rate limits are counted in the app's memory. Do not run two `app` replicas.
- **No password reset.** There is no email provider and no reset flow. A seller who forgets their password needs an admin.
- **No privacy policy or terms pages.** The wording needs a legal check (PROMPT.md section 23).
- **Billing is a stub.** Every seller is on the free plan (1 pack, basic mockups only). Admins are not limited.
- **Product files are not stored.** The builder keeps file names and metadata only. Studio designs are image files processed in the browser.
- **Local file storage.** Stored files live on the server's disk, in the `storage` volume. Backups are the only copy elsewhere. A production object storage provider is still an open decision.
- The decisions waiting on Saeed in pull request saeedr123/listing-photos-generator#1 still stand.

## 9. Owner decisions needed for this route

1. The subdomain name.
2. Which server, and whether Hostinger's own VPS is preferred.
3. Where the nvconsult.eu website links to the app.
