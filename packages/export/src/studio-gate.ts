// Quality gate for images that arrive already rendered, such as the 3D
// mockup studio renders. It applies the same rules as the template gate
// in quality-gate.ts (PROMPT.md section 14): export size from the
// platform pack, sRGB, no colour change, no stretch, no crop without
// approval, no upscaled design. Then it encodes the platform JPG with the
// sRGB ICC profile embedded and proves the profile from the file bytes.
// Every platform value is read from the pack passed in.

import sharp from "sharp";
import type { PlatformPack } from "../../template-engine/src/platform-adapter.ts";
import { ExportError, qualityGateBlockedError, rasterizerError } from "./errors.ts";
import { ICC_PROFILE_NAME, readIccProfile } from "./icc.ts";
import { embedIccProfile, srgbIccProfileBytes } from "./srgb-icc.ts";
import type { GateCheck, GateStatus, QualityGateResult } from "./quality-gate.ts";

export interface RenderedSurfaceGateInput {
  surfaceId: string;
  designWidthPx: number;
  designHeightPx: number;
  /** Size the design takes in the output image. */
  placedWidthPx: number;
  placedHeightPx: number;
  stretched: boolean;
  cropped: boolean;
  /** Stretch found by measuring the model mesh, or null when the mesh matches its declared aspect. */
  aspectMismatch: string | null;
}

export interface RenderedImageGateInput {
  fileName: string;
  widthPx: number;
  heightPx: number;
  /** The size the batch plan asked for. The render must match it exactly. */
  expectedWidthPx: number;
  expectedHeightPx: number;
  colourProfile: string;
  colourChanged: boolean;
  cropApproved: boolean;
  surfaces: RenderedSurfaceGateInput[];
  pack: PlatformPack;
}

/** Half a percent of slack for rounding of measured edge lengths. */
const UPSCALE_SLACK = 1.005;

export function runRenderedImageGate(input: RenderedImageGateInput): QualityGateResult {
  const checks: GateCheck[] = [];
  const { pack } = input;
  const platform = pack.platformId;

  const shortest = Math.min(input.widthPx, input.heightPx);
  if (shortest < pack.export.shortestSidePx) {
    checks.push({
      status: "block",
      reason: `${input.fileName}: shortest side is ${shortest}px, below the ${platform} pack export size of ${pack.export.shortestSidePx}px.`,
      fix: `Render at ${pack.export.shortestSidePx}px or more on the shortest side, per the ${platform} pack.`,
    });
  } else {
    checks.push({
      status: "pass",
      reason: `${input.fileName}: shortest side ${shortest}px meets the ${platform} pack export size of ${pack.export.shortestSidePx}px.`,
      fix: "",
    });
  }
  if (input.widthPx !== input.expectedWidthPx || input.heightPx !== input.expectedHeightPx) {
    checks.push({
      status: "block",
      reason: `${input.fileName}: rendered at ${input.widthPx}x${input.heightPx}px, the plan asked for ${input.expectedWidthPx}x${input.expectedHeightPx}px.`,
      fix: "Render the shot again at the planned size.",
    });
  }
  if (input.colourProfile !== pack.export.colourProfile) {
    checks.push({
      status: "block",
      reason: `${input.fileName}: colour profile is ${input.colourProfile}, the ${platform} pack needs ${pack.export.colourProfile}.`,
      fix: `Export in ${pack.export.colourProfile}, so colours on the site match the originals.`,
    });
  }
  if (input.colourChanged) {
    checks.push({
      status: "block",
      reason: `${input.fileName}: the product render colour was changed.`,
      fix: "Use the original render colours. No colour change is allowed on a real product render.",
    });
  }
  if (input.surfaces.length === 0) {
    checks.push({
      status: "block",
      reason: `${input.fileName}: no design surface was reported for this image.`,
      fix: "Every mockup image must show the seller real render on at least one screen or sheet.",
    });
  }
  for (const surface of input.surfaces) {
    const label = `${input.fileName}, surface ${surface.surfaceId}`;
    if (surface.stretched || surface.aspectMismatch) {
      checks.push({
        status: "block",
        reason: `${label}: the design would be stretched. ${surface.aspectMismatch ?? ""}`.trim(),
        fix: "Correct the surface aspect in the model registry entry. A design is never stretched to fill.",
      });
    }
    if (surface.cropped && !input.cropApproved) {
      checks.push({
        status: "block",
        reason: `${label}: the design was cropped without seller approval.`,
        fix: "Use contain fit, or record the seller approval for the crop.",
      });
    }
    if (!(surface.designWidthPx > 0) || !(surface.designHeightPx > 0)) {
      checks.push({
        status: "block",
        reason: `${label}: the design has no measured source size.`,
        fix: "Supply the real product render with its measured pixel size, so the gate can check it.",
      });
      continue;
    }
    const upscale = Math.max(surface.placedWidthPx / surface.designWidthPx, surface.placedHeightPx / surface.designHeightPx);
    const placed = `${Math.round(surface.placedWidthPx)}x${Math.round(surface.placedHeightPx)}px`;
    const source = `${surface.designWidthPx}x${surface.designHeightPx}px`;
    if (upscale > UPSCALE_SLACK) {
      checks.push({
        status: "block",
        reason: `${label}: design source is ${source} but it is placed at ${placed} at export size. Upscaling would blur it.`,
        fix: `Re-render the design at or above ${Math.ceil(surface.placedWidthPx)}x${Math.ceil(surface.placedHeightPx)}px. Never upscale a low resolution source.`,
      });
    } else {
      checks.push({ status: "pass", reason: `${label}: design source ${source} covers its ${placed} placement at export size.`, fix: "" });
    }
  }
  const blocked = checks.some((c) => c.status === "block");
  const status: GateStatus = blocked ? "block" : checks.some((c) => c.status === "warn") ? "warn" : "pass";
  return { status, checks, blocked };
}

export interface GatedImage {
  fileName: string;
  bytes: Uint8Array;
  widthPx: number;
  heightPx: number;
  shortestSidePx: number;
  format: string;
  colourProfile: string;
  iccProfile: string;
  iccProfileEmbedded: boolean;
  iccVerification: string;
  gate: QualityGateResult;
}

/**
 * Encode a rendered PNG as the platform JPG, in Node with sharp. The
 * pixels are not resized, cropped or recoloured: only the size is checked,
 * transparency is refused, and the JPEG gets the same sRGB ICC profile as
 * the template export (srgb-icc.ts, identical bytes to srgb_icc.py). The
 * profile is inserted into the file directly, so sharp never runs a colour
 * conversion on the pixels. Chroma is not subsampled (4:4:4), as before.
 */
async function encodeRenderedPng(
  png: Uint8Array,
  fileName: string,
  quality: number,
  width: number,
  height: number,
): Promise<Buffer> {
  let image: sharp.Sharp;
  let meta: sharp.Metadata;
  try {
    image = sharp(Buffer.from(png), { failOn: "error" });
    meta = await image.metadata();
  } catch (error) {
    throw rasterizerError(`The image could not be read: ${(error as Error).message}`);
  }
  if (meta.format !== "png") {
    throw rasterizerError(`Expected a PNG from the renderer, got ${meta.format ?? "an unknown format"}.`);
  }
  if (meta.width !== width || meta.height !== height) {
    throw qualityGateBlockedError([`${fileName}: Image is ${meta.width}x${meta.height}px, expected ${width}x${height}px.`]);
  }
  if (meta.hasAlpha) {
    const stats = await image.stats();
    const alpha = stats.channels[stats.channels.length - 1];
    if (alpha && alpha.min < 255) {
      throw qualityGateBlockedError([
        `${fileName}: The image has transparent pixels. Transparent parts would turn black after upload.`,
      ]);
    }
  }
  const jpg = await image
    .removeAlpha()
    .toColourspace("srgb")
    .jpeg({ quality, chromaSubsampling: "4:4:4", mozjpeg: false })
    .toBuffer();
  return embedIccProfile(jpg, srgbIccProfileBytes());
}

/**
 * Run the gate, then encode the platform JPG with the sRGB ICC profile
 * embedded, then read the profile back from the JPG bytes. Throws an
 * ExportError with a plain language message when anything blocks.
 */
export async function gateAndEncodeRenderedImage(
  input: RenderedImageGateInput,
  png: Uint8Array,
): Promise<GatedImage> {
  const { pack } = input;
  if (pack.export.format !== "jpg") {
    throw new ExportError(
      "format-not-supported",
      `Export stopped: the ${pack.platformId} pack asks for ${pack.export.format}, and this encoder writes JPG only.`,
      "Use a platform pack with JPG export, or add an encoder for the other format.",
    );
  }
  const gate = runRenderedImageGate(input);
  if (gate.blocked) {
    throw qualityGateBlockedError(gate.checks.filter((c) => c.status === "block").map((c) => c.reason));
  }
  const bytes = await encodeRenderedPng(png, input.fileName, pack.export.quality, input.widthPx, input.heightPx);
  // Prove the profile from the bytes. A config flag is never trusted.
  const icc = readIccProfile(bytes);
  if (!icc.present) {
    throw rasterizerError(`${input.fileName} has no valid sRGB ICC profile. ${icc.detail}`);
  }
  return {
    fileName: input.fileName,
    bytes: new Uint8Array(bytes),
    widthPx: input.widthPx,
    heightPx: input.heightPx,
    shortestSidePx: Math.min(input.widthPx, input.heightPx),
    format: pack.export.format,
    colourProfile: pack.export.colourProfile,
    iccProfile: ICC_PROFILE_NAME,
    iccProfileEmbedded: true,
    iccVerification: `${icc.detail} Read back from ${input.fileName} bytes.`,
    gate,
  };
}
