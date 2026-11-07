// Admin server data. Reads the real template and mockup definitions,
// the root config, and the Etsy platform pack at request time, so the
// admin panel shows the same data the engines use, not a second copy.
// No live database is connected here yet: user, subscription, log, and
// analytics rows are honest empty states until DATABASE_URL is set and
// the Prisma adapters are wired to a live database.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getEtsyPack, getNichePacks, getPlans, getSiteCopy } from "./config";

export interface AdminTemplateRow {
  id: string;
  slug: string;
  name: string;
  role: string;
  version: number;
  status: string;
  changeNote: string;
  bestUse: string;
  nichePacks: string[];
}

export interface AdminMockupRow {
  id: string;
  slug: string;
  name: string;
  kind: string;
  version: number;
  status: string;
  qualityLabel: string;
  crispTestStatus: string;
  licenceSource: string | null;
  licenceType: string | null;
  licenceDate: string | null;
  licenceStorageLocation: string | null;
  nichePacks: string[];
}

function repoRoot(): string {
  // The web app runs with its working directory at apps/web, so the
  // repo root is two levels up. This is a path, not content.
  return join(process.cwd(), "..", "..");
}

function readJsonDir(dir: string): Record<string, unknown>[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as Record<string, unknown>);
}

export function listAdminTemplates(): AdminTemplateRow[] {
  const dir = join(repoRoot(), "packages", "template-engine", "templates");
  return readJsonDir(dir).map((t) => ({
    id: String(t["id"]),
    slug: String(t["slug"]),
    name: String(t["name"]),
    role: String(t["role"]),
    version: Number(t["version"]),
    status: String(t["status"]),
    changeNote: String(t["changeNote"] ?? ""),
    bestUse: String(t["bestUse"] ?? ""),
    nichePacks: Array.isArray(t["nichePacks"]) ? (t["nichePacks"] as string[]) : [],
  }));
}

export function listAdminMockups(): AdminMockupRow[] {
  const dir = join(repoRoot(), "packages", "mockup-engine", "mockups");
  return readJsonDir(dir).map((m) => {
    const licence = (m["licence"] ?? {}) as Record<string, unknown>;
    return {
      id: String(m["id"]),
      slug: String(m["slug"]),
      name: String(m["name"]),
      kind: String(m["kind"]),
      version: Number(m["version"]),
      status: String(m["status"]),
      qualityLabel: String(m["qualityLabel"]),
      crispTestStatus: String(m["crispTestStatus"]),
      licenceSource: licence["source"] ? String(licence["source"]) : null,
      licenceType: licence["licenceType"] ? String(licence["licenceType"]) : null,
      licenceDate: licence["licenceDate"] ? String(licence["licenceDate"]) : null,
      licenceStorageLocation: licence["licenceStorageLocation"] ? String(licence["licenceStorageLocation"]) : null,
      nichePacks: Array.isArray(m["nichePacks"]) ? (m["nichePacks"] as string[]) : [],
    };
  });
}

export function adminOverview() {
  const copy = getSiteCopy();
  const plans = getPlans();
  const niches = getNichePacks();
  const etsy = getEtsyPack();
  return { copy, plans, niches, etsy, templates: listAdminTemplates(), mockups: listAdminMockups() };
}
