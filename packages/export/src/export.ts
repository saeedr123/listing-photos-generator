// Export orchestrator: Etsy first.
// Order: reconciliation, then Crisp Quality Gate, then render, then JPG
// rasterize, then text pack. Any blocking failure stops the export with a
// plain language error and preserves the saved pack: work is written to a
// temporary directory first and only moved into place on success, so a
// failed export never deletes or corrupts an earlier export.
// No auto publishing: export produces files and text for the seller to
// upload to Etsy themselves.

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PlatformPack } from "../../template-engine/src/platform-adapter.ts";
import { adaptTemplateForPlatform } from "../../template-engine/src/platform-adapter.ts";
import type { ProductFacts, TemplateDefinition } from "../../template-engine/src/types.ts";
import type { MockupDefinition } from "../../mockup-engine/src/types.ts";
import { buildRenderModel } from "../../rendering/src/layout.ts";
import { renderSvg, toRenderSpec } from "../../rendering/src/svg.ts";
import { reconcile, type ListingValues } from "./reconciliation.ts";
import { runQualityGate } from "./quality-gate.ts";
import { buildTextPack, renderTextPackPlain } from "./text-pack.ts";
import {
  ExportError,
  qualityGateBlockedError,
  rasterizerError,
  reconciliationBlockedError,
} from "./errors.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

export function loadEtsyPack(): PlatformPack {
  const raw = readFileSync(join(HERE, "etsy-pack.json"), "utf8");
  const pack = JSON.parse(raw) as PlatformPack;
  return pack;
}

export interface ExportInput {
  packName: string;
  templates: TemplateDefinition[];
  facts: ProductFacts;
  listing: ListingValues;
  resolvedCopy: Record<string, string>;
  textPack: { title: string; description: string; tags: string[]; checklist: string[] };
  pack: PlatformPack;
  outputDir: string;
  proofMode: boolean;
  cropApproved: boolean;
  colourChanged: boolean;
  // Mockup definitions, used to place each screen area of a frame. When
  // omitted, the rasterizer draws one sheet box per image area.
  mockups?: MockupDefinition[];
}

export interface ExportedImage {
  position: number;
  templateId: string;
  fileName: string;
  widthPx: number;
  heightPx: number;
  shortestSidePx: number;
  format: string;
  colourProfile: string;
}

export interface ExportManifest {
  packName: string;
  platformId: string;
  packVersion: number;
  images: ExportedImage[];
  textPackFile: string;
  colourProfile: string;
  format: string;
  sampleRender: boolean;
  proofMode: boolean;
  reconciliationSummary: string;
  warnings: string[];
  previewExportDifference: string | null;
}

export interface ExportResult {
  manifest: ExportManifest;
  outputDir: string;
}

export function exportPack(input: ExportInput): ExportResult {
  const reconciliation = reconcile(input.facts, input.listing);
  if (reconciliation.blocked) {
    throw reconciliationBlockedError(reconciliation.summary);
  }

  const textPack = buildTextPack({ ...input.textPack, pack: input.pack });
  if (!textPack.valid) {
    const first = textPack.issues[0];
    throw new ExportError("text-pack-invalid", `Export stopped: ${first.message}`, first.fix);
  }

  const tmpDir = join(input.outputDir, `.tmp-${input.packName}`);
  const finalDir = join(input.outputDir, input.packName);
  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });

  try {
    const images: ExportedImage[] = [];
    const warnings: string[] = [];
    let sampleRender = false;

    input.templates.forEach((template, index) => {
      const adapted = adaptTemplateForPlatform(template, input.pack);
      const model = buildRenderModel(template, adapted, input.facts, input.resolvedCopy);
      const gate = runQualityGate({
        model,
        cropApproved: input.cropApproved,
        colourChanged: input.colourChanged,
        proofMode: input.proofMode,
      });
      if (gate.blocked) {
        throw qualityGateBlockedError(
          gate.checks.filter((c) => c.status === "block").map((c) => c.reason),
        );
      }
      warnings.push(...gate.checks.filter((c) => c.status === "warn").map((c) => c.reason));
      warnings.push(...model.warnings);
      if (input.facts.isSampleRender) sampleRender = true;

      const spec = toRenderSpec(model) as Record<string, unknown>;
      spec.quality = input.pack.export.quality;
      // Attach the verified tab names so the rasterizer can draw a
      // schematic sheet preview. This is a layout proof, not a real sheet.
      const specImages = spec.images as Record<string, unknown>[];
      for (const specImage of specImages) {
        if (specImage.kind === "product-render") {
          specImage.sheetLines = input.facts.tabNames;
        }
        const slot = template.mockupSlots.find((s) => s.sectionId === template.imageAreas.find((a) => a.id === specImage.id)?.sectionId);
        if (slot) {
          specImage.mockupKind = slot.mockupKind;
          const mockup = (input.mockups || []).find((m) => m.kind === slot.mockupKind);
          if (mockup) {
            // Screen orientation in the frame own pixel space, so the
            // rasterizer knows which screen is the laptop (base bar) and
            // which is the phone (no base bar).
            specImage.mockupScreens = mockup.screenAreas.map((area) => ({
              ...area,
              landscape:
                (area.w / 1000) * mockup.frameWidthPx > (area.h / 1000) * mockup.frameHeightPx,
            }));
          }
        }
      }

      const position = index + 1;
      const baseName = `${String(position).padStart(2, "0")}-${template.slug}`;
      const specPath = join(tmpDir, `${baseName}.spec.json`);
      const svgPath = join(tmpDir, `${baseName}.preview.svg`);
      const jpgPath = join(tmpDir, `${baseName}.jpg`);
      writeFileSync(specPath, JSON.stringify(spec, null, 2));
      writeFileSync(svgPath, renderSvg(model));

      const raster = spawnSync(
        "python3",
        [join(HERE, "rasterize.py"), specPath, jpgPath],
        { encoding: "utf8" },
      );
      if (raster.status !== 0 || !existsSync(jpgPath)) {
        throw rasterizerError(raster.stderr || raster.stdout || "rasterizer exited without writing a JPG.");
      }
      images.push({
        position,
        templateId: template.id,
        fileName: `${baseName}.jpg`,
        widthPx: model.canvasWidthPx,
        heightPx: model.canvasHeightPx,
        shortestSidePx: Math.min(model.canvasWidthPx, model.canvasHeightPx),
        format: input.pack.export.format,
        colourProfile: input.pack.export.colourProfile,
      });
    });

    const textPackPlain = renderTextPackPlain(textPack);
    writeFileSync(join(tmpDir, "text-pack.txt"), textPackPlain);

    const manifest: ExportManifest = {
      packName: input.packName,
      platformId: input.pack.platformId,
      packVersion: input.pack.packVersion,
      images,
      textPackFile: "text-pack.txt",
      colourProfile: input.pack.export.colourProfile,
      format: input.pack.export.format,
      sampleRender,
      proofMode: input.proofMode,
      reconciliationSummary: reconciliation.summary,
      warnings: [...new Set(warnings)],
      previewExportDifference: null,
    };
    writeFileSync(join(tmpDir, "manifest.json"), JSON.stringify(manifest, null, 2));

    rmSync(finalDir, { recursive: true, force: true });
    renameSync(tmpDir, finalDir);
    return { manifest, outputDir: finalDir };
  } catch (error) {
    rmSync(tmpDir, { recursive: true, force: true });
    throw error;
  }
}
