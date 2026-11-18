// Seller data on the server: listing packs, versions, exports, share
// links, review comments and seller profiles. Server only.
//
// With a database (DATABASE_URL set and the Prisma client generated),
// every store is a Prisma store. Without one, the stores are DEVELOPMENT
// ONLY in memory stores kept on globalThis, so every server chunk in the
// process sees the same data. They lose everything on restart and must
// never hold real seller data. In production a missing database is an
// error (see server-auth.ts).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  InMemoryPackStore,
  InMemorySellerProfileStore,
  InMemoryShareLinkStore,
  PackService,
  PrismaPackStore,
  PrismaSellerProfileStore,
  PrismaShareLinkStore,
  loadReferenceResolution,
  type AuditAppend,
  type PlatformPackDefinition,
  type PrismaPackClient,
  type PrismaSellerProfileClient,
  type PrismaShareLinkClient,
  type ReferenceReadClient,
  type SellerProfileStore,
  type ShareLinkStore,
} from "@listing-photos-generator/builder";
import { newAuditEvent } from "../../../../packages/auth/src/audit.ts";
import type { AuditAction } from "../../../../packages/auth/src/types.ts";
import { getPrismaClient } from "./db";
import { getServerAuthService } from "./server-auth";
import { repoRoot } from "./repo-root";

export type SellerDataMode = "prisma" | "memory";

export interface SellerData {
  mode: SellerDataMode;
  packs: PackService;
  shares: ShareLinkStore;
  profiles: SellerProfileStore;
  audit: AuditAppend;
}


function platformDefinition(): PlatformPackDefinition {
  return JSON.parse(readFileSync(join(repoRoot(), "config", "platform-packs", "etsy.v1.json"), "utf8")) as PlatformPackDefinition;
}

interface MemoryStores {
  packs: InMemoryPackStore;
  shares: InMemoryShareLinkStore;
  profiles: InMemorySellerProfileStore;
}

const holder = globalThis as unknown as { __lpgSellerMemory?: MemoryStores; __lpgSellerData?: Promise<SellerData> };

function memoryStores(): MemoryStores {
  if (!holder.__lpgSellerMemory) {
    holder.__lpgSellerMemory = {
      packs: new InMemoryPackStore(),
      shares: new InMemoryShareLinkStore(),
      profiles: new InMemorySellerProfileStore(),
    };
  }
  return holder.__lpgSellerMemory;
}

export function getSellerData(): Promise<SellerData> {
  if (!holder.__lpgSellerData) {
    holder.__lpgSellerData = (async () => {
      const auth = await getServerAuthService();
      const audit: AuditAppend = async (input) => {
        await auth.auditStore.append(newAuditEvent({ ...input, action: input.action as AuditAction }));
      };
      const client = await getPrismaClient();
      if (client) {
        const resolution = await loadReferenceResolution(client as ReferenceReadClient, platformDefinition());
        return {
          mode: "prisma" as const,
          packs: new PackService(new PrismaPackStore(client as PrismaPackClient, { resolution }), audit),
          shares: new PrismaShareLinkStore(client as PrismaShareLinkClient),
          profiles: new PrismaSellerProfileStore(client as PrismaSellerProfileClient),
          audit,
        };
      }
      const stores = memoryStores();
      return { mode: "memory" as const, packs: new PackService(stores.packs, audit), shares: stores.shares, profiles: stores.profiles, audit };
    })();
    // A failed setup (for example a database that was never seeded) is
    // not cached, so the next request tries again after the fix.
    holder.__lpgSellerData.catch(() => {
      holder.__lpgSellerData = undefined;
    });
  }
  return holder.__lpgSellerData;
}
