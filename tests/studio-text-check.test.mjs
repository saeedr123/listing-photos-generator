// Fact check for text on listing images. A fact that is not mentioned is
// fine. A fact that is mentioned must match the product.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkStudioText, studioTextAsString } from "../packages/builder/src/studio-text-check.ts";
import { maidOfHonorFacts } from "../packages/builder/src/test-product.ts";

const facts = { ...maidOfHonorFacts };
const text = (headline, bullets = [], badge = "") => ({ headline, bullets, badge });

describe("image text fact check", () => {
  it("passes text that states no product facts", () => {
    const result = checkStudioText(facts, text("Plan every detail with ease", ["Guest list", "Budget tracker"]), false);
    assert.equal(result.canExport, true);
    assert.equal(result.status, "pass");
  });

  it("passes empty text", () => {
    assert.equal(checkStudioText(facts, text(""), false).canExport, true);
  });

  it("passes a stated tab count and format that match", () => {
    const result = checkStudioText(facts, text(`${facts.tabCount} tabs in Google Sheets`), false);
    assert.equal(result.canExport, true);
    assert.ok(result.items.some((i) => i.factKey === "tab_count" && i.result === "match"));
  });

  it("blocks a wrong tab count and says how to fix it", () => {
    const result = checkStudioText(facts, text("Planner", [`${facts.tabCount + 8} tabs included`]), false);
    assert.equal(result.canExport, false);
    assert.equal(result.status, "blocked");
    assert.match(result.summary, new RegExp(`says ${facts.tabCount + 8} tabs`));
  });

  it("blocks an Excel claim for a Google Sheets product", () => {
    const result = checkStudioText(facts, text("Works in Excel"), false);
    assert.equal(result.canExport, false);
    assert.ok(result.items.some((i) => i.factKey === "format" && i.result === "mismatch"));
  });

  it("blocks a stated price that differs from the product", () => {
    const result = checkStudioText(facts, text("", [], "Only USD 1.00"), false);
    assert.equal(result.canExport, false);
    assert.ok(result.items.some((i) => i.factKey === "price"));
  });

  it("blocks a pack that still has sample content", () => {
    const result = checkStudioText(facts, text("Plan every detail"), true);
    assert.equal(result.canExport, false);
    assert.ok(result.items.some((i) => i.factKey === "sample_content"));
  });

  it("reads headline, bullets and badge together", () => {
    assert.equal(studioTextAsString(text(" A ", [" B ", ""], " C ")), "A\nB\nC");
  });
});
