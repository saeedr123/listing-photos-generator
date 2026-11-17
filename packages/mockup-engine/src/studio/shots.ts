// Shot rules. A shot is model(s) plus camera plus lighting plus
// background. The background comes from the style kit, so a shot holds
// no colour and no wording of its own.

import type { LightingPreset, ModelRegistryEntry, ShotDefinition, StudioIssue, TextArea } from "./types.ts";
import { SHOT_ROLES } from "./types.ts";
import { isUsableInShots } from "./model-registry.ts";
import { isFiniteNumber, isSlug, isVec3, versionIssues } from "./validate-common.ts";

function textAreaIssues(area: TextArea | null, name: string, what: string): StudioIssue[] {
  if (area === null) return [];
  const issues: StudioIssue[] = [];
  const inside =
    [area.x, area.y, area.w, area.h].every(isFiniteNumber) &&
    area.x >= 0 && area.y >= 0 && area.w > 0 && area.h > 0 && area.x + area.w <= 1000 && area.y + area.h <= 1000;
  if (!inside) {
    issues.push({ code: "text-area-out-of-frame", message: `${what}: the ${name} text area is outside the 0 to 1000 frame.` });
  }
  if (!["left", "center", "right"].includes(area.align)) {
    issues.push({ code: "bad-text-align", message: `${what}: the ${name} text area align must be left, center or right.` });
  }
  return issues;
}

export interface ShotValidationContext {
  models: ModelRegistryEntry[];
  lighting: LightingPreset[];
}

/** A shot the studio may use: published, or in preview when preview items are allowed. */
export function shotStatusUsable(shot: ShotDefinition, allowPreview: boolean): boolean {
  return shot.status === "published" || (allowPreview && shot.status === "preview");
}

/**
 * Validate a shot. With a context, also check that every model and the
 * lighting preset exist. A published shot may only use models that are
 * themselves enabled.
 */
export function validateShot(shot: ShotDefinition, context?: ShotValidationContext): StudioIssue[] {
  const issues: StudioIssue[] = [];
  const what = `Shot ${shot.id || "(no id)"}`;
  const fail = (code: string, message: string) => issues.push({ code, message });

  if (!isSlug(shot.id) || !isSlug(shot.slug) || !shot.name || !shot.name.trim()) {
    fail("missing-identity", `${what}: id, slug and name are required.`);
  }
  if (!(SHOT_ROLES as readonly string[]).includes(shot.role)) {
    fail("bad-role", `${what}: role must be one of ${SHOT_ROLES.join(", ")}.`);
  }
  issues.push(...versionIssues(what, shot));
  if (!shot.aspect || !(shot.aspect.w > 0) || !(shot.aspect.h > 0)) {
    fail("bad-aspect", `${what}: aspect needs a positive width and height, for example 3 to 2.`);
  }
  if (!shot.models || shot.models.length === 0) {
    fail("no-models", `${what}: a shot needs at least one model.`);
  }
  for (const [index, placement] of (shot.models || []).entries()) {
    const where = `${what}, model ${index + 1}`;
    if (!isSlug(placement.modelId)) fail("bad-model-id", `${where}: model id is not valid.`);
    if (!isVec3(placement.position) || !isVec3(placement.rotationDeg)) {
      fail("bad-placement", `${where}: position and rotation must each be three finite numbers.`);
    }
    if (!isFiniteNumber(placement.scale) || placement.scale <= 0) {
      fail("bad-scale", `${where}: scale must be a positive number.`);
    }
    for (const [surfaceId, page] of Object.entries(placement.surfacePages || {})) {
      if (!Number.isInteger(page) || page < 0) {
        fail("bad-surface-page", `${where}: page for surface ${surfaceId} must be a whole number from 0.`);
      }
    }
    if (context) {
      const model = context.models.find((m) => m.id === placement.modelId);
      if (!model) {
        fail("model-not-found", `${where}: model ${placement.modelId} is not in the registry.`);
      } else {
        if (model.renderer !== "glb-3d") {
          fail("model-not-3d", `${where}: model ${model.id} is a 2D fallback and cannot be used in a 3D shot.`);
        } else if (shot.status === "published" && !isUsableInShots(model)) {
          fail("model-not-enabled", `${where}: model ${model.id} is not enabled, so a published shot must not use it.`);
        }
        for (const surfaceId of Object.keys(placement.surfacePages || {})) {
          if (!model.surfaces.some((s) => s.id === surfaceId)) {
            fail("surface-not-found", `${where}: model ${model.id} has no surface ${surfaceId}.`);
          }
        }
        if (placement.colourOptionId !== null && !model.colourOptions.some((c) => c.id === placement.colourOptionId)) {
          fail("colour-option-not-found", `${where}: model ${model.id} has no colour option ${placement.colourOptionId}.`);
        }
      }
    }
  }

  const camera = shot.camera;
  if (!camera || !isVec3(camera.position) || !isVec3(camera.target)) {
    fail("bad-camera-vector", `${what}: camera position and target must each be three finite numbers.`);
  } else if (camera.position.every((value, i) => Math.abs(value - camera.target[i]) < 1e-6)) {
    fail("camera-on-target", `${what}: camera position and target must not be the same point.`);
  }
  if (!camera || !isFiniteNumber(camera.fovDeg) || camera.fovDeg < 5 || camera.fovDeg > 90) {
    fail("bad-camera-fov", `${what}: field of view must be between 5 and 90 degrees.`);
  }

  if (!shot.lightingPresetId) {
    fail("no-lighting", `${what}: a shot needs a lighting preset.`);
  } else if (context && !context.lighting.some((l) => l.id === shot.lightingPresetId)) {
    fail("lighting-not-found", `${what}: lighting preset ${shot.lightingPresetId} is not in the registry.`);
  }

  const shadow = shot.contactShadow;
  if (
    !shadow ||
    !isFiniteNumber(shadow.opacity) || shadow.opacity < 0 || shadow.opacity > 1 ||
    !isFiniteNumber(shadow.blur) || shadow.blur < 0 || shadow.blur > 1 ||
    !isFiniteNumber(shadow.planeSizeMetres) || shadow.planeSizeMetres <= 0 ||
    !isFiniteNumber(shadow.heightMetres) || shadow.heightMetres <= 0
  ) {
    fail("bad-contact-shadow", `${what}: contact shadow needs opacity and blur from 0 to 1, and a positive plane size and height.`);
  }

  if (!shot.textLayout) {
    fail("no-text-layout", `${what}: text layout is required, with null for each slot the shot does not use.`);
  } else {
    issues.push(...textAreaIssues(shot.textLayout.headline, "headline", what));
    issues.push(...textAreaIssues(shot.textLayout.bullets, "bullets", what));
    issues.push(...textAreaIssues(shot.textLayout.badge, "badge", what));
  }
  return issues;
}

/** How many design pages a shot needs: the highest page index it shows, plus one. */
export function pagesNeededByShot(shot: ShotDefinition, models: ModelRegistryEntry[]): number {
  let highest = -1;
  for (const placement of shot.models) {
    const model = models.find((m) => m.id === placement.modelId);
    if (!model) continue;
    for (const surface of model.surfaces) {
      const page = placement.surfacePages[surface.id] ?? surface.pageSlot;
      highest = Math.max(highest, page);
    }
  }
  return highest + 1;
}
