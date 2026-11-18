// Shared Prisma client. Server only.
//
// Returns null when DATABASE_URL is not set or the generated client is
// not available, so local development without a database still runs on
// the DEVELOPMENT ONLY in memory stores. In production a missing
// database is an error, never a silent fallback (see server-auth.ts).
//
// The client is imported directly. An import through a variable name
// (import(specifier)) is not followed by the Next.js server bundler, so
// it failed at run time and the app silently fell back to the in memory
// store even with DATABASE_URL set. Found 2026-11-18.

import { PrismaClient } from "@prisma/client";

const holder = globalThis as unknown as { __lpgPrisma?: Promise<unknown | null> };

export function databaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getPrismaClient(): Promise<unknown | null> {
  if (!holder.__lpgPrisma) {
    holder.__lpgPrisma = (async () => {
      if (!databaseConfigured()) return null;
      try {
        const client = new PrismaClient();
        await client.$connect();
        return client;
      } catch (error) {
        console.error("Database: the Prisma client could not connect. Check DATABASE_URL and that prisma generate has run.", error instanceof Error ? error.message : "");
        return null;
      }
    })();
  }
  return holder.__lpgPrisma;
}
