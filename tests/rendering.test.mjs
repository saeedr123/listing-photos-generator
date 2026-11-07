// Rendering tests: one rendering path feeds preview and export.
// The same render model produces the SVG preview and the render spec that
// the export rasterizer consumes, so the two cannot drift silently.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadTemplates } from "../packages/template-engine/src/index.ts";
import { loadEtsyPack } from "../packages/export/src/index.ts";
import { adaptTemplateForPlatform } from "../packages/template-engine/src/platform-adapter.ts";
import { buildRenderModel } from "../packages/rendering/src/layout.ts";
import { renderSvg, toRenderSpec, wrapText } from "../packages/rendering/src/svg.ts";
import { checkTextFit } from "../packages/template-engine/src/text-fit.ts";

const FIX = new URL("./fixtures/", import.meta.url).pathname;
const facts = JSON.parse(readFileSync(`${FIX}maid-of-honor-facts.json`, "utf8"));
const copy = JSON.parse(readFileSync(`${FIX}maid-of-honor-copy.json`, "utf8"));
const templates = loadTemplates(
  new URL("../packages/template-engine/templates/", import.meta.url).pathname,
);
const pack = loadEtsyPack();

function heroModel() {
  const hero = templates.find((t) => t.id === "hero");
  return buildRenderModel(hero, adaptTemplateForPlatform(hero, pack), facts, copy);
}

describe("rendering abstraction", () => {
  it("adapts a template to the Etsy pack: 2000px shortest side, JPG, sRGB", () => {
    const hero = templates.find((t) => t.id === "hero");
    const adapted = adaptTemplateForPlatform(hero, pack);
    assert.equal(adapted.shortestSidePx, 2000);
    assert.equal(adapted.format, "jpg");
    assert.equal(adapted.colourProfile, "sRGB");
    assert.equal(adapted.canvasWidthPx, 3000);
    assert.equal(adapted.canvasHeightPx, 2000);
  });

  it("adapts the portrait mobile view to 2000 by 3000", () => {
    const mobile = templates.find((t) => t.id === "mobile-view");
    const adapted = adaptTemplateForPlatform(mobile, pack);
    assert.equal(adapted.canvasWidthPx, 2000);
    assert.equal(adapted.canvasHeightPx, 3000);
    assert.equal(adapted.shortestSidePx, 2000);
  });

  it("builds a render model with resolved product facts, no invented text", () => {
    const model = heroModel();
    assert.equal(model.templateId, "hero");
    assert.equal(model.canvasWidthPx, 3000);
    assert.equal(model.colourProfile, "sRGB");
    const title = model.texts.find((t) => t.id === "title");
    assert.equal(title.text, "Maid of Honor Planner");
    const pill = model.texts.find((t) => t.id === "pill-1");
    assert.equal(pill.text, "12 Interactive Tabs");
    assert.ok(!model.texts.some((t) => t.text.includes("[missing:")));
  });

  it("preview SVG and export spec come from the same model", () => {
    const model = heroModel();
    const svg = renderSvg(model);
    const spec = toRenderSpec(model);
    assert.equal(spec.canvasWidthPx, model.canvasWidthPx);
    assert.equal(spec.canvasHeightPx, model.canvasHeightPx);
    assert.match(svg, new RegExp(`width="${model.canvasWidthPx}"`));
    assert.match(svg, /Maid of Honor Planner/);
    assert.equal(spec.texts.length, model.texts.length);
    assert.equal(model.previewExportDifference, null);
  });

  it("a missing token is reported as a warning, never invented", () => {
    const hero = templates.find((t) => t.id === "hero");
    const model = buildRenderModel(hero, adaptTemplateForPlatform(hero, pack), facts, {});
    assert.ok(model.warnings.some((w) => w.includes("tagline")));
    assert.ok(model.texts.some((t) => t.text.includes("[missing:")));
  });

  it("long content is flagged instead of overflowing silently", () => {
    const longTitle = "Maid of Honor Planner Google Sheets Wedding Planning Workbook With A Very Long Title That Keeps Going";
    const fit = checkTextFit(longTitle, 880, 107, 2, 60);
    assert.equal(fit.fits, false);
    assert.equal(fit.action, "shorten");
    const ok = checkTextFit("Maid of Honor Planner", 880, 107, 2, 60);
    assert.equal(ok.fits, true);
  });

  it("word wrap keeps lines inside the box width", () => {
    const lines = wrapText("Maid of Honor Planner Google Sheets Wedding Planning Workbook", 400, 40);
    assert.ok(lines.length > 1);
    for (const line of lines) {
      assert.ok(line.length * 40 * 0.52 <= 400 + 40);
    }
  });

  it("SVG output escapes text, so no garbled markup is produced", () => {
    const model = heroModel();
    model.texts[0].text = "Planner <Test> & Friends";
    const svg = renderSvg(model);
    assert.ok(svg.includes("Planner &lt;Test&gt; &amp; Friends"));
  });
});
