// Determinism checks for renders.
// Determinism here means: same camera, same screen bounds, same pixel
// size, and a pixel diff under a stated threshold against one reference
// render made in the named reference browser. Byte identical output
// across GPUs is not a requirement and is not claimed.

export interface PixelDiffThreshold {
  /** A channel difference above this counts the pixel as different. 0 to 255. */
  channelTolerance: number;
  /** Largest share of different pixels allowed, 0 to 1. */
  maxDifferentPixelRatio: number;
  /** Largest mean absolute channel difference allowed, 0 to 255. */
  maxMeanAbsoluteDifference: number;
}

export interface PixelDiffResult {
  sameSize: boolean;
  widthPx: number;
  heightPx: number;
  differentPixels: number;
  differentPixelRatio: number;
  meanAbsoluteDifference: number;
  maxChannelDifference: number;
  withinThreshold: boolean;
  message: string;
}

export interface RgbaImage {
  widthPx: number;
  heightPx: number;
  data: ArrayLike<number>;
}

export function diffRgba(reference: RgbaImage, candidate: RgbaImage, threshold: PixelDiffThreshold): PixelDiffResult {
  if (reference.widthPx !== candidate.widthPx || reference.heightPx !== candidate.heightPx) {
    return {
      sameSize: false,
      widthPx: candidate.widthPx,
      heightPx: candidate.heightPx,
      differentPixels: 0,
      differentPixelRatio: 1,
      meanAbsoluteDifference: 255,
      maxChannelDifference: 255,
      withinThreshold: false,
      message: `Pixel size differs: reference ${reference.widthPx}x${reference.heightPx}, candidate ${candidate.widthPx}x${candidate.heightPx}.`,
    };
  }
  const pixels = reference.widthPx * reference.heightPx;
  let differentPixels = 0;
  let sum = 0;
  let max = 0;
  for (let i = 0; i < pixels; i++) {
    let worst = 0;
    for (let c = 0; c < 3; c++) {
      const d = Math.abs(reference.data[i * 4 + c] - candidate.data[i * 4 + c]);
      sum += d;
      if (d > worst) worst = d;
    }
    if (worst > max) max = worst;
    if (worst > threshold.channelTolerance) differentPixels++;
  }
  const differentPixelRatio = pixels === 0 ? 0 : differentPixels / pixels;
  const meanAbsoluteDifference = pixels === 0 ? 0 : sum / (pixels * 3);
  const withinThreshold =
    differentPixelRatio <= threshold.maxDifferentPixelRatio && meanAbsoluteDifference <= threshold.maxMeanAbsoluteDifference;
  return {
    sameSize: true,
    widthPx: reference.widthPx,
    heightPx: reference.heightPx,
    differentPixels,
    differentPixelRatio,
    meanAbsoluteDifference,
    maxChannelDifference: max,
    withinThreshold,
    message: withinThreshold
      ? `Within threshold: ${(differentPixelRatio * 100).toFixed(3)} percent of pixels differ, mean difference ${meanAbsoluteDifference.toFixed(3)}.`
      : `Outside threshold: ${(differentPixelRatio * 100).toFixed(3)} percent of pixels differ (limit ${(threshold.maxDifferentPixelRatio * 100).toFixed(3)}), mean difference ${meanAbsoluteDifference.toFixed(3)} (limit ${threshold.maxMeanAbsoluteDifference}). A human must review this diff before release.`,
  };
}

/** Shrink an RGBA image by a whole factor with a box filter. Used to keep stored reference renders small. */
export function boxDownsample(image: RgbaImage, factor: number): RgbaImage {
  if (!Number.isInteger(factor) || factor < 1) throw new Error("Downsample factor must be a whole number from 1.");
  if (image.widthPx % factor !== 0 || image.heightPx % factor !== 0) {
    throw new Error(`Image ${image.widthPx}x${image.heightPx} does not divide by ${factor}.`);
  }
  const widthPx = image.widthPx / factor;
  const heightPx = image.heightPx / factor;
  const data = new Uint8ClampedArray(widthPx * heightPx * 4);
  const area = factor * factor;
  for (let y = 0; y < heightPx; y++) {
    for (let x = 0; x < widthPx; x++) {
      const sum = [0, 0, 0, 0];
      for (let dy = 0; dy < factor; dy++) {
        for (let dx = 0; dx < factor; dx++) {
          const i = ((y * factor + dy) * image.widthPx + (x * factor + dx)) * 4;
          sum[0] += image.data[i];
          sum[1] += image.data[i + 1];
          sum[2] += image.data[i + 2];
          sum[3] += image.data[i + 3];
        }
      }
      const o = (y * widthPx + x) * 4;
      data[o] = Math.round(sum[0] / area);
      data[o + 1] = Math.round(sum[1] / area);
      data[o + 2] = Math.round(sum[2] / area);
      data[o + 3] = Math.round(sum[3] / area);
    }
  }
  return { widthPx, heightPx, data };
}

/** What the renderer records about framing, so two renders can be compared without looking at pixels. */
export interface FramingRecord {
  widthPx: number;
  heightPx: number;
  camera: { position: number[]; target: number[]; fovDeg: number };
  surfaces: { modelIndex: number; surfaceId: string; cornersPx: [number, number][] }[];
}

export interface FramingComparison {
  same: boolean;
  differences: string[];
}

export function compareFraming(reference: FramingRecord, candidate: FramingRecord, cornerTolerancePx: number): FramingComparison {
  const differences: string[] = [];
  if (reference.widthPx !== candidate.widthPx || reference.heightPx !== candidate.heightPx) {
    differences.push(`Pixel size ${candidate.widthPx}x${candidate.heightPx} differs from reference ${reference.widthPx}x${reference.heightPx}.`);
  }
  const close = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
  if (
    !close(reference.camera.position, candidate.camera.position) ||
    !close(reference.camera.target, candidate.camera.target) ||
    Math.abs(reference.camera.fovDeg - candidate.camera.fovDeg) > 1e-9
  ) {
    differences.push("Camera differs from the reference.");
  }
  if (reference.surfaces.length !== candidate.surfaces.length) {
    differences.push(`Surface count ${candidate.surfaces.length} differs from reference ${reference.surfaces.length}.`);
  } else {
    reference.surfaces.forEach((surface, index) => {
      const other = candidate.surfaces[index];
      if (surface.surfaceId !== other.surfaceId || surface.modelIndex !== other.modelIndex) {
        differences.push(`Surface ${index + 1} is ${other.surfaceId}, reference has ${surface.surfaceId}.`);
        return;
      }
      surface.cornersPx.forEach((corner, c) => {
        const drift = Math.hypot(corner[0] - other.cornersPx[c][0], corner[1] - other.cornersPx[c][1]);
        if (drift > cornerTolerancePx) {
          differences.push(`Surface ${surface.surfaceId} corner ${c + 1} moved ${drift.toFixed(2)} px (limit ${cornerTolerancePx}).`);
        }
      });
    });
  }
  return { same: differences.length === 0, differences };
}
