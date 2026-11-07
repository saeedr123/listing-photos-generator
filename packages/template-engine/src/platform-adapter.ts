// Platform export adapter.
// The template engine is platform neutral. This adapter is the only place
// where a platform pack size, ratio, or file rule is applied to a template.
// Values come from the platform pack config, never from hard coded core logic.
// Etsy v1 values are read from packages/export/src/etsy-pack.json, which
// cites docs/platform-rules.md, check date 2026-11-05.

import type { Orientation, TemplateDefinition } from "./types.ts";

export interface PlatformPack {
  platformId: string;
  packSlug: string;
  packVersion: number;
  checkDate: string;
  sourceDoc: string;
  export: {
    format: string;
    shortestSidePx: number;
    colourProfile: string;
    quality: number;
    maxImages: number;
  };
  title: { maxChars: number; maxWordsGuidance: number };
  tags: { maxCount: number; maxCharsPerTag: number };
  firstImage: { orientations: Orientation[]; avoidTextOverlay: boolean };
}

export interface AdaptedTemplate {
  templateId: string;
  templateVersion: number;
  platformId: string;
  packVersion: number;
  canvasWidthPx: number;
  canvasHeightPx: number;
  shortestSidePx: number;
  format: string;
  colourProfile: string;
  quality: number;
  orientation: Orientation;
  warnings: string[];
}

/** Resolve a canvas size from an aspect ratio, with the shortest side fixed by the pack. */
export function canvasSizeForAspect(
  aspectRatio: string,
  shortestSidePx: number,
): { width: number; height: number } {
  const [w, h] = aspectRatio.split(":").map((n) => Number(n));
  if (!w || !h) throw new Error(`Bad aspect ratio: ${aspectRatio}. Use a form such as 3:2.`);
  if (w >= h) {
    return { width: Math.round((shortestSidePx * w) / h), height: shortestSidePx };
  }
  return { width: shortestSidePx, height: Math.round((shortestSidePx * h) / w) };
}

export function adaptTemplateForPlatform(
  template: TemplateDefinition,
  pack: PlatformPack,
): AdaptedTemplate {
  const warnings: string[] = [];
  const orientation = template.layout.canvas.orientation;
  if (
    pack.firstImage.orientations.length > 0 &&
    template.role === "hero" &&
    !pack.firstImage.orientations.includes(orientation)
  ) {
    warnings.push(
      `First image orientation ${orientation} is not in the ${pack.platformId} first image guidance (${pack.firstImage.orientations.join(", ")}). Keep the product centred with a safe border.`,
    );
  }
  if (pack.firstImage.avoidTextOverlay && template.role === "hero") {
    warnings.push(
      `First image guidance for ${pack.platformId}: avoid text overlays and collages on the first thumbnail. This hero template keeps its title in the safe top band, not over the product.`,
    );
  }
  const { width, height } = canvasSizeForAspect(
    template.layout.canvas.aspectRatio,
    pack.export.shortestSidePx,
  );
  return {
    templateId: template.id,
    templateVersion: template.version,
    platformId: pack.platformId,
    packVersion: pack.packVersion,
    canvasWidthPx: width,
    canvasHeightPx: height,
    shortestSidePx: pack.export.shortestSidePx,
    format: pack.export.format,
    colourProfile: pack.export.colourProfile,
    quality: pack.export.quality,
    orientation,
    warnings,
  };
}
