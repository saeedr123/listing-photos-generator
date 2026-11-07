// Template distinctness tests, per PROMPT.md section 6.
// A template counts as distinct only if it differs in layout structure,
// section order, AND typography system, not only in colour.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  checkDistinctness,
  loadTemplates,
  validateTemplate,
} from "../packages/template-engine/src/index.ts";

const DIR = new URL("../packages/template-engine/templates/", import.meta.url).pathname;
const templates = loadTemplates(DIR);

describe("v1 template set", () => {
  it("has exactly 10 templates", () => {
    assert.equal(templates.length, 10);
  });

  it("every template validates with no issues", () => {
    for (const template of templates) {
      assert.deepEqual(validateTemplate(template), [], template.id);
    }
  });

  it("every template passes the distinctness test", () => {
    assert.deepEqual(checkDistinctness(templates), []);
  });

  it("every template is documented with layout, platform, niche, and best use", () => {
    for (const template of templates) {
      assert.ok(template.layout.structure, template.id);
      assert.ok(template.intendedPlatform, template.id);
      assert.ok(template.intendedNiche, template.id);
      assert.ok(template.bestUse, template.id);
      assert.ok(template.nichePacks.length > 0, template.id);
      assert.ok(template.referenceStructure, template.id);
    }
  });

  it("no template stores seller product facts", () => {
    for (const template of templates) {
      const raw = JSON.stringify(template);
      assert.ok(!raw.includes("13.97"), template.id);
      assert.ok(!raw.includes("9.78"), template.id);
      assert.ok(!raw.includes("13000"), template.id);
      assert.ok(!raw.includes("Hey Morning"), template.id);
      assert.ok(!raw.includes("Productive Penguin"), template.id);
      assert.ok(!raw.includes("Chartered Accountant"), template.id);
    }
  });

  it("a colour only variant fails distinctness", () => {
    const hero = templates.find((t) => t.id === "hero");
    const variant = JSON.parse(JSON.stringify(hero));
    variant.id = "hero-colour-variant";
    variant.slug = "hero-colour-variant";
    variant.background = { ...variant.background, base: "#E8F0FF", accent: "#2244AA" };
    const failures = checkDistinctness([hero, variant]);
    assert.equal(failures.length, 1);
    assert.match(failures[0].reason, /differ only in colour/);
  });

  it("hero and feature close up mirror the v2 reference structure", () => {
    const hero = templates.find((t) => t.id === "hero");
    assert.equal(hero.layout.canvas.aspectRatio, "3:2");
    assert.ok(hero.mockupSlots.some((s) => s.mockupKind === "laptop-plus-phone"));
    assert.ok(hero.textAreas.some((a) => a.id === "pill-1"));
    const feature = templates.find((t) => t.id === "feature-close-up");
    assert.ok(feature.mockupSlots.some((s) => s.mockupKind === "tablet-alone"));
    assert.ok(feature.layout.sections.some((s) => s.id === "tablet"));
  });

  it("mobile view is the one reasoned portrait template", () => {
    const portraits = templates.filter((t) => t.layout.canvas.orientation === "portrait");
    assert.deepEqual(portraits.map((t) => t.id), ["mobile-view"]);
  });

  it("template JSON files contain no em dashes or en dashes", () => {
    for (const template of templates) {
      const raw = readFileSync(`${DIR}${template.slug}.json`, "utf8");
      assert.ok(!raw.includes("\u2014"), template.id);
      assert.ok(!raw.includes("\u2013"), template.id);
    }
  });
});
