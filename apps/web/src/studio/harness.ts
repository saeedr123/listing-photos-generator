// Test hook helpers for the visual regression script
// (tests/visual/studio-visual.cjs). They run in the page, so the pixel
// work uses the same pure functions the unit tests cover.

import {
  boxDownsample,
  compareFraming,
  diffRgba,
  type FramingRecord,
  type PixelDiffResult,
  type RenderedImage,
  type RgbaImage,
  type StudioConfig,
} from "@listing-photos-generator/mockup-engine/studio";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function pngToRgba(png: Uint8Array): Promise<RgbaImage> {
  const copy = new ArrayBuffer(png.byteLength);
  new Uint8Array(copy).set(png);
  const bitmap = await createImageBitmap(new Blob([copy], { type: "image/png" }), { colorSpaceConversion: "none", premultiplyAlpha: "none" });
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("No 2D canvas.");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return { widthPx: canvas.width, heightPx: canvas.height, data: ctx.getImageData(0, 0, canvas.width, canvas.height).data };
}

async function rgbaToPng(image: RgbaImage): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  canvas.width = image.widthPx;
  canvas.height = image.heightPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D canvas.");
  const data = new ImageData(image.widthPx, image.heightPx);
  data.data.set(image.data as ArrayLike<number>);
  ctx.putImageData(data, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("The reference image could not be encoded.");
  return new Uint8Array(await blob.arrayBuffer());
}

export interface ReferenceRender {
  /** The render reduced by the reference factor, as a lossless PNG. */
  pngBase64: string;
  fullWidthPx: number;
  fullHeightPx: number;
  referenceWidthPx: number;
  referenceHeightPx: number;
  downsampleFactor: number;
  supersampleUsed: number;
  framing: FramingRecord;
  renderer: RenderedImage["renderer"];
  warnings: string[];
}

export async function toReferenceRender(rendered: RenderedImage, config: StudioConfig): Promise<ReferenceRender> {
  const factor = config.determinism.referenceDownsampleFactor;
  const small = boxDownsample(await pngToRgba(rendered.png), factor);
  return {
    pngBase64: bytesToBase64(await rgbaToPng(small)),
    fullWidthPx: rendered.widthPx,
    fullHeightPx: rendered.heightPx,
    referenceWidthPx: small.widthPx,
    referenceHeightPx: small.heightPx,
    downsampleFactor: factor,
    supersampleUsed: rendered.supersampleUsed,
    framing: rendered.framing,
    renderer: rendered.renderer,
    warnings: rendered.warnings,
  };
}

export interface ReferenceComparison {
  pixelDiff: PixelDiffResult;
  framing: { same: boolean; differences: string[] };
  candidate: ReferenceRender;
}

export async function compareWithReference(
  rendered: RenderedImage,
  referencePngBase64: string,
  referenceFraming: FramingRecord,
  config: StudioConfig,
): Promise<ReferenceComparison> {
  const candidate = await toReferenceRender(rendered, config);
  const reference = await pngToRgba(base64ToBytes(referencePngBase64));
  const candidatePixels = await pngToRgba(base64ToBytes(candidate.pngBase64));
  return {
    pixelDiff: diffRgba(reference, candidatePixels, config.determinism.pixelDiff),
    framing: compareFraming(referenceFraming, rendered.framing, config.determinism.cornerTolerancePx),
    candidate,
  };
}
