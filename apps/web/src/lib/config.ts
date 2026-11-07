// Config loading for the web app.
// Copy, plans, niche packs, and platform packs live in config/ at the repo
// root and are the single source. Nothing content bearing is hard coded in
// components; components receive copy through props from these loaders.

import nichePacks from "../../../../config/niche-packs.json";
import plans from "../../../../config/plans.json";
import etsyPack from "../../../../config/platform-packs/etsy.v1.json";
import siteCopy from "../../../../config/site-copy.json";

export type SiteCopy = typeof siteCopy;
export type PlansConfig = typeof plans;
export type NichePacksConfig = typeof nichePacks;
export type EtsyPackConfig = typeof etsyPack;

export function getSiteCopy(): SiteCopy {
  return siteCopy;
}

export function getPlans(): PlansConfig {
  return plans;
}

export function getNichePacks(): NichePacksConfig {
  return nichePacks;
}

export function getEtsyPack(): EtsyPackConfig {
  return etsyPack;
}
