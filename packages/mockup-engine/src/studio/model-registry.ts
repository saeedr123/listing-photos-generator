// Model registry rules: validation, the admin add flow, and version
// operations. Adding a model needs no code change: upload a GLB, name the
// screen mesh, set presets, preview, enable. Duplicate, edit, hide and
// roll back are version operations, per PROMPT.md section 7.3. Pure: no
// storage and no 3D library here.

import type { Orientation } from "../types.ts";
import { hasApprovedHumanReview } from "../premium.ts";
import type { GlbInfo } from "./glb-inspect.ts";
import {
  MODEL_CATEGORIES,
  type CameraPreset,
  type ModelRegistryEntry,
  type StudioIssue,
} from "./types.ts";
import { isFiniteNumber, isHexColour, isSlug, isVec3, missingLicenceFields, versionIssues } from "./validate-common.ts";

const ORIENTATIONS: Orientation[] = ["landscape", "portrait", "square"];

export function validateCameraPreset(preset: CameraPreset, what: string): StudioIssue[] {
  const issues: StudioIssue[] = [];
  if (!preset.id || !isSlug(preset.id)) {
    issues.push({ code: "bad-camera-id", message: `${what}: a camera preset needs an id of lower case letters, digits and hyphens.` });
  }
  if (!isVec3(preset.position) || !isVec3(preset.target)) {
    issues.push({ code: "bad-camera-vector", message: `${what}: camera position and target must each be three finite numbers.` });
  } else if (preset.position.every((value, i) => Math.abs(value - preset.target[i]) < 1e-6)) {
    issues.push({ code: "camera-on-target", message: `${what}: camera position and target must not be the same point.` });
  }
  if (!isFiniteNumber(preset.fovDeg) || preset.fovDeg < 5 || preset.fovDeg > 90) {
    issues.push({ code: "bad-camera-fov", message: `${what}: field of view must be between 5 and 90 degrees.` });
  }
  return issues;
}

/**
 * Validate a registry entry. Structural rules apply at every status.
 * Rules that gate the live library (licence, preview, unbranded) apply
 * when the entry is published. The premium rule applies at every status.
 */
export function validateModelEntry(entry: ModelRegistryEntry): StudioIssue[] {
  const issues: StudioIssue[] = [];
  const what = `Model ${entry.id || "(no id)"}`;
  const fail = (code: string, message: string) => issues.push({ code, message });

  if (!isSlug(entry.id) || !isSlug(entry.slug) || !entry.name || !entry.name.trim()) {
    fail("missing-identity", `${what}: id, slug and name are required. Id and slug use lower case letters, digits and hyphens.`);
  }
  if (!(MODEL_CATEGORIES as readonly string[]).includes(entry.category)) {
    fail("bad-category", `${what}: category must be one of ${MODEL_CATEGORIES.join(", ")}.`);
  }
  if (!Array.isArray(entry.tags) || entry.tags.some((tag) => typeof tag !== "string" || !tag.trim())) {
    fail("bad-tags", `${what}: tags must be a list of non empty strings.`);
  }
  issues.push(...versionIssues(what, entry));

  if (entry.renderer === "glb-3d") {
    if (!entry.modelFile || !entry.modelFile.storageKey) {
      fail("missing-model-file", `${what}: upload a GLB model file.`);
    }
    if (!entry.surfaces || entry.surfaces.length === 0) {
      fail("no-surface", `${what}: name at least one screen or paper mesh.`);
    }
    if (!entry.cameraPresets || entry.cameraPresets.length === 0) {
      fail("no-camera-preset", `${what}: set at least one camera preset.`);
    }
  } else if (entry.renderer === "svg-2d") {
    if (!entry.legacyFrame || !entry.legacyFrame.frameFile) {
      fail("missing-legacy-frame", `${what}: a 2D fallback entry must keep its frame file reference.`);
    }
    if (entry.qualityLabel !== "basic") {
      fail("legacy-not-basic", `${what}: a flat 2D frame is a basic fallback and must be labelled basic.`);
    }
  } else {
    fail("bad-renderer", `${what}: renderer must be glb-3d or svg-2d.`);
  }

  const surfaceIds = new Set<string>();
  const meshNames = new Set<string>();
  for (const surface of entry.surfaces || []) {
    if (!isSlug(surface.id)) fail("bad-surface-id", `${what}: surface id ${JSON.stringify(surface.id)} is not valid.`);
    if (surfaceIds.has(surface.id)) fail("duplicate-surface", `${what}: surface id ${surface.id} is used twice.`);
    surfaceIds.add(surface.id);
    if (!surface.meshName || !surface.meshName.trim()) {
      fail("missing-mesh-name", `${what}: surface ${surface.id} has no mesh name.`);
    }
    if (meshNames.has(surface.meshName)) fail("duplicate-mesh", `${what}: mesh ${surface.meshName} is named by two surfaces.`);
    meshNames.add(surface.meshName);
    if (surface.kind !== "screen" && surface.kind !== "paper") {
      fail("bad-surface-kind", `${what}: surface ${surface.id} kind must be screen or paper.`);
    }
    if (!isFiniteNumber(surface.aspect) || surface.aspect <= 0) {
      fail("bad-surface-aspect", `${what}: surface ${surface.id} aspect must be a positive number, width divided by height.`);
    }
    if (!Number.isInteger(surface.pageSlot) || surface.pageSlot < 0) {
      fail("bad-page-slot", `${what}: surface ${surface.id} page slot must be a whole number from 0.`);
    }
    if (!isHexColour(surface.letterboxColour)) {
      fail("bad-letterbox-colour", `${what}: surface ${surface.id} letterbox colour must be a hex colour such as #000000.`);
    }
  }

  if (!entry.allowedOrientations || entry.allowedOrientations.length === 0) {
    fail("no-orientations", `${what}: set the allowed orientations.`);
  } else if (entry.allowedOrientations.some((o) => !ORIENTATIONS.includes(o))) {
    fail("bad-orientation", `${what}: orientations must be landscape, portrait or square.`);
  }

  const presetIds = new Set<string>();
  for (const preset of entry.cameraPresets || []) {
    issues.push(...validateCameraPreset(preset, what));
    if (presetIds.has(preset.id)) fail("duplicate-camera-preset", `${what}: camera preset ${preset.id} is used twice.`);
    presetIds.add(preset.id);
  }
  if (entry.cameraPresets && entry.cameraPresets.length > 0) {
    if (!entry.defaultCameraPresetId || !presetIds.has(entry.defaultCameraPresetId)) {
      fail("bad-default-camera", `${what}: the default camera preset must be one of the saved presets.`);
    }
  }

  const colourIds = new Set<string>();
  for (const option of entry.colourOptions || []) {
    if (!isSlug(option.id)) fail("bad-colour-id", `${what}: colour option id ${JSON.stringify(option.id)} is not valid.`);
    if (colourIds.has(option.id)) fail("duplicate-colour-option", `${what}: colour option ${option.id} is used twice.`);
    colourIds.add(option.id);
    if (!option.materialName || !option.materialName.trim()) {
      fail("missing-colour-material", `${what}: colour option ${option.id} must name a material.`);
    }
    if (!isHexColour(option.colour)) fail("bad-colour", `${what}: colour option ${option.id} must be a hex colour.`);
  }
  if (entry.defaultColourOptionId !== null && !colourIds.has(entry.defaultColourOptionId)) {
    fail("bad-default-colour", `${what}: the default colour option must be one of the colour options.`);
  }

  // Premium, per PROMPT.md 9.2 and 9.4, at every status.
  if (entry.qualityLabel === "premium") {
    const c = entry.premiumCriteria;
    const unmet: string[] = [];
    if (!c.realisticPerspective) unmet.push("realistic perspective");
    if (!c.softRealisticShadows) unmet.push("soft realistic shadows");
    if (!c.depth) unmet.push("depth");
    if (!c.lifestyleOrDeskScene) unmet.push("lifestyle or desk scene");
    if (!c.realisticMaterialsAndEdges) unmet.push("realistic materials and edges");
    if (!c.screenCrispAtExportSize) unmet.push("screen crisp at export size");
    if (unmet.length > 0) {
      fail("premium-check-failed", `${what} is labelled premium but fails: ${unmet.join(", ")}. Label it basic until every premium point is met.`);
    }
    if (!hasApprovedHumanReview(entry.humanReview)) {
      fail(
        "premium-no-human-review",
        `${what} is labelled premium but has no approved human visual review sign-off. Label it basic until the review is recorded.`,
      );
    }
  }

  if (entry.status === "published") {
    const missing = missingLicenceFields(entry.licence);
    if (missing.length > 0) {
      fail("licence-incomplete", `${what} must not be enabled. Missing: ${missing.join(", ")}.`);
    }
    if (entry.renderer === "glb-3d") {
      if (!entry.unbrandedConfirmed) {
        fail("unbranded-not-confirmed", `${what}: confirm the model shows no brand logo or trademark before enabling it.`);
      }
      if (!entry.previewedWithRealRender) {
        fail("not-previewed", `${what}: preview the model with a real product render before enabling it.`);
      }
    }
  }
  return issues;
}

/** Check the names an entry relies on against what the uploaded GLB really contains. */
export function validateEntryAgainstGlb(entry: ModelRegistryEntry, glb: GlbInfo): StudioIssue[] {
  const issues: StudioIssue[] = [];
  const what = `Model ${entry.id}`;
  if (!glb.valid) {
    issues.push({ code: "glb-invalid", message: `${what}: ${glb.error ?? "the model file could not be read."}` });
    return issues;
  }
  for (const surface of entry.surfaces) {
    if (!glb.meshNodeNames.includes(surface.meshName)) {
      issues.push({
        code: "mesh-not-in-glb",
        message: `${what}: mesh ${JSON.stringify(surface.meshName)} is not in the uploaded GLB. Meshes found: ${glb.meshNodeNames.join(", ") || "none"}.`,
      });
    }
  }
  for (const option of entry.colourOptions) {
    if (!glb.materialNames.includes(option.materialName)) {
      issues.push({
        code: "material-not-in-glb",
        message: `${what}: material ${JSON.stringify(option.materialName)} is not in the uploaded GLB. Materials found: ${glb.materialNames.join(", ") || "none"}.`,
      });
    }
  }
  return issues;
}

export interface ModelAddFlowResult {
  readyToEnable: boolean;
  missingSteps: string[];
  issues: StudioIssue[];
}

/** The admin add flow, in order: upload GLB, name the screen mesh, set presets, preview, enable. */
export function validateModelAddFlow(entry: ModelRegistryEntry, glb: GlbInfo | null): ModelAddFlowResult {
  const missingSteps: string[] = [];
  if (!entry.modelFile || !entry.modelFile.storageKey || !glb || !glb.valid) {
    missingSteps.push("Upload a GLB model file.");
  }
  const meshNamed =
    entry.surfaces.length > 0 &&
    entry.surfaces.every((s) => s.meshName && (!glb || !glb.valid || glb.meshNodeNames.includes(s.meshName)));
  if (!meshNamed) missingSteps.push("Name the screen mesh.");
  if (entry.cameraPresets.length === 0 || !entry.defaultCameraPresetId) missingSteps.push("Set camera presets.");
  if (!entry.allowedOrientations || entry.allowedOrientations.length === 0) missingSteps.push("Set allowed orientations.");
  if (!entry.previewedWithRealRender) missingSteps.push("Preview it with a real product render.");
  const licenceMissing = missingLicenceFields(entry.licence);
  if (licenceMissing.length > 0) missingSteps.push(`Complete the licence record: ${licenceMissing.join(", ")}.`);
  if (!entry.unbrandedConfirmed) missingSteps.push("Confirm the model shows no brand logo or trademark.");
  const issues = [
    ...validateModelEntry({ ...entry, status: "published" }),
    ...(glb ? validateEntryAgainstGlb(entry, glb) : []),
  ];
  return { readyToEnable: missingSteps.length === 0 && issues.length === 0, missingSteps, issues };
}

// ---- Version operations ---------------------------------------------------
// Each returns a new entry. None edits in place. The caller stores the
// result as the next version.

export interface VersionContext {
  actor: string;
  /** ISO date or date time, supplied by the caller so the functions stay pure. */
  now: string;
}

function requireNote(note: string, what: string): string {
  if (!note || !note.trim()) throw new Error(`${what} needs a note that says why.`);
  return note.trim();
}

export function editModel(
  current: ModelRegistryEntry,
  changes: Partial<Omit<ModelRegistryEntry, "id" | "version" | "previousVersion" | "createdAt">>,
  changeNote: string,
  context: VersionContext,
): ModelRegistryEntry {
  return {
    ...current,
    ...changes,
    id: current.id,
    version: current.version + 1,
    previousVersion: current.version,
    changeNote: requireNote(changeNote, "An edit"),
    createdAt: current.createdAt,
    updatedAt: context.now,
    updatedBy: context.actor,
  };
}

/** A duplicate starts as a draft at version 1 and must be previewed again before it can be enabled. */
export function duplicateModel(
  source: ModelRegistryEntry,
  newId: string,
  newName: string,
  context: VersionContext,
): ModelRegistryEntry {
  if (!isSlug(newId)) throw new Error("A duplicate needs an id of lower case letters, digits and hyphens.");
  if (newId === source.id) throw new Error("A duplicate needs its own id.");
  return {
    ...source,
    id: newId,
    slug: newId,
    name: newName.trim() || `${source.name} copy`,
    version: 1,
    previousVersion: null,
    status: "draft",
    previewedWithRealRender: false,
    qualityLabel: "basic",
    humanReview: null,
    changeNote: `Duplicated from ${source.id} version ${source.version}.`,
    createdAt: context.now,
    updatedAt: context.now,
    updatedBy: context.actor,
  };
}

export function hideModel(current: ModelRegistryEntry, reason: string, context: VersionContext): ModelRegistryEntry {
  return editModel(current, { status: "hidden" }, `Hidden: ${requireNote(reason, "Hiding a model")}`, context);
}

/** Enable a model. Throws with every reason when the entry is not ready. */
export function publishModel(current: ModelRegistryEntry, changeNote: string, context: VersionContext): ModelRegistryEntry {
  const next = editModel(current, { status: "published" }, changeNote, context);
  const issues = validateModelEntry(next);
  if (issues.length > 0) {
    throw new Error(`Cannot enable ${current.id}: ${issues.map((i) => i.message).join(" ")}`);
  }
  return next;
}

/** Rollback makes a new version from an older snapshot. It never overwrites history and never goes live by itself. */
export function rollbackModel(
  current: ModelRegistryEntry,
  older: ModelRegistryEntry,
  reason: string,
  context: VersionContext,
): ModelRegistryEntry {
  if (older.id !== current.id) throw new Error("Rollback must use an older version of the same model.");
  if (older.version >= current.version) throw new Error("Rollback must go to an older version.");
  return {
    ...older,
    version: current.version + 1,
    previousVersion: current.version,
    status: "preview",
    changeNote: `Rollback to version ${older.version}: ${requireNote(reason, "A rollback")}`,
    updatedAt: context.now,
    updatedBy: context.actor,
  };
}

/**
 * Can a shot use this model? Only an enabled 3D model, by default. With
 * allowPreview, a model in preview status counts too, and anything built
 * with it is a proof only, never a publishable set.
 */
export function isUsableInShots(entry: ModelRegistryEntry, allowPreview = false): boolean {
  const statusOk = entry.status === "published" || (allowPreview && entry.status === "preview");
  return entry.renderer === "glb-3d" && statusOk && validateModelEntry(entry).length === 0;
}
