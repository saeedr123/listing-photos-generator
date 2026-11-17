// Quality gate for images that arrive already rendered, such as the 3D
// mockup studio renders. It applies the same rules as the template gate
// in quality-gate.ts (PROMPT.md section 14): export size from the
// platform pack, sRGB, no colour change, no stretch, no crop without
// approval, no upscaled design. Then it encodes the platform JPG with the
// sRGB ICC profile embedded and proves the profile from the file bytes.
// Every platform value is read from the pack passed in.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PlatformPack } from "../../template-engine/src/platform-adapter.ts";
import { ExportError, qualityGateBlockedError, rasterizerError } from "./errors.ts";
import { ICC_PROFILE_NAME, readIccProfile } from "./icc.ts";
import type { GateCheck, GateStatus, QualityGateResult } from "./quality-gate.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

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
 * Run the gate, then encode the platform JPG with the sRGB ICC profile
 * embedded, then read the profile back from the JPG bytes. Throws an
 * ExportError with a plain language message when anything blocks.
 */
export function gateAndEncodeRenderedImage(
  input: RenderedImageGateInput,
  png: Uint8Array,
  options: { scriptDir?: string } = {},
): GatedImage {
  // A bundler can move this module, which breaks the path derived from
  // import.meta.url. A caller that bundles passes the folder explicitly.
  const scriptDir = options.scriptDir ?? HERE;
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
  const work = mkdtempSync(join(tmpdir(), "lpg-gate-"));
  try {
    const inPath = join(work, "in.png");
    const outPath = join(work, "out.jpg");
    writeFileSync(inPath, png);
    const encoded = spawnSync(
      "python3",
      [join(scriptDir, "encode_jpg.py"), inPath, outPath, String(pack.export.quality), String(input.widthPx), String(input.heightPx)],
      { encoding: "utf8" },
    );
    if (encoded.status === 3 || encoded.status === 4) {
      throw qualityGateBlockedError([`${input.fileName}: ${(encoded.stderr || "").trim()}`]);
    }
    if (encoded.status !== 0 || !existsSync(outPath)) {
      throw rasterizerError(encoded.stderr || encoded.stdout || "the JPG encoder exited without writing a file.");
    }
    const bytes = readFileSync(outPath);
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
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}
