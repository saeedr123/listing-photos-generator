// Browser safe entry point of @listing-photos-generator/admin.
// Exports only the pure modules, no node:fs. Server components use the
// main entry point (which also exports loadRootConfig) instead.

export { checkLicence, validateMockupAddFlow } from "./licence.ts";
export type { AddFlowInput, LicenceCheck, LicenceRecord } from "./licence.ts";
export { checkPackGovernance, packsNeedingReview } from "./governance.ts";
export type { GovernedPack, GovernanceCheck } from "./governance.ts";
export { isEnabled, setFlag, visibleToPlan } from "./feature-flags.ts";
export type { FeatureFlag, FlagScope, FlagTargetKind } from "./feature-flags.ts";
export { churnCounts, exportMonitoring, summarizeUsage } from "./analytics.ts";
export type { AnalyticsEvent, AnalyticsEventType, ExportBreakdown, UsageSummary } from "./analytics.ts";
export { freePlanKeepsOnePack, validatePlanChange, validateTrialChange } from "./entitlements.ts";
export type { PlanConfig, PlanEntitlements, TrialConfig } from "./entitlements.ts";
export { hideVersion, nextVersion, onlyOnePublished, publishVersion, rollbackVersion } from "./versioning.ts";
export type { VersionedItem, VersionStatus } from "./versioning.ts";
export { InMemoryAdminStore, seedAdminStore } from "./admin-store.ts";
export type { AdminLogEntry, AdminUserRow, SubscriptionRow } from "./admin-store.ts";
