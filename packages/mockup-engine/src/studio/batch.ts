// Batch planning. One design (or several pages) plus one style kit gives
// the ordered image set for a listing. This module decides the order,
// the file names, the pixel size and what each image shows. It renders
// nothing. Every platform value (pixel size, format, image limit, first
// image rules) comes from the platform pack, never from this file.

import { orientationOf } from "../fit.ts";
import type { Orientation } from "../types.ts";
import { isUsableInShots } from "./model-registry.ts";
import { pagesNeededByShot, shotStatusUsable, validateShot } from "./shots.ts";
import { backgroundForShot, kitIsProofOnly } from "./style-kit.ts";
import { computeSurfaceTextureLayout } from "./surface-fit.ts";
import type {
  BackgroundSpec,
  DesignPage,
  LightingPreset,
  ModelRegistryEntry,
  ShotDefinition,
  StyleKit,
} from "./types.ts";

/** The slice of a platform pack the studio needs. Built from the pack by exportSettingsFromPack. */
export interface StudioExportSettings {
  platformId: string;
  packSlug: string;
  packVersion: number;
  format: string;
  colourProfile: string;
  quality: number;
  shortestSidePx: number;
  maxImages: number;
  firstImageOrientations: Orientation[];
  firstImageAvoidTextOverlay: boolean;
}

/** Structural match for the PlatformPack type in packages/template-engine. */
export interface PlatformPackLike {
  platformId: string;
  packSlug: string;
  packVersion: number;
  export: { format: string; shortestSidePx: number; colourProfile: string; quality: number; maxImages: number };
  firstImage: { orientations: Orientation[]; avoidTextOverlay: boolean };
}

export function exportSettingsFromPack(pack: PlatformPackLike): StudioExportSettings {
  return {
    platformId: pack.platformId,
    packSlug: pack.packSlug,
    packVersion: pack.packVersion,
    format: pack.export.format,
    colourProfile: pack.export.colourProfile,
    quality: pack.export.quality,
    shortestSidePx: pack.export.shortestSidePx,
    maxImages: pack.export.maxImages,
    firstImageOrientations: pack.firstImage.orientations,
    firstImageAvoidTextOverlay: pack.firstImage.avoidTextOverlay,
  };
}

/** Output pixel size for a shot: the pack fixes the shortest side, the shot fixes the aspect. */
export function outputSizeForShot(shot: ShotDefinition, shortestSidePx: number): { widthPx: number; heightPx: number } {
  const { w, h } = shot.aspect;
  if (w >= h) return { widthPx: Math.round((shortestSidePx * w) / h), heightPx: shortestSidePx };
  return { widthPx: shortestSidePx, heightPx: Math.round((shortestSidePx * h) / w) };
}

export interface BatchSurfacePlan {
  modelIndex: number;
  modelId: string;
  modelVersion: number;
  surfaceId: string;
  pageIndex: number;
  designPageId: string;
  designWidthPx: number;
  designHeightPx: number;
  warnings: string[];
}

export interface BatchItemText {
  headline: string | null;
  bullets: string[];
  badge: string | null;
}

export interface BatchItem {
  position: number;
  shotId: string;
  shotVersion: number;
  role: string;
  fileName: string;
  widthPx: number;
  heightPx: number;
  background: BackgroundSpec;
  text: BatchItemText;
  surfaces: BatchSurfacePlan[];
  sellerNote: string;
  warnings: string[];
}

export interface BatchTargets {
  targetMinImages: number;
  targetMaxImages: number;
}

export interface BatchPlanInput {
  kit: StyleKit;
  shots: ShotDefinition[];
  models: ModelRegistryEntry[];
  lighting: LightingPreset[];
  exportSettings: StudioExportSettings;
  designPages: DesignPage[];
  targets: BatchTargets;
  /** Allow models and shots in preview status. Anything built with one is a proof only. */
  allowPreviewItems: boolean;
}

export interface BatchPlan {
  kitId: string;
  kitVersion: number;
  /** True when the set is a layout proof, not a publishable set. proofReasons says why. */
  proofMode: boolean;
  proofReasons: string[];
  items: BatchItem[];
  skipped: { shotId: string; reason: string }[];
  warnings: string[];
  errors: string[];
  canExport: boolean;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function planBatch(input: BatchPlanInput): BatchPlan {
  const { kit, shots, models, lighting, exportSettings, designPages, targets, allowPreviewItems } = input;
  const previewItems = new Set<string>();
  const items: BatchItem[] = [];
  const skipped: { shotId: string; reason: string }[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  if (designPages.length === 0) {
    errors.push("Upload the design first. The image set is built only from the real design, never from invented content.");
  }

  for (const kitShot of kit.shots) {
    const shot = shots.find((s) => s.id === kitShot.shotId);
    if (!shot) {
      skipped.push({ shotId: kitShot.shotId, reason: "This shot is not in the registry." });
      continue;
    }
    if (!shotStatusUsable(shot, allowPreviewItems)) {
      skipped.push({ shotId: shot.id, reason: `This shot is ${shot.status}, not published.` });
      continue;
    }
    if (shot.status !== "published") previewItems.add(`shot ${shot.id}`);
    const shotIssues = validateShot(shot, { models, lighting });
    if (shotIssues.length > 0) {
      skipped.push({ shotId: shot.id, reason: shotIssues.map((i) => i.message).join(" ") });
      continue;
    }
    const shotModels = shot.models.map((placement) => models.find((m) => m.id === placement.modelId));
    if (shotModels.some((model) => !model || !isUsableInShots(model, allowPreviewItems))) {
      skipped.push({ shotId: shot.id, reason: "A model in this shot is not enabled." });
      continue;
    }
    for (const model of shotModels) {
      if (model && model.status !== "published") previewItems.add(`model ${model.id}`);
    }
    const needed = pagesNeededByShot(shot, models);
    if (designPages.length < needed) {
      skipped.push({
        shotId: shot.id,
        reason: `This shot shows ${needed} design pages and the design has ${designPages.length}. A page is never repeated or invented to fill it.`,
      });
      continue;
    }

    const position = items.length + 1;
    const size = outputSizeForShot(shot, exportSettings.shortestSidePx);
    const itemWarnings: string[] = [];
    const surfaces: BatchSurfacePlan[] = [];
    shot.models.forEach((placement, modelIndex) => {
      const model = models.find((m) => m.id === placement.modelId)!;
      for (const surface of model.surfaces) {
        const pageIndex = placement.surfacePages[surface.id] ?? surface.pageSlot;
        const page = designPages[pageIndex];
        const layout = computeSurfaceTextureLayout({
          designWidthPx: page.widthPx,
          designHeightPx: page.heightPx,
          surfaceAspect: surface.aspect,
          // The GPU limit is only known in the browser. Planning uses a
          // large value so only orientation warnings are raised here.
          maxTextureSizePx: 1 << 20,
        });
        const surfaceWarnings = [...layout.warnings];
        const orientation = orientationOf(page.widthPx, page.heightPx);
        if (!model.allowedOrientations.includes(orientation)) {
          surfaceWarnings.push(
            `${model.name} is set up for ${model.allowedOrientations.join(" or ")} content and this page is ${orientation}. Offer a matching screenshot or an approved crop. Never stretch.`,
          );
        }
        for (const warning of surfaceWarnings) {
          if (!itemWarnings.includes(warning)) itemWarnings.push(warning);
        }
        surfaces.push({
          modelIndex,
          modelId: model.id,
          modelVersion: model.version,
          surfaceId: surface.id,
          pageIndex,
          designPageId: page.id,
          designWidthPx: page.widthPx,
          designHeightPx: page.heightPx,
          warnings: surfaceWarnings,
        });
      }
    });

    // Text comes from the kit and only where both the kit entry and the
    // shot layout allow it. An empty slot is left out, never filled.
    let headline = kitShot.showHeadline && shot.textLayout.headline && kit.textSlots.headline.trim() ? kit.textSlots.headline.trim() : null;
    let bullets = kitShot.showBullets && shot.textLayout.bullets ? kit.textSlots.featureBullets.map((b) => b.trim()).filter(Boolean) : [];
    let badge = kitShot.showBadge && shot.textLayout.badge && kit.badge.style !== "none" && kit.badge.wording.trim() ? kit.badge.wording.trim() : null;
    if (position === 1 && exportSettings.firstImageAvoidTextOverlay && (headline || bullets.length > 0 || badge)) {
      headline = null;
      bullets = [];
      badge = null;
      itemWarnings.push(
        `The ${exportSettings.platformId} pack says to avoid text overlays on the first image, so the text is left off image 1.`,
      );
    }

    items.push({
      position,
      shotId: shot.id,
      shotVersion: shot.version,
      role: shot.role,
      fileName: `${pad2(position)}-${shot.slug}.${exportSettings.format}`,
      widthPx: size.widthPx,
      heightPx: size.heightPx,
      background: backgroundForShot(kit, shot.id),
      text: { headline, bullets, badge },
      surfaces,
      sellerNote: shot.sellerNote,
      warnings: itemWarnings,
    });
  }

  if (items.length > 0) {
    const first = items[0];
    const firstOrientation = orientationOf(first.widthPx, first.heightPx);
    if (!exportSettings.firstImageOrientations.includes(firstOrientation)) {
      errors.push(
        `Image 1 is ${firstOrientation}. The ${exportSettings.platformId} pack needs the first image to be ${exportSettings.firstImageOrientations.join(" or ")}. Move a matching shot to the top of the kit shot list.`,
      );
    }
    const orientations = new Set(items.map((item) => orientationOf(item.widthPx, item.heightPx)));
    if (orientations.size > 1) {
      warnings.push("This set mixes landscape and portrait images. A listing set should not mix them without a reason.");
    }
  }
  if (items.length > exportSettings.maxImages) {
    errors.push(`The set has ${items.length} images. The ${exportSettings.platformId} pack allows ${exportSettings.maxImages}.`);
  }
  if (items.length > 0 && (items.length < targets.targetMinImages || items.length > targets.targetMaxImages)) {
    warnings.push(
      `The set has ${items.length} images. The target is ${targets.targetMinImages} to ${targets.targetMaxImages}.`,
    );
  }
  if (items.length === 0 && errors.length === 0) {
    errors.push("No shot in this style kit can be built from the uploaded design.");
  }
  const proofReasons: string[] = [];
  if (kitIsProofOnly(kit)) {
    proofReasons.push("The style kit is a draft or holds placeholder values.");
  }
  const usedPreview = [...previewItems].filter((label) => {
    const [kind, id] = label.split(" ");
    return kind === "shot" ? items.some((item) => item.shotId === id) : items.some((item) => item.surfaces.some((s) => s.modelId === id));
  });
  if (usedPreview.length > 0) {
    proofReasons.push(`These items are in preview status, not published: ${usedPreview.sort().join(", ")}.`);
  }
  const proofMode = proofReasons.length > 0;
  if (proofMode) {
    warnings.push(`This set is a layout proof only, not a publishable set. ${proofReasons.join(" ")}`);
  }
  return {
    kitId: kit.id,
    kitVersion: kit.version,
    proofMode,
    proofReasons,
    items,
    skipped,
    warnings,
    errors,
    canExport: errors.length === 0 && items.length > 0,
  };
}
