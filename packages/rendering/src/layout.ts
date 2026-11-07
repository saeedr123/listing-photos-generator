// Build a render model from a template, verified product facts, resolved
// copy, and an adapted canvas size. The same model feeds preview (SVG) and
// export (JPG raster). No product fact is invented here: every token must
// resolve from the supplied facts or the supplied resolved copy, and any
// token that cannot be resolved is reported as a warning, never filled in.

import type { ProductFacts, TemplateDefinition } from "../../template-engine/src/types.ts";
import type { AdaptedTemplate } from "../../template-engine/src/platform-adapter.ts";
import { checkTextFit } from "../../template-engine/src/text-fit.ts";
import type { RenderImageBox, RenderModel, RenderRect, RenderTextBox } from "./types.ts";

export type ResolvedCopy = Record<string, string>;

const FACT_TOKENS: Record<string, (facts: ProductFacts) => string> = {
  "product.name": (f) => f.productName,
  "product.tabCount": (f) => String(f.tabCount),
  "product.format": (f) => f.format,
  "product.tabNames": (f) => f.tabNames.map((t, i) => `${i + 1}. ${t}`).join("\n"),
  "product.featureList": (f) => f.features.map((t) => `- ${t}`).join("\n"),
};

export function resolveToken(
  token: string,
  facts: ProductFacts,
  copy: ResolvedCopy,
): { text: string; missing: boolean } {
  // Tokens may be embedded in a longer string, for example
  // "{{product.tabCount}} Interactive Tabs". Resolve each {{...}} part.
  let missing = false;
  const text = token.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, inner: string) => {
    const key = inner.trim();
    if (FACT_TOKENS[key]) return FACT_TOKENS[key](facts);
    if (copy[key] !== undefined) return copy[key];
    missing = true;
    return `[missing: ${key}]`;
  });
  if (!text.includes("{{")) return { text, missing };
  return { text, missing: true };
}

function toPx(box: { x: number; y: number; w: number; h: number }, canvasW: number, canvasH: number) {
  return {
    x: Math.round((box.x / 1000) * canvasW),
    y: Math.round((box.y / 1000) * canvasH),
    w: Math.round((box.w / 1000) * canvasW),
    h: Math.round((box.h / 1000) * canvasH),
  };
}

export function buildRenderModel(
  template: TemplateDefinition,
  adapted: AdaptedTemplate,
  facts: ProductFacts,
  copy: ResolvedCopy,
): RenderModel {
  const canvasW = adapted.canvasWidthPx;
  const canvasH = adapted.canvasHeightPx;
  const warnings: string[] = [...adapted.warnings];
  const baseFont = Math.round(canvasW / 28);
  const texts: RenderTextBox[] = [];
  const typoFor = (kind: string) => {
    if (kind === "title") return template.typography.title;
    if (kind === "subtitle") return template.typography.subtitle;
    if (kind === "label" || kind === "pill") return template.typography.label;
    return template.typography.body;
  };

  for (const area of template.textAreas) {
    const px = toPx(area.grid, canvasW, canvasH);
    const resolved = resolveToken(area.contentToken, facts, copy);
    if (resolved.missing) {
      warnings.push(`Text area ${area.id}: token ${area.contentToken} has no supplied value. The seller must supply it before export.`);
    }
    const typo = typoFor(area.kind);
    const fontSizePx = Math.max(18, Math.round(baseFont * typo.sizeScale));
    const fit = checkTextFit(resolved.text, px.w, fontSizePx, area.maxLines, area.maxChars);
    if (!fit.fits) {
      warnings.push(`Text area ${area.id}: ${fit.message}`);
    }
    texts.push({
      id: area.id,
      text: resolved.text,
      x: px.x,
      y: px.y,
      w: px.w,
      h: px.h,
      fontFamily: typo.family,
      fontSizePx,
      fontWeight: typo.weight,
      fontStyle: typo.style.includes("italic") ? "italic" : "normal",
      fill: template.background.text,
      align: area.kind === "title" || area.kind === "subtitle" ? "center" : "left",
      maxLines: area.maxLines,
    });
  }

  const rects: RenderRect[] = [];
  for (const section of template.layout.sections) {
    if (section.kind === "card-grid-2x3" || section.kind === "mini-card-grid-4x3" || section.kind === "card-row-3") {
      const px = toPx(section.grid, canvasW, canvasH);
      rects.push({ id: `${section.id}-card`, x: px.x, y: px.y, w: px.w, h: px.h, fill: template.background.card, stroke: "#E5D5D2", radius: 24, opacity: 1 });
    }
  }

  const images: RenderImageBox[] = [];
  for (const area of template.imageAreas) {
    const px = toPx(area.grid, canvasW, canvasH);
    images.push({
      id: area.id,
      kind: area.kind === "product-render" ? "product-render" : "mockup-frame",
      x: px.x,
      y: px.y,
      w: px.w,
      h: px.h,
      sourceWidthPx: facts.renderWidthPx || null,
      sourceHeightPx: facts.renderHeightPx || null,
      isSample: facts.isSampleRender,
      label: "Seller real product render",
    });
  }

  return {
    templateId: template.id,
    templateVersion: template.version,
    canvasWidthPx: canvasW,
    canvasHeightPx: canvasH,
    colourProfile: adapted.colourProfile,
    background: template.background.base,
    pattern: template.background.pattern,
    rects,
    texts,
    images,
    warnings,
    previewExportDifference: null,
  };
}
