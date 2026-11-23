// Seed loader: reads the registry records kept in the repository.
// Models, shots, lighting and textures live under
// packages/mockup-engine/registry/. Style kits live under
// config/style-kits/. The old flat SVG frames are mapped in as basic 2D
// fallbacks. Server side only: this file reads from disk.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { loadMockups } from "../library.ts";
import { migrateLegacyMockups } from "./legacy-migration.ts";
import type { StudioSeeds } from "./registry-service.ts";
import type { StudioConfig } from "./studio-config.ts";
import type { LightingPreset, ModelRegistryEntry, ShotDefinition, StyleKit, TextureAsset } from "./types.ts";

function readJsonDir<T>(dir: string): T[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => JSON.parse(readFileSync(join(dir, file), "utf8")) as T);
}

export function loadStudioSeeds(repoRoot: string): StudioSeeds {
  const engine = join(repoRoot, "packages", "mockup-engine");
  const registry = join(engine, "registry");
  const legacy = migrateLegacyMockups(loadMockups(join(engine, "mockups")));
  return {
    models: [...readJsonDir<ModelRegistryEntry>(join(registry, "models")), ...legacy],
    shots: readJsonDir<ShotDefinition>(join(registry, "shots")),
    lighting: readJsonDir<LightingPreset>(join(registry, "lighting")),
    textures: readJsonDir<TextureAsset>(join(registry, "textures")),
    kits: readJsonDir<StyleKit>(join(repoRoot, "config", "style-kits")),
  };
}

export function loadStudioConfig(repoRoot: string): StudioConfig {
  return JSON.parse(readFileSync(join(repoRoot, "config", "studio.json"), "utf8")) as StudioConfig;
}

export const BUILTIN_KEY_PREFIX = "builtin/";

/**
 * Map a builtin/ asset key to its file in the repository. Returns null
 * for any key that is not a builtin key or that would leave the assets
 * folder.
 */
export function resolveBuiltinAssetPath(repoRoot: string, key: string): string | null {
  if (!key.startsWith(BUILTIN_KEY_PREFIX)) return null;
  const rest = key.slice(BUILTIN_KEY_PREFIX.length);
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(rest) || rest.includes("..")) return null;
  const assetsRoot = resolve(repoRoot, "packages", "mockup-engine", "assets");
  const full = resolve(assetsRoot, ...rest.split("/"));
  if (!full.startsWith(assetsRoot + sep)) return null;
  return existsSync(full) ? full : null;
}
