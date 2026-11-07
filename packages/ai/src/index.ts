// Main entry point of @listing-photos-generator/ai. Re-exports the browser
// safe API plus the Node config loaders. Server code imports from here.
// Client components import from "@listing-photos-generator/ai/browser".

export * from "./browser.ts";
export {
  defaultRepoRoot,
  loadAiProviderConfig,
  loadCopyPrompts,
  loadEtsyLimits,
  loadNichePacks,
  loadPlans,
} from "./loaders.ts";
export type { CopyPromptsConfig, PlansConfigFile } from "./loaders.ts";
