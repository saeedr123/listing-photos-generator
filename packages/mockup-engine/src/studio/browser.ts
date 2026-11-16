// Browser safe entry point of the 3D studio modules.
// Pure functions and types only: no node:fs, no storage implementation.
// Client components import this entry. Server code may import it too.

export * from "./types.ts";
export * from "./validate-common.ts";
export * from "./glb-inspect.ts";
export * from "./model-registry.ts";
export * from "./legacy-migration.ts";
export * from "./surface-fit.ts";
export * from "./shots.ts";
export * from "./style-kit.ts";
export * from "./colour.ts";
export * from "./batch.ts";
export * from "./pixel-diff.ts";
export * from "./render-jobs.ts";
export * from "./studio-config.ts";
export type { HumanReviewSignOff, Orientation, PremiumCriteria, QualityLabel } from "../types.ts";
export { orientationOf } from "../fit.ts";
export { hasApprovedHumanReview } from "../premium.ts";
