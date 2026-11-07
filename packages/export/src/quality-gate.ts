// Crisp Quality Gate, per PROMPT.md section 14.
// Real product renders only at high DPI. Never upscale low resolution.
// No stretch, no colour change, no crop unless approved. Export at the
// shortest side size set by the platform pack.

import type { RenderModel } from "../../rendering/src/types.ts";

export type GateStatus = "pass" | "warn" | "block";

export interface GateCheck {
  status: GateStatus;
  reason: string;
  fix: string;
}

export interface QualityGateResult {
  status: GateStatus;
  checks: GateCheck[];
  blocked: boolean;
}

export interface QualityGateInput {
  model: RenderModel;
  cropApproved: boolean;
  colourChanged: boolean;
  proofMode: boolean;
}

/**
 * A source render must be at least as large, in pixels, as the box it is
 * placed in at export size. Anything smaller would need upscaling, which
 * the gate forbids.
 */
export function runQualityGate(input: QualityGateInput): QualityGateResult {
  const checks: GateCheck[] = [];
  const { model } = input;

  for (const image of model.images) {
    if (image.kind !== "product-render") continue;
    if (image.isSample && !input.proofMode) {
      checks.push({
        status: "block",
        reason: `Image ${image.id} uses a sample render, not the seller real product render.`,
        fix: "Replace the sample render with the seller real product render, or run in proof mode for a layout proof only.",
      });
      continue;
    }
    if (image.isSample && input.proofMode) {
      checks.push({
        status: "warn",
        reason: `Image ${image.id} uses a sample render. This is a layout proof only, not a publishable pack.`,
        fix: "Replace the sample render with the seller real product render before any published use.",
      });
    }
    if (image.sourceWidthPx === null || image.sourceHeightPx === null) {
      checks.push({
        status: "block",
        reason: `Image ${image.id} has no measured source size.`,
        fix: "Supply the real product render with its measured pixel size, so the gate can check it.",
      });
      continue;
    }
    if (image.sourceWidthPx < image.w || image.sourceHeightPx < image.h) {
      checks.push({
        status: "block",
        reason: `Image ${image.id} source is ${image.sourceWidthPx}x${image.sourceHeightPx}px but it is placed at ${image.w}x${image.h}px at export size. Upscaling would blur it.`,
        fix: `Re-render the source at or above ${image.w}x${image.h}px, or use a smaller placement. Never upscale a low resolution source.`,
      });
    } else {
      checks.push({
        status: "pass",
        reason: `Image ${image.id} source ${image.sourceWidthPx}x${image.sourceHeightPx}px covers its ${image.w}x${image.h}px placement at export size.`,
        fix: "",
      });
    }
  }

  if (input.colourChanged) {
    checks.push({
      status: "block",
      reason: "The product render colour was changed.",
      fix: "Use the original render colours. No colour change is allowed on a real product render.",
    });
  }
  if (model.colourProfile !== "sRGB") {
    checks.push({
      status: "block",
      reason: `Colour profile is ${model.colourProfile}, not sRGB.`,
      fix: "Export in sRGB, so colours on the site match the originals.",
    });
  }
  const shortestSide = Math.min(model.canvasWidthPx, model.canvasHeightPx);
  if (shortestSide < 2000) {
    checks.push({
      status: "block",
      reason: `Shortest side is ${shortestSide}px, below the Etsy 2000px export size.`,
      fix: "Export at 2000px on the shortest side, per the Etsy pack.",
    });
  }
  const textIssues = model.warnings.filter((w) => w.startsWith("Text area"));
  for (const issue of textIssues) {
    checks.push({ status: "warn", reason: issue, fix: "Shorten the text or pick a template with a larger text area." });
  }

  const blocked = checks.some((c) => c.status === "block");
  const status: GateStatus = blocked ? "block" : checks.some((c) => c.status === "warn") ? "warn" : "pass";
  return { status, checks, blocked };
}
