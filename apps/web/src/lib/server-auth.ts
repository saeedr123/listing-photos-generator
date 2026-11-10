// Server auth singleton. Server only. Never import this file from a
// client component: it reads env vars, talks to the database delegate,
// and holds session state. Client components call the server actions in
// apps/web/src/app/auth/actions.ts instead.
//
// How the delegate is resolved, in order:
// 1. If DATABASE_URL is set and a generated PrismaClient can be
//    imported, the AuthService is built on PrismaAuthProvider over that
//    real client. That is the production path.
// 2. Otherwise the AuthService is built on PrismaAuthProvider over the
//    in memory delegate below. That delegate is DEVELOPMENT ONLY: it
//    keeps users and sessions in process memory, loses everything on
//    restart, and must never be used as production auth. It exists so
//    login, the admin gate, and tests work with no live database, using
//    the exact same PrismaAuthProvider contract the real client uses.
//    The delegate is labelled DEVELOPMENT ONLY in code and in docs/auth.md.
//
// The LocalStubAuthProvider in packages/auth/src/stub-provider.ts is
// NOT used here. Server auth always goes through PrismaAuthProvider,
// so the provider contract is the same with either delegate.
//
// First admin seed, local proof only: when the delegate is the in
// memory one, the user store is empty, and both LPG_SEED_ADMIN_EMAIL
// and LPG_SEED_ADMIN_PASSWORD are set in env, the first admin user is
// created once on first use. Credentials are never hard coded, never
// committed, and never logged. See docs/auth.md.

import { randomUUID } from "node:crypto";
import { AuthService } from "../../../../packages/auth/src/auth-service.ts";
import { PrismaAuthProvider } from "../../../../packages/auth/src/prisma-provider.ts";
import type {
  PrismaAuthClient,
  PrismaSessionRow,
  PrismaUserRow,
} from "../../../../packages/auth/src/prisma-provider.ts";

export type ServerAuthMode = "prisma" | "memory";

// DEVELOPMENT ONLY in memory delegate implementing PrismaAuthClient.
// It stores exactly the rows PrismaAuthProvider reads and writes, with
// the same field names and shapes, so the provider code cannot tell it
// apart from a generated PrismaClient. Passwords are never stored here
// in plain text: the provider hashes with scrypt before calling
// user.create or user.update, and the delegate only stores the hash.
// Session tokens are never stored here in plain text either: the
// provider stores only the SHA-256 hash.
//
// The store itself lives on globalThis, not on the delegate instance.
// Next.js bundles this file into more than one server chunk (the
// login action chunk and the admin page chunk each carry their own
// copy of this module, with separate module state), so a plain
// instance field would give the action and the layout two different
// user stores and a login would never be visible to the admin gate.
// The globalThis store is the same pattern Next.js documents for a
// PrismaClient singleton: one process, one store, shared by every
// copy of the module. It is still in process memory only, loses
// everything on restart, and must never be used as production auth.
const GLOBAL_STORE_KEY = "__lpgInMemoryAuthStore";

interface InMemoryAuthStore {
  usersById: Map<string, PrismaUserRow>;
  usersByEmail: Map<string, PrismaUserRow>;
  sessionsById: Map<string, PrismaSessionRow>;
  sessionsByHash: Map<string, PrismaSessionRow>;
  identityCount: number;
}

function getGlobalStore(): InMemoryAuthStore {
  const holder = globalThis as Record<string, unknown>;
  let store = holder[GLOBAL_STORE_KEY] as InMemoryAuthStore | undefined;
  if (!store) {
    store = {
      usersById: new Map(),
      usersByEmail: new Map(),
      sessionsById: new Map(),
      sessionsByHash: new Map(),
      identityCount: 0,
    };
    holder[GLOBAL_STORE_KEY] = store;
  }
  return store;
}

// Test only. Clears the shared in memory store so each test starts
// from an empty user store. Never call this from server code.
export function resetInMemoryAuthStoreForTests(): void {
  const holder = globalThis as Record<string, unknown>;
  delete holder[GLOBAL_STORE_KEY];
}

export class InMemoryPrismaDelegate implements PrismaAuthClient {
  private store = getGlobalStore();

  userCount(): number {
    return this.store.usersById.size;
  }

  user = {
    create: async (args: { data: Record<string, unknown> }): Promise<PrismaUserRow> => {
      const now = new Date();
      const row: PrismaUserRow = {
        id: randomUUID(),
        email: String(args.data.email),
        name: (args.data.name as string | null) ?? null,
        password_hash: String(args.data.password_hash),
        role: String(args.data.role ?? "user"),
        edition: String(args.data.edition ?? "listing-photos-generator"),
        email_verified_at: null,
        locale: String(args.data.locale ?? "en"),
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
      this.store.usersById.set(row.id, row);
      this.store.usersByEmail.set(row.email, row);
      return row;
    },
    findUnique: async (args: { where: Record<string, unknown> }): Promise<PrismaUserRow | null> => {
      if (typeof args.where.email === "string") {
        return this.store.usersByEmail.get(args.where.email) ?? null;
      }
      if (typeof args.where.id === "string") {
        return this.store.usersById.get(args.where.id) ?? null;
      }
      return null;
    },
    update: async (args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<PrismaUserRow> => {
      const row = this.store.usersById.get(String(args.where.id));
      if (!row) {
        throw new Error("Record not found.");
      }
      if (typeof args.data.role === "string") {
        row.role = args.data.role;
      }
      if (typeof args.data.password_hash === "string") {
        row.password_hash = args.data.password_hash;
      }
      if (args.data.email_verified_at instanceof Date) {
        row.email_verified_at = args.data.email_verified_at;
      }
      if (typeof args.data.name === "string" || args.data.name === null) {
        row.name = args.data.name as string | null;
      }
      row.updated_at = new Date();
      return row;
    },
  };

  authIdentity = {
    create: async (_args: { data: Record<string, unknown> }): Promise<{ id: string }> => {
      this.store.identityCount += 1;
      return { id: randomUUID() };
    },
  };

  session = {
    create: async (args: { data: Record<string, unknown> }): Promise<PrismaSessionRow> => {
      const now = new Date();
      const row: PrismaSessionRow = {
        id: randomUUID(),
        user_id: String(args.data.user_id),
        session_token_hash: String(args.data.session_token_hash),
        expires_at: args.data.expires_at as Date,
        last_seen_at: null,
        created_at: now,
        revoked_at: null,
      };
      this.store.sessionsById.set(row.id, row);
      this.store.sessionsByHash.set(row.session_token_hash, row);
      return row;
    },
    findUnique: async (args: { where: Record<string, unknown> }): Promise<PrismaSessionRow | null> => {
      if (typeof args.where.session_token_hash === "string") {
        return this.store.sessionsByHash.get(args.where.session_token_hash) ?? null;
      }
      return null;
    },
    update: async (args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<PrismaSessionRow> => {
      const row = this.store.sessionsById.get(String(args.where.id));
      if (!row) {
        throw new Error("Record not found.");
      }
      if (args.data.revoked_at instanceof Date) {
        row.revoked_at = args.data.revoked_at;
      }
      return row;
    },
    updateMany: async (args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }> => {
      let count = 0;
      for (const row of this.store.sessionsById.values()) {
        if (row.user_id !== String(args.where.user_id)) {
          continue;
        }
        if (args.where.revoked_at === null && row.revoked_at !== null) {
          continue;
        }
        if (args.data.revoked_at instanceof Date) {
          row.revoked_at = args.data.revoked_at;
          count += 1;
        }
      }
      return { count };
    },
  };
}

// Build a fresh AuthService on PrismaAuthProvider over the given
// delegate, or over a fresh DEVELOPMENT ONLY in memory delegate when
// none is given. Tests use this to get an isolated service per test.
// The singleton below is the only instance server routes should use.
export function createServerAuthService(delegate?: PrismaAuthClient): AuthService {
  const resolved = delegate ?? new InMemoryPrismaDelegate();
  return new AuthService({ provider: new PrismaAuthProvider(resolved) });
}

// First admin seed, local proof only. Creates one admin user from the
// LPG_SEED_ADMIN_EMAIL and LPG_SEED_ADMIN_PASSWORD env vars, and only
// when the delegate is the in memory one and its user store is empty.
// Returns true when a user was created, false otherwise. Never logs
// the email or the password, and never creates a second admin on a
// later call, because the store is no longer empty then.
export async function maybeSeedFirstAdmin(
  _service: AuthService,
  delegate: PrismaAuthClient,
): Promise<boolean> {
  if (!(delegate instanceof InMemoryPrismaDelegate)) {
    return false;
  }
  if (delegate.userCount() !== 0) {
    return false;
  }
  const email = process.env.LPG_SEED_ADMIN_EMAIL;
  const password = process.env.LPG_SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    return false;
  }
  const provider = new PrismaAuthProvider(delegate);
  const created = await provider.createUser({ email, password });
  if ("error" in created) {
    return false;
  }
  await provider.setRole(created.user.id, "admin");
  return true;
}

async function resolveDelegate(): Promise<{ delegate: PrismaAuthClient; mode: ServerAuthMode }> {
  const memory = (): { delegate: PrismaAuthClient; mode: ServerAuthMode } => ({
    delegate: new InMemoryPrismaDelegate(),
    mode: "memory",
  });
  if (!process.env.DATABASE_URL) {
    return memory();
  }
  try {
    const specifier = "@prisma/client";
    const mod = (await import(specifier)) as { PrismaClient?: new () => unknown };
    if (typeof mod.PrismaClient !== "function") {
      console.warn("Server auth: generated Prisma client could not be loaded, using the development only in memory delegate.");
      return memory();
    }
    const client = new mod.PrismaClient();
    return { delegate: client as unknown as PrismaAuthClient, mode: "prisma" };
  } catch {
    console.warn("Server auth: generated Prisma client could not be loaded, using the development only in memory delegate.");
    return memory();
  }
}

let cachedService: Promise<AuthService> | null = null;
let cachedMode: ServerAuthMode | null = null;
let cachedSeeded = false;

// Singleton server AuthService. The first call resolves the delegate,
// builds the service, and runs the first admin seed if it applies.
// Later calls return the same service, so the in memory delegate (when
// in use) keeps its users and sessions for the life of the server
// process. Never call this from a client component.
export async function getServerAuthService(): Promise<AuthService> {
  if (!cachedService) {
    cachedService = (async () => {
      const resolved = await resolveDelegate();
      cachedMode = resolved.mode;
      const service = createServerAuthService(resolved.delegate);
      cachedSeeded = await maybeSeedFirstAdmin(service, resolved.delegate);
      return service;
    })();
  }
  return cachedService;
}

// Which delegate the singleton resolved to, and whether the first
// admin seed created a user. Null mode means the singleton has not
// been initialised yet.
export async function getServerAuthInfo(): Promise<{ mode: ServerAuthMode | null; seeded: boolean }> {
  await getServerAuthService();
  return { mode: cachedMode, seeded: cachedSeeded };
}
