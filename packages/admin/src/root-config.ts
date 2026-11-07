// Admin reads the root config at build time. Single source: the JSON
// files in config/ at the repo root (site copy, plans, niche packs, and
// platform packs). This module loads them with fs at server or build
// time, never from a mirrored copy in code. The builder package keeps a
// standalone mirror for use without the repo root (see
// packages/builder/src/config.ts); if the mirror and the root disagree,
// the root wins and the mirror must be updated. Admin never reads the
// builder mirror.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export interface RootConfig {
  siteCopy: Record<string, unknown>;
  plans: Record<string, unknown>;
  nichePacks: Record<string, unknown>;
  platformPacks: { file: string; data: Record<string, unknown> }[];
}

export function loadRootConfig(repoRoot: string): RootConfig {
  const readJson = (path: string): Record<string, unknown> => JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  const platformDir = join(repoRoot, "config", "platform-packs");
  const platformPacks = existsSync(platformDir)
    ? readdirSync(platformDir).filter((f) => f.endsWith(".json")).sort().map((file) => ({ file, data: readJson(join(platformDir, file)) }))
    : [];
  return {
    siteCopy: readJson(join(repoRoot, "config", "site-copy.json")),
    plans: readJson(join(repoRoot, "config", "plans.json")),
    nichePacks: readJson(join(repoRoot, "config", "niche-packs.json")),
    platformPacks,
  };
}

export function rootConfigPaths(repoRoot: string): string[] {
  return [
    join(repoRoot, "config", "site-copy.json"),
    join(repoRoot, "config", "plans.json"),
    join(repoRoot, "config", "niche-packs.json"),
  ];
}
