// Texture fit maths for a screen or paper surface.
// The seller design is placed on the surface with contain fit: centred,
// never stretched, never recoloured, never cropped without approval. The
// scene engine draws the design onto a texture canvas that has exactly
// the aspect of the surface, so the mesh UVs can stay a plain 0 to 1
// square and no shader ever scales the design unevenly.

import { orientationOf } from "../fit.ts";
import type { Orientation } from "../types.ts";

export interface SurfaceFitInput {
  designWidthPx: number;
  designHeightPx: number;
  /** Width divided by height of the visible surface area. */
  surfaceAspect: number;
  /** Largest texture side the GPU accepts. */
  maxTextureSizePx: number;
}

export interface SurfaceTextureLayout {
  /** Texture canvas size. Its aspect matches the surface. */
  canvasWidthPx: number;
  canvasHeightPx: number;
  /** Where the design is drawn on the canvas. */
  drawX: number;
  drawY: number;
  drawWidthPx: number;
  drawHeightPx: number;
  /** Design pixels to canvas pixels. 1 means the design is drawn at its native size. Never above 1. */
  scale: number;
  letterboxLeftPx: number;
  letterboxRightPx: number;
  letterboxTopPx: number;
  letterboxBottomPx: number;
  /** Share of the surface the design covers, 0 to 1. */
  coverage: number;
  designOrientation: Orientation;
  surfaceOrientation: Orientation;
  stretched: false;
  cropped: false;
  colourChanged: false;
  warnings: string[];
}

export const LANDSCAPE_ON_PORTRAIT_WARNING =
  "Landscape content on a portrait surface: the design will show as a small band with empty space above and below. Use a portrait screenshot or an approved crop instead. Never stretch to fill.";
export const PORTRAIT_ON_LANDSCAPE_WARNING =
  "Portrait content on a landscape surface: the design will show with empty space on the left and right. Use a landscape screenshot or an approved crop instead. Never stretch to fill.";

function surfaceOrientationOf(aspect: number): Orientation {
  if (aspect > 1.0001) return "landscape";
  if (aspect < 0.9999) return "portrait";
  return "square";
}

export function computeSurfaceTextureLayout(input: SurfaceFitInput): SurfaceTextureLayout {
  const { designWidthPx, designHeightPx, surfaceAspect, maxTextureSizePx } = input;
  if (!(designWidthPx > 0) || !(designHeightPx > 0)) {
    throw new Error("The design has no measured pixel size. Supply the real render with its width and height.");
  }
  if (!(surfaceAspect > 0)) throw new Error("Surface aspect must be a positive number.");
  if (!(maxTextureSizePx >= 16)) throw new Error("Maximum texture size must be at least 16 pixels.");

  const designAspect = designWidthPx / designHeightPx;
  // Start from the design native size and grow the canvas along one axis
  // only, so the canvas takes the surface aspect and the design keeps its
  // own pixels.
  let canvasW: number;
  let canvasH: number;
  if (designAspect >= surfaceAspect) {
    canvasW = designWidthPx;
    canvasH = designWidthPx / surfaceAspect;
  } else {
    canvasH = designHeightPx;
    canvasW = designHeightPx * surfaceAspect;
  }
  // Shrink to the GPU limit when needed. Shrinking is allowed. Growing
  // (upscaling) is never done here: scale stays at or below 1.
  const shrink = Math.min(1, maxTextureSizePx / Math.max(canvasW, canvasH));
  const canvasWidthPx = Math.max(1, Math.round(canvasW * shrink));
  const canvasHeightPx = Math.max(1, Math.round(canvasH * shrink));

  // One scale for both axes: contain fit inside the rounded canvas.
  const scale = Math.min(canvasWidthPx / designWidthPx, canvasHeightPx / designHeightPx, 1);
  const drawWidthPx = designWidthPx * scale;
  const drawHeightPx = designHeightPx * scale;
  // Whole pixel offsets, so a design drawn at its native size lands on
  // the pixel grid and is copied, not resampled.
  const drawX = Math.floor((canvasWidthPx - drawWidthPx) / 2);
  const drawY = Math.floor((canvasHeightPx - drawHeightPx) / 2);

  const designOrientation = orientationOf(designWidthPx, designHeightPx);
  const surfaceOrientation = surfaceOrientationOf(surfaceAspect);
  const warnings: string[] = [];
  if (designOrientation === "landscape" && surfaceOrientation === "portrait") warnings.push(LANDSCAPE_ON_PORTRAIT_WARNING);
  if (designOrientation === "portrait" && surfaceOrientation === "landscape") warnings.push(PORTRAIT_ON_LANDSCAPE_WARNING);
  if (shrink < 1) {
    warnings.push(
      `The design is larger than the largest texture this device can use (${maxTextureSizePx} px), so it is scaled down to fit. It is never scaled up.`,
    );
  }

  return {
    canvasWidthPx,
    canvasHeightPx,
    drawX,
    drawY,
    drawWidthPx,
    drawHeightPx,
    scale,
    letterboxLeftPx: drawX,
    letterboxRightPx: canvasWidthPx - (drawX + drawWidthPx),
    letterboxTopPx: drawY,
    letterboxBottomPx: canvasHeightPx - (drawY + drawHeightPx),
    coverage: (drawWidthPx * drawHeightPx) / (canvasWidthPx * canvasHeightPx),
    designOrientation,
    surfaceOrientation,
    stretched: false,
    cropped: false,
    colourChanged: false,
    warnings,
  };
}

export interface SurfaceCrispInput {
  designWidthPx: number;
  designHeightPx: number;
  layout: SurfaceTextureLayout;
  /** Size of the whole surface in the output image, in pixels, measured along its edges. */
  projectedWidthPx: number;
  projectedHeightPx: number;
}

export interface SurfaceCrispResult {
  /** Size the design itself takes in the output image. */
  placedWidthPx: number;
  placedHeightPx: number;
  /** Above 1 means the design would be enlarged, which blurs it. */
  upscaleFactor: number;
  crisp: boolean;
  message: string;
}

/**
 * Crisp Quality Gate for a 3D placement, per PROMPT.md section 14: the
 * design must have at least as many pixels as the area it covers in the
 * output image. Anything less would be an upscale.
 */
export function checkSurfaceCrisp(input: SurfaceCrispInput): SurfaceCrispResult {
  const { layout } = input;
  const placedWidthPx = input.projectedWidthPx * (layout.drawWidthPx / layout.canvasWidthPx);
  const placedHeightPx = input.projectedHeightPx * (layout.drawHeightPx / layout.canvasHeightPx);
  const upscaleFactor = Math.max(placedWidthPx / input.designWidthPx, placedHeightPx / input.designHeightPx);
  // Half a percent of slack for rounding of projected edge lengths.
  const crisp = upscaleFactor <= 1.005;
  const placed = `${Math.round(placedWidthPx)}x${Math.round(placedHeightPx)}px`;
  const source = `${input.designWidthPx}x${input.designHeightPx}px`;
  return {
    placedWidthPx,
    placedHeightPx,
    upscaleFactor,
    crisp,
    message: crisp
      ? `Design ${source} covers its ${placed} placement at export size.`
      : `Design is ${source} but it is placed at ${placed} at export size. Upscaling would blur it. Re-render the design at or above ${Math.ceil(placedWidthPx)}x${Math.ceil(placedHeightPx)}px.`,
  };
}

/**
 * Measure the real aspect of a mesh from its geometry: how far the
 * surface runs per unit of U against per unit of V. The scene engine
 * compares this with the aspect in the registry entry. A mismatch means
 * the design would be stretched, so the engine reports it.
 */
export function measureUvAspect(
  positions: ArrayLike<number>,
  uvs: ArrayLike<number>,
  indices: ArrayLike<number> | null,
): number | null {
  const triangleCount = indices ? Math.floor(indices.length / 3) : Math.floor(positions.length / 9);
  let sumU = 0;
  let sumV = 0;
  let weight = 0;
  for (let t = 0; t < triangleCount; t++) {
    const i0 = indices ? indices[t * 3] : t * 3;
    const i1 = indices ? indices[t * 3 + 1] : t * 3 + 1;
    const i2 = indices ? indices[t * 3 + 2] : t * 3 + 2;
    const e1 = [0, 1, 2].map((k) => positions[i1 * 3 + k] - positions[i0 * 3 + k]);
    const e2 = [0, 1, 2].map((k) => positions[i2 * 3 + k] - positions[i0 * 3 + k]);
    const du1 = uvs[i1 * 2] - uvs[i0 * 2];
    const dv1 = uvs[i1 * 2 + 1] - uvs[i0 * 2 + 1];
    const du2 = uvs[i2 * 2] - uvs[i0 * 2];
    const dv2 = uvs[i2 * 2 + 1] - uvs[i0 * 2 + 1];
    const det = du1 * dv2 - du2 * dv1;
    if (Math.abs(det) < 1e-12) continue;
    // Position change per unit U and per unit V on this triangle.
    const dPdU = [0, 1, 2].map((k) => (e1[k] * dv2 - e2[k] * dv1) / det);
    const dPdV = [0, 1, 2].map((k) => (e2[k] * du1 - e1[k] * du2) / det);
    const lenU = Math.hypot(dPdU[0], dPdU[1], dPdU[2]);
    const lenV = Math.hypot(dPdV[0], dPdV[1], dPdV[2]);
    const area = Math.abs(det);
    sumU += lenU * area;
    sumV += lenV * area;
    weight += area;
  }
  if (weight === 0 || sumV === 0) return null;
  return sumU / sumV;
}

/** UV bounds of a mesh. The engine warns when a surface does not use the full 0 to 1 square. */
export function uvBounds(uvs: ArrayLike<number>): { minU: number; maxU: number; minV: number; maxV: number } {
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  for (let i = 0; i + 1 < uvs.length; i += 2) {
    minU = Math.min(minU, uvs[i]);
    maxU = Math.max(maxU, uvs[i]);
    minV = Math.min(minV, uvs[i + 1]);
    maxV = Math.max(maxV, uvs[i + 1]);
  }
  return { minU, maxU, minV, maxV };
}

export const SURFACE_ASPECT_TOLERANCE = 0.02;

export function surfaceAspectMismatch(declaredAspect: number, measuredAspect: number | null): string | null {
  if (measuredAspect === null) return "The surface mesh has no usable UVs, so its aspect could not be measured.";
  const drift = Math.abs(measuredAspect - declaredAspect) / declaredAspect;
  if (drift <= SURFACE_ASPECT_TOLERANCE) return null;
  return `The registry says this surface has aspect ${declaredAspect.toFixed(4)} but the mesh measures ${measuredAspect.toFixed(4)}. The design would be stretched. Correct the aspect in the registry entry before enabling the model.`;
}
