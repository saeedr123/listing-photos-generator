// The repository root, where config/ and the packages live. Server only.
//
// The web app reads repository files at run time (config/, the mockup
// registry and built in models, the template list, the Etsy pack). Locally
// and in the container the app runs from apps/web. On Vercel the function
// directory layout is not something this code controls, so the root is
// found by walking up from the working directory to the folder that holds
// config/studio.json. LPG_REPO_ROOT overrides the search.

import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

let cached: string | null = null;

export function repoRoot(): string {
  if (cached) return cached;
  const override = (process.env.LPG_REPO_ROOT ?? "").trim();
  if (override) {
    cached = resolve(override);
    return cached;
  }
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(dir, "config", "studio.json"))) {
      cached = dir;
      return cached;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fall back to the layout used locally: the app runs from apps/web.
  cached = join(process.cwd(), "..", "..");
  return cached;
}
