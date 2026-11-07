// SEO landing page data. Pages under /templates, /niches, and
// /platforms are generated from the real template, niche, and platform
// data, with real content, not thin placeholder pages. Every fact on
// those pages comes from a template definition, a niche pack config
// entry, or the verified Etsy platform pack.

import { listAdminMockups, listAdminTemplates } from "./admin-data";
import { getEtsyPack, getNichePacks } from "./config";

export function templateSeo(slug: string) {
  const templates = listAdminTemplates();
  return templates.find((t) => t.slug === slug) ?? null;
}

export function nicheSeo(slug: string) {
  const niches = getNichePacks();
  return niches.packs.find((p) => p.slug === slug) ?? null;
}

export function platformSeo(slug: string) {
  if (slug !== "etsy") return null;
  return getEtsyPack();
}

export function allTemplateSlugs(): string[] {
  return listAdminTemplates().map((t) => t.slug);
}

export function allNicheSlugs(): string[] {
  return getNichePacks().packs.map((p) => p.slug);
}

export function mockupsForNiche(slug: string) {
  return listAdminMockups().filter((m) => m.nichePacks.includes(slug));
}
