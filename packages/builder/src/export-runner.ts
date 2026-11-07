// Real export wiring: PackService calls the export engine through this
// runner, instead of only recording a queued export. The runner adapts a
// builder working pack to the export engine input (exportPack in
// packages/export), runs the real render, quality gate, and text pack,
// and returns the manifest. On any failure the runner throws a plain
// language ExportError; PackService catches it, records a failed export,
// and leaves the saved pack untouched.
//
// Tab names: the builder pack carries features and claims, not tab
// names. The export engine draws a schematic sheet preview from
// tabNames, so the caller must supply the verified tab names for the
// product (from the seller confirmed facts or a test fixture). The
// runner never invents tab names from features. If no tab names are
// supplied, the schematic preview is empty and the manifest notes that.
// Proof mode: true only for a layout proof with a schematic render.
// A proof export is not a publishable pack; the manifest records
// proofMode so a proof can never be mistaken for a real export.

import type { ListingPack } from "./types.ts";
import { exportPack, loadEtsyPack } from "../../export/src/export.ts";
import type { ExportResult } from "../../export/src/export.ts";
import { loadTemplates } from "../../template-engine/src/registry.ts";
import { loadMockups } from "../../mockup-engine/src/library.ts";
import { ExportError } from "../../export/src/errors.ts";

export interface RealExportRunnerOptions {
  templatesDir: string;
  mockupsDir: string;
  outputDir: string;
  proofMode: boolean;
  // Verified tab names for the product, in order. Never invented.
  tabNames?: string[];
  // Measured real render size in pixels. Null means no measured render
  // was supplied, and the quality gate will block a non proof export.
  renderWidthPx?: number | null;
  renderHeightPx?: number | null;
}

export interface ExportRunnerResult {
  outputDir: string;
  imageCount: number;
  manifest: ExportResult["manifest"];
}

export type ExportRunner = (pack: ListingPack) => Promise<ExportRunnerResult>;

export function createRealExportRunner(options: RealExportRunnerOptions): ExportRunner {
  return async (pack: ListingPack): Promise<ExportRunnerResult> => {
    const templates = loadTemplates(options.templatesDir);
    const chosen = pack.templateIds.length > 0
      ? pack.templateIds.map((slug) => templates.find((t) => t.slug === slug || t.id === slug)).filter((t): t is NonNullable<typeof t> => Boolean(t))
      : templates.filter((t) => t.id === "hero");
    if (chosen.length === 0) {
      throw new ExportError("no-template", "Export stopped: no template is chosen for this pack.", "Choose at least one template, then export again.");
    }
    const facts = pack.productFacts;
    if (facts.tabCount === null) {
      throw new ExportError("tab-count-missing", "Export stopped: the real tab count is not confirmed.", "Confirm the real tab count from the product, then export again.");
    }
    const mockups = loadMockups(options.mockupsDir);
    const packConfig = loadEtsyPack();
    const result = exportPack({
      packName: pack.id,
      templates: chosen,
      facts: {
        productName: facts.productName,
        format: facts.formatDetail || facts.format,
        tabCount: facts.tabCount,
        tabNames: options.tabNames ?? [],
        priceList: facts.priceListMinor === null ? null : { amount: facts.priceListMinor / 100, currency: facts.currency ?? "USD" },
        priceLaunch: facts.priceLaunchMinor === null ? null : { amount: facts.priceLaunchMinor / 100, currency: facts.currency ?? "USD" },
        priceNote: facts.verificationNote,
        features: facts.features,
        claims: facts.claims,
        isSampleRender: pack.hasSampleContent,
        renderWidthPx: options.renderWidthPx ?? 3000,
        renderHeightPx: options.renderHeightPx ?? 2000,
      },
      listing: {
        tabCount: facts.tabCount,
        priceList: facts.priceListMinor === null ? null : { amount: facts.priceListMinor / 100, currency: facts.currency ?? "USD" },
        priceLaunch: facts.priceLaunchMinor === null ? null : { amount: facts.priceLaunchMinor / 100, currency: facts.currency ?? "USD" },
        format: facts.formatDetail || facts.format,
        claims: facts.claims,
      },
      resolvedCopy: {
        "product.name": facts.productName,
        "product.tagline": pack.copy.description,
        title: pack.copy.title,
        subtitle: pack.copy.description,
      },
      textPack: { title: pack.copy.title, description: pack.copy.description, tags: pack.copy.tags, checklist: pack.copy.checklist },
      pack: packConfig,
      mockups,
      outputDir: options.outputDir,
      proofMode: options.proofMode,
      cropApproved: false,
      colourChanged: false,
    });
    return { outputDir: result.outputDir, imageCount: result.manifest.images.length, manifest: result.manifest };
  };
}
