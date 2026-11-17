// Server side wiring for the mockup studio: object storage, the registry
// service, the studio config and the platform pack. One instance per
// server process.
//
// Storage: the provider comes from OBJECT_STORAGE_PROVIDER. With no
// provider named, development uses the local file adapter under
// .local-storage at the repo root, and production reports that storage
// is not configured. No production provider has been chosen.

import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createObjectStorage, resolveObjectStorageConfig, type ObjectStorage } from "@listing-photos-generator/storage";
import {
  StudioRegistry,
  exportSettingsFromPack,
  inspectGlb,
  loadStudioConfig,
  loadStudioSeeds,
  resolveBuiltinAssetPath,
  validateStudioConfig,
  type GlbInfo,
  type PlatformPackLike,
  type StudioConfig,
  type StudioExportSettings,
} from "@listing-photos-generator/mockup-engine/studio-server";

export function repoRoot(): string {
  // The web app runs with its working directory at apps/web.
  return join(process.cwd(), "..", "..");
}

/** The platform pack type the export engine uses. Values are read from the pack file, never set here. */
export interface StudioPlatformPack extends PlatformPackLike {
  checkDate: string;
  sourceDoc: string;
  title: { maxChars: number; maxWordsGuidance: number };
  tags: { maxCount: number; maxCharsPerTag: number };
}

export interface StudioServer {
  storage: ObjectStorage;
  registry: StudioRegistry;
  config: StudioConfig;
  pack: StudioPlatformPack;
  exportSettings: StudioExportSettings;
  root: string;
  readAsset(key: string): Promise<{ data: Uint8Array; contentType: string } | null>;
}

const CONTENT_TYPES: Record<string, string> = {
  glb: "model/gltf-binary",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  hdr: "image/vnd.radiance",
  woff2: "font/woff2",
  woff: "font/woff",
  ttf: "font/ttf",
  otf: "font/otf",
};

export function contentTypeForKey(key: string): string {
  const extension = key.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[extension] ?? "application/octet-stream";
}

/** Prefixes the public asset route may serve. Registry documents are never served as assets. */
export const PUBLIC_ASSET_PREFIXES = ["builtin/", "models/", "textures/", "hdri/", "fonts/", "thumbnails/"];

const holder = globalThis as unknown as { __lpgStudioServer?: StudioServer };

export function getStudioServer(): StudioServer {
  // In development the registry files in the repository are edited by
  // hand, so they are read again on every call. In production they only
  // change with a deploy, so one instance is kept.
  if (holder.__lpgStudioServer && process.env.NODE_ENV === "production") return holder.__lpgStudioServer;
  const root = repoRoot();
  const config = loadStudioConfig(root);
  const configIssues = validateStudioConfig(config);
  if (configIssues.length > 0) {
    throw new Error(`config/studio.json is not valid: ${configIssues.map((i) => i.message).join(" ")}`);
  }
  const storage = createObjectStorage(resolveObjectStorageConfig(process.env, join(root, ".local-storage")));
  const pack = JSON.parse(readFileSync(join(root, "packages", "export", "src", "etsy-pack.json"), "utf8")) as StudioPlatformPack;

  const readAsset = async (key: string): Promise<{ data: Uint8Array; contentType: string } | null> => {
    const builtin = resolveBuiltinAssetPath(root, key);
    if (builtin) return { data: new Uint8Array(await readFile(builtin)), contentType: contentTypeForKey(key) };
    if (key.startsWith("builtin/")) return null;
    const stored = await storage.get(key);
    return stored ? { data: stored.data, contentType: stored.info.contentType } : null;
  };

  const registry = new StudioRegistry({
    storage,
    seeds: loadStudioSeeds(root),
    inspectModelFile: async (storageKey: string): Promise<GlbInfo | null> => {
      const asset = await readAsset(storageKey);
      return asset ? inspectGlb(asset.data) : null;
    },
  });

  const server: StudioServer = { storage, registry, config, pack, exportSettings: exportSettingsFromPack(pack), root, readAsset };
  holder.__lpgStudioServer = server;
  return server;
}

export function jsonError(message: string, status: number, extra: Record<string, unknown> = {}): Response {
  return Response.json({ ok: false, error: message, ...extra }, { status });
}
