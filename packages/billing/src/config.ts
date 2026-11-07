// Plans config loading and validation.
// The single source is config/plans.json at the repo root. Admin edits that
// config, or the matching Plan rows in the database, never application code.
// A null price means not decided, never zero and never a hidden price.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BillingError } from "./types.ts";
import type { ChangeLogEntry, PlanConfig, PlansConfig } from "./types.ts";

export function plansConfigPath(): string {
  return join(new URL("../../../config/plans.json", import.meta.url).pathname, "");
}

export function loadPlansConfig(path?: string): PlansConfig {
  const filePath = path ?? plansConfigPath();
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch {
    throw new BillingError(
      "plans_config_missing",
      "Plans config could not be read. Billing is blocked until config/plans.json exists.",
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new BillingError(
      "plans_config_invalid",
      "Plans config is not valid JSON. Billing is blocked until an admin fixes config/plans.json.",
    );
  }
  return validatePlansConfig(parsed);
}

export function validatePlansConfig(value: unknown): PlansConfig {
  if (typeof value !== "object" || value === null) {
    throw new BillingError("plans_config_invalid", "Plans config must be an object.");
  }
  const config = value as PlansConfig;
  if (!Array.isArray(config.plans) || config.plans.length === 0) {
    throw new BillingError("plans_config_invalid", "Plans config must list at least one plan.");
  }
  if (!config.trial || typeof config.trial.duration_days !== "number") {
    throw new BillingError("plans_config_invalid", "Plans config must set a trial duration in days.");
  }
  if (!config.billing) {
    throw new BillingError("plans_config_invalid", "Plans config must include a billing section with VAT and refund placeholders.");
  }
  return config;
}

export function getPlan(config: PlansConfig, slug: string): PlanConfig {
  const plan = config.plans.find((candidate) => candidate.slug === slug);
  if (!plan) {
    throw new BillingError("plan_not_found", "Plan not found: " + slug + ".");
  }
  return plan;
}

export function getFreePlan(config: PlansConfig): PlanConfig {
  return getPlan(config, "free");
}

export function getPremiumPlan(config: PlansConfig): PlanConfig {
  return getPlan(config, "premium");
}

// Append one entry to the config change log and bump the config version.
// Pure function: it returns a new config object and does not mutate the
// input. Admin callers persist the returned config. Every entitlement,
// trial, price, VAT, or refund change must go through this function so the
// change is recorded with date, actor, field, old value, new value, and
// reason. No change is silent.
export function recordEntitlementChange(
  config: PlansConfig,
  entry: ChangeLogEntry,
): PlansConfig {
  const next: PlansConfig = JSON.parse(JSON.stringify(config)) as PlansConfig;
  if (!Array.isArray(next.change_log)) {
    next.change_log = [];
  }
  next.change_log.push(entry);
  next.version = config.version + 1;
  return next;
}
