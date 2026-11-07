// Site copy supplement for the builder, auth, profile, settings, and share
// screens. Single source: config/site-copy.json at the repo root, loaded
// here at build time through a JSON import. This file holds no copy of its
// own; it only reshapes the root JSON into the shape the builder, auth,
// profile, settings, and share components already use. If a string in the
// root JSON changes, every screen using this export changes with it. The
// tools site domain is on hold. Use a placeholder only, never a real
// domain, and never check domain availability.
// No price, platform rule, or product fact is invented in this file.

import rootCopy from "../../../../config/site-copy.json";

export const siteCopy = {
  brand: rootCopy.brand.name,
  demoNotice: rootCopy.demoNotice,
  tagline: rootCopy.tagline,
  entryPoints: rootCopy.entryPoints,
  auth: rootCopy.auth,
  builder: rootCopy.builder,
  profile: rootCopy.profile,
  settings: rootCopy.settings,
  share: rootCopy.share,
  errors: rootCopy.errors,
} as const;

export type SiteCopySupplement = typeof siteCopy;
