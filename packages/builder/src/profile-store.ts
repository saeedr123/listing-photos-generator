// Seller profile store. Values are keyed by the config driven
// sellerProfileFields, so only known keys are kept.

import { randomUUID } from "node:crypto";
import { sellerProfileFields } from "./config.ts";
import type { Edition, SellerProfile } from "./types.ts";

export interface SellerProfileStore {
  find(userId: string): Promise<SellerProfile | null>;
  save(userId: string, edition: Edition, values: Record<string, string>): Promise<SellerProfile>;
}

/** Keep only configured fields, trimmed, so unknown keys never reach storage. */
export function cleanProfileValues(values: Record<string, unknown>): Record<string, string> {
  const clean: Record<string, string> = {};
  for (const field of sellerProfileFields) {
    const value = values[field.key];
    if (typeof value === "string") clean[field.key] = value.trim().slice(0, 500);
  }
  return clean;
}

/** DEVELOPMENT ONLY. Never holds real seller data outside local development. */
export class InMemorySellerProfileStore implements SellerProfileStore {
  private profiles = new Map<string, SellerProfile>();

  async find(userId: string): Promise<SellerProfile | null> {
    return this.profiles.get(userId) ?? null;
  }

  async save(userId: string, edition: Edition, values: Record<string, string>): Promise<SellerProfile> {
    const now = new Date().toISOString();
    const existing = this.profiles.get(userId);
    const profile: SellerProfile = { id: existing?.id ?? randomUUID(), userId, edition, values: cleanProfileValues(values), createdAt: existing?.createdAt ?? now, updatedAt: now };
    this.profiles.set(userId, profile);
    return profile;
  }
}

export interface PrismaSellerProfileClient {
  sellerProfile: {
    findUnique(args: { where: Record<string, unknown> }): Promise<Record<string, unknown> | null>;
    upsert(args: { where: Record<string, unknown>; create: Record<string, unknown>; update: Record<string, unknown> }): Promise<Record<string, unknown>>;
  };
}

function toProfile(row: Record<string, unknown>): SellerProfile {
  return {
    id: String(row["id"]),
    userId: String(row["user_id"]),
    edition: String(row["edition"]) as Edition,
    values: cleanProfileValues((row["values_json"] ?? {}) as Record<string, unknown>),
    createdAt: new Date(String(row["created_at"])).toISOString(),
    updatedAt: new Date(String(row["updated_at"])).toISOString(),
  };
}

export class PrismaSellerProfileStore implements SellerProfileStore {
  private client: PrismaSellerProfileClient;

  constructor(client: PrismaSellerProfileClient) {
    this.client = client;
  }

  async find(userId: string): Promise<SellerProfile | null> {
    const row = await this.client.sellerProfile.findUnique({ where: { user_id: userId } });
    return row ? toProfile(row) : null;
  }

  async save(userId: string, edition: Edition, values: Record<string, string>): Promise<SellerProfile> {
    const clean = cleanProfileValues(values);
    const row = await this.client.sellerProfile.upsert({
      where: { user_id: userId },
      create: { user_id: userId, edition, values_json: clean },
      update: { values_json: clean },
    });
    return toProfile(row);
  }
}
