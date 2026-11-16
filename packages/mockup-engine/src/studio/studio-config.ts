// Studio settings that are not platform rules: batch targets, render
// quality, colour extraction limits and the determinism threshold. They
// live in config/studio.json so they can be changed without a code edit.

import type { BatchTargets } from "./batch.ts";
import type { ColourExtractionOptions } from "./colour.ts";
import type { PixelDiffThreshold } from "./pixel-diff.ts";
import type { StudioIssue } from "./types.ts";

export interface StudioConfig {
  version: number;
  catalog: { includePreviewItems: boolean };
  batch: BatchTargets;
  render: { supersample: number };
  colourExtraction: ColourExtractionOptions & { variantTintAmount: number };
  determinism: {
    /** The one browser reference renders are made in. */
    referenceBrowser: string;
    /** Stored reference renders are reduced by this whole factor to keep the repository small. */
    referenceDownsampleFactor: number;
    cornerTolerancePx: number;
    pixelDiff: PixelDiffThreshold;
  };
  upload: { maxModelBytes: number; maxDesignBytes: number; modelContentTypes: string[]; designContentTypes: string[] };
}

export function validateStudioConfig(config: StudioConfig): StudioIssue[] {
  const issues: StudioIssue[] = [];
  const fail = (code: string, message: string) => issues.push({ code, message });
  const positive = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value > 0;
  if (!config.catalog || typeof config.catalog.includePreviewItems !== "boolean") {
    fail("bad-catalog", "Studio config: catalog.includePreviewItems must be true or false.");
  }
  if (!config.batch || !Number.isInteger(config.batch.targetMinImages) || !Number.isInteger(config.batch.targetMaxImages) || config.batch.targetMinImages < 1 || config.batch.targetMinImages > config.batch.targetMaxImages) {
    fail("bad-batch-targets", "Studio config: batch targets need a minimum from 1 that is not above the maximum.");
  }
  if (!config.render || !positive(config.render.supersample) || config.render.supersample < 1 || config.render.supersample > 4) {
    fail("bad-supersample", "Studio config: supersample must be from 1 to 4.");
  }
  const c = config.colourExtraction;
  if (!c || !Number.isInteger(c.minColours) || !Number.isInteger(c.maxColours) || c.minColours < 1 || c.minColours > c.maxColours || !positive(c.mergeDistance) || !positive(c.maxSamples) || !(c.variantTintAmount >= 0 && c.variantTintAmount <= 1)) {
    fail("bad-colour-extraction", "Studio config: colour extraction limits are not valid.");
  }
  const d = config.determinism;
  if (!d || !d.referenceBrowser || !d.referenceBrowser.trim()) {
    fail("no-reference-browser", "Studio config: name the reference browser for determinism checks.");
  }
  if (!d || !Number.isInteger(d.referenceDownsampleFactor) || d.referenceDownsampleFactor < 1 || !(d.cornerTolerancePx >= 0) || !d.pixelDiff || !(d.pixelDiff.channelTolerance >= 0) || !(d.pixelDiff.maxDifferentPixelRatio >= 0 && d.pixelDiff.maxDifferentPixelRatio <= 1) || !(d.pixelDiff.maxMeanAbsoluteDifference >= 0)) {
    fail("bad-determinism", "Studio config: determinism thresholds are not valid.");
  }
  const u = config.upload;
  if (!u || !positive(u.maxModelBytes) || !positive(u.maxDesignBytes) || !Array.isArray(u.modelContentTypes) || !Array.isArray(u.designContentTypes)) {
    fail("bad-upload-limits", "Studio config: upload limits are not valid.");
  }
  return issues;
}
