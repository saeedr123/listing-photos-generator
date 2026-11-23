// One time database setup, run after the migrations on a new database.
//
//   DATABASE_URL=... LPG_SEED_ADMIN_EMAIL=... LPG_SEED_ADMIN_PASSWORD=... npm run db:setup
//
// It does two things, and is safe to run again:
// 1. Creates the first admin account from LPG_SEED_ADMIN_EMAIL and
//    LPG_SEED_ADMIN_PASSWORD, only when no admin account exists yet.
//    The credentials come from env only and are never printed.
// 2. Seeds the reference rows every listing pack points at: the Etsy
//    platform, its platform pack and the pack version, from
//    config/platform-packs/etsy.v1.json.
//
// It never edits an existing admin, never changes a password, and never
// edits a published pack version.

import { readFileSync } from "node:fs";

const { PrismaClient } = await import("@prisma/client");
const { AuthService } = await import("../packages/auth/src/auth-service.ts");
const { PrismaAuthProvider } = await import("../packages/auth/src/prisma-provider.ts");
const { seedReferenceData } = await import("../packages/builder/src/reference-seed.ts");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  let admin = await prisma.user.findFirst({ where: { role: "admin", deleted_at: null }, orderBy: { created_at: "asc" } });
  if (admin) {
    console.log("An admin account already exists. No admin was created.");
  } else {
    const email = process.env.LPG_SEED_ADMIN_EMAIL;
    const password = process.env.LPG_SEED_ADMIN_PASSWORD;
    if (!email || !password) {
      console.error("No admin account exists. Set LPG_SEED_ADMIN_EMAIL and LPG_SEED_ADMIN_PASSWORD to create the first one.");
      process.exit(1);
    }
    const provider = new PrismaAuthProvider(prisma);
    const auth = new AuthService({ provider });
    const created = await auth.register({ email, password }, "db-setup");
    if (!created.ok || !created.user) {
      console.error(`The first admin could not be created: ${created.message ?? "unknown reason"}.`);
      process.exit(1);
    }
    await provider.setRole(created.user.id, "admin");
    admin = await prisma.user.findUnique({ where: { id: created.user.id } });
    console.log("First admin account created.");
  }

  const definition = JSON.parse(readFileSync(new URL("../config/platform-packs/etsy.v1.json", import.meta.url), "utf8"));
  const resolution = await seedReferenceData(prisma, { definition, platformName: "Etsy", createdByUserId: admin.id });
  console.log(`Reference data ready: platform ${definition.platform_id}, pack ${definition.slug} version ${definition.version}.`);
  void resolution;
} finally {
  await prisma.$disconnect();
}
