// Feature flags: turn a template, mockup, niche pack, platform pack, or
// AI feature on or off per plan or globally, without a deployment.
// Scope "global" applies to everyone; scope "plan:<slug>" applies only
// to that plan. A plan flag overrides the global flag for that plan.
// Disabled means hidden from sellers but kept in admin with history.

export type FlagTargetKind = "template" | "mockup" | "niche-pack" | "platform-pack" | "ai-feature";
export type FlagScope = "global" | string;

export interface FeatureFlag {
  id: string;
  targetKind: FlagTargetKind;
  targetId: string;
  scope: FlagScope;
  enabled: boolean;
  updatedBy: string;
  updatedAt: string;
  reason: string | null;
}

export function setFlag(flags: FeatureFlag[], input: { targetKind: FlagTargetKind; targetId: string; scope: FlagScope; enabled: boolean; updatedBy: string; reason?: string | null }): FeatureFlag[] {
  const existing = flags.find((f) => f.targetKind === input.targetKind && f.targetId === input.targetId && f.scope === input.scope);
  const updated: FeatureFlag = existing
    ? { ...existing, enabled: input.enabled, updatedBy: input.updatedBy, updatedAt: new Date().toISOString(), reason: input.reason ?? null }
    : { id: input.targetKind + ":" + input.targetId + ":" + input.scope, targetKind: input.targetKind, targetId: input.targetId, scope: input.scope, enabled: input.enabled, updatedBy: input.updatedBy, updatedAt: new Date().toISOString(), reason: input.reason ?? null };
  return existing ? flags.map((f) => (f === existing ? updated : f)) : [...flags, updated];
}

export function isEnabled(flags: FeatureFlag[], targetKind: FlagTargetKind, targetId: string, planSlug: string | null): boolean {
  const planFlag = planSlug ? flags.find((f) => f.targetKind === targetKind && f.targetId === targetId && f.scope === "plan:" + planSlug) : undefined;
  if (planFlag) return planFlag.enabled;
  const globalFlag = flags.find((f) => f.targetKind === targetKind && f.targetId === targetId && f.scope === "global");
  if (globalFlag) return globalFlag.enabled;
  return true;
}

export function visibleToPlan(flags: FeatureFlag[], targetKind: FlagTargetKind, targetIds: string[], planSlug: string): string[] {
  return targetIds.filter((id) => isEnabled(flags, targetKind, id, planSlug));
}
