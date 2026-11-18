// Vercel build: generate the Prisma client, apply migrations and the
// first-run setup when allowed, then build the web app.
//
// Migrations change the shared database, so they run only for the
// production deployment (VERCEL_ENV=production), or when
// LPG_MIGRATE_ON_BUILD=true is set on purpose (for example on preview
// deployments that each get their own Neon branch). A preview build never
// migrates the production database by accident.
//
// Migrations need a direct connection, not the pooled one. The first of
// these that is set is used: DATABASE_URL_UNPOOLED, POSTGRES_URL_NON_POOLING,
// DIRECT_DATABASE_URL, then DATABASE_URL. The value is never printed.

import { spawnSync } from "node:child_process";

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { stdio: "inherit", env });
  if (result.status !== 0) {
    console.error(`vercel-build: "${command} ${args.join(" ")}" failed.`);
    process.exit(result.status ?? 1);
  }
}

const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 18)) {
  console.error(`vercel-build: Node ${process.versions.node} is too old. Set Node.js 22.x in the Vercel project settings (22.18 or later is needed).`);
  process.exit(1);
}

run("npx", ["prisma", "generate", "--schema", "prisma/schema.prisma"]);

const migrate = process.env.VERCEL_ENV === "production" || process.env.LPG_MIGRATE_ON_BUILD === "true";
const directUrl =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DIRECT_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "";

if (!migrate) {
  console.log(`vercel-build: migrations skipped (VERCEL_ENV=${process.env.VERCEL_ENV ?? "not set"}). Set LPG_MIGRATE_ON_BUILD=true to run them here.`);
} else if (!directUrl) {
  console.error("vercel-build: no database URL is set. Connect the Neon database to the project before the production build.");
  process.exit(1);
} else {
  const env = { ...process.env, DATABASE_URL: directUrl };
  run("npx", ["prisma", "migrate", "deploy", "--schema", "prisma/schema.prisma"], env);
  run("node", ["scripts/db-setup.mjs"], env);
}

run("npm", ["run", "build", "-w", "apps/web"]);
