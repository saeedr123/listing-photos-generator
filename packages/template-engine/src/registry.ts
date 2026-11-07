// Template registry: load, validate, and compare admin managed templates.
// A template is a JSON definition in packages/template-engine/templates/.
// Nothing about a seller product is stored in a template. Content arrives
// as tokens resolved against verified product facts at render time.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type {
  DistinctnessSignature,
  TemplateDefinition,
  TemplateValidationIssue,
} from "./types.ts";

const FORBIDDEN_PRODUCT_TEXT = [
  // Competitor claims and figures that must never appear in a template.
  // The check is a safety net, not a substitute for review.
  "13000",
  "13,000",
  "700 plus",
  "Chartered Accountant",
  "ADHD Friendly",
  "Hey Morning Studio",
  "Productive Penguin Co",
  "Works On Any Device",
  "Choose Any Currency",
];

export function loadTemplateFile(path: string): TemplateDefinition {
  const raw = readFileSync(path, "utf8");
  const parsed = JSON.parse(raw) as TemplateDefinition;
  return parsed;
}

export function loadTemplates(dir: string): TemplateDefinition[] {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort();
  return files.map((f) => loadTemplateFile(join(dir, f)));
}

export function validateTemplate(
  template: TemplateDefinition,
): TemplateValidationIssue[] {
  const issues: TemplateValidationIssue[] = [];
  const fail = (code: string, message: string) =>
    issues.push({ code, message });

  if (!template.id || !template.slug || !template.name) {
    fail("missing-identity", `Template is missing id, slug, or name.`);
  }
  if (!Number.isInteger(template.version) || template.version < 1) {
    fail("bad-version", `Template ${template.id}: version must be an integer of 1 or more.`);
  }
  if (!template.layout || !Array.isArray(template.layout.sections) || template.layout.sections.length === 0) {
    fail("no-sections", `Template ${template.id}: layout.sections must not be empty.`);
  }
  const orders = (template.layout.sections || []).map((s) => s.order);
  const uniqueOrders = new Set(orders);
  if (uniqueOrders.size !== orders.length) {
    fail("duplicate-section-order", `Template ${template.id}: section order values must be unique.`);
  }
  const orderFromSections = [...(template.layout.sections || [])]
    .sort((a, b) => a.order - b.order)
    .map((s) => s.id);
  if (JSON.stringify(orderFromSections) !== JSON.stringify(template.layout.sectionOrder)) {
    fail(
      "section-order-mismatch",
      `Template ${template.id}: layout.sectionOrder does not match the order of layout.sections.`,
    );
  }
  for (const section of template.layout.sections || []) {
    const g = section.grid;
    if (g.x < 0 || g.y < 0 || g.w <= 0 || g.h <= 0 || g.x + g.w > 1000 || g.y + g.h > 1000) {
      fail("section-out-of-canvas", `Template ${template.id}: section ${section.id} grid is outside the 0 to 1000 canvas.`);
    }
  }
  if (!template.textAreas || template.textAreas.length === 0) {
    fail("no-text-areas", `Template ${template.id}: at least one text area is required.`);
  }
  for (const area of template.textAreas || []) {
    if (area.contentToken.includes("{{") && !area.contentToken.includes("}}")) {
      fail("bad-token", `Template ${template.id}: text area ${area.id} has an unclosed token.`);
    }
    for (const banned of FORBIDDEN_PRODUCT_TEXT) {
      if (area.contentToken.includes(banned)) {
        fail("forbidden-content", `Template ${template.id}: text area ${area.id} contains forbidden copied content: ${banned}.`);
      }
    }
  }
  for (const area of template.imageAreas || []) {
    if (area.fit !== "contain" || area.centred !== true) {
      fail("bad-fit", `Template ${template.id}: image area ${area.id} must use contain fit, centred.`);
    }
    if (area.allowStretch || area.allowColourChange || area.allowCrop) {
      fail("bad-fit-flag", `Template ${template.id}: image area ${area.id} must not allow stretch, colour change, or crop.`);
    }
  }
  if (!template.allowedOrientations || template.allowedOrientations.length === 0) {
    fail("no-orientations", `Template ${template.id}: allowedOrientations must not be empty.`);
  }
  if (template.layout.canvas.orientation && !template.allowedOrientations.includes(template.layout.canvas.orientation)) {
    fail(
      "canvas-orientation-not-allowed",
      `Template ${template.id}: canvas orientation is not in allowedOrientations.`,
    );
  }
  if (!template.nichePacks || template.nichePacks.length === 0) {
    fail("no-niche-packs", `Template ${template.id}: nichePacks must not be empty.`);
  }
  if (!template.typography || !template.typography.title || !template.typography.subtitle || !template.typography.body) {
    fail("no-typography", `Template ${template.id}: typography needs title, subtitle, and body systems.`);
  }
  const rawText = JSON.stringify(template);
  for (const banned of FORBIDDEN_PRODUCT_TEXT) {
    if (rawText.includes(banned)) {
      fail("forbidden-content", `Template ${template.id}: definition contains forbidden copied content: ${banned}.`);
    }
  }
  return issues;
}

export function distinctnessSignature(
  template: TemplateDefinition,
): DistinctnessSignature {
  const sections = [...template.layout.sections].sort((a, b) => a.order - b.order);
  return {
    sectionOrder: sections.map((s) => s.id),
    sectionKinds: sections.map((s) => s.kind),
    grid: template.layout.grid,
    structure: template.layout.structure,
    typography: {
      titleFamily: template.typography.title.family,
      titleStyle: template.typography.title.style,
      titleCase: template.typography.title.textCase,
      subtitleFamily: template.typography.subtitle.family,
      subtitleStyle: template.typography.subtitle.style,
      bodyFamily: template.typography.body.family,
      bodyStyle: template.typography.body.style,
    },
  };
}

export interface DistinctnessFailure {
  a: string;
  b: string;
  reason: string;
}

/**
 * Distinctness test, mandatory per PROMPT.md section 6.
 * A template counts as distinct only if it differs in layout structure,
 * section order, AND typography system, not only in colour.
 * Colour variants of the same layout do not count.
 */
export function checkDistinctness(
  templates: TemplateDefinition[],
): DistinctnessFailure[] {
  const failures: DistinctnessFailure[] = [];
  for (let i = 0; i < templates.length; i++) {
    for (let j = i + 1; j < templates.length; j++) {
      const a = templates[i];
      const b = templates[j];
      const sigA = distinctnessSignature(a);
      const sigB = distinctnessSignature(b);
      const sameStructure =
        sigA.structure === sigB.structure && sigA.grid === sigB.grid;
      const sameOrder =
        JSON.stringify(sigA.sectionOrder) === JSON.stringify(sigB.sectionOrder) &&
        JSON.stringify(sigA.sectionKinds) === JSON.stringify(sigB.sectionKinds);
      const sameTypography =
        JSON.stringify(sigA.typography) === JSON.stringify(sigB.typography);
      if (sameStructure && sameOrder && sameTypography) {
        failures.push({
          a: a.id,
          b: b.id,
          reason: `${a.id} and ${b.id} share layout structure, section order, and typography system, so they differ only in colour or copy and do not count as distinct templates.`,
        });
      } else if (sameStructure && sameOrder) {
        failures.push({
          a: a.id,
          b: b.id,
          reason: `${a.id} and ${b.id} share layout structure and section order. Typography alone is not enough to count as distinct.`,
        });
      } else if (sameOrder && sameTypography) {
        failures.push({
          a: a.id,
          b: b.id,
          reason: `${a.id} and ${b.id} share section order and typography system. Layout structure alone is not enough to count as distinct.`,
        });
      }
    }
  }
  return failures;
}

export interface RollbackResult {
  restored: TemplateDefinition;
  note: string;
}

/**
 * Rollback creates a new version from an older snapshot. It never overwrites
 * history. The caller supplies the stored older definition; this helper
 * stamps it as the next version with a rollback note.
 */
export function rollbackToVersion(
  current: TemplateDefinition,
  olderSnapshot: TemplateDefinition,
  reason: string,
): RollbackResult {
  const restored: TemplateDefinition = {
    ...olderSnapshot,
    version: current.version + 1,
    status: "preview",
    previousVersion: current.version,
    changeNote: `Rollback to version ${olderSnapshot.version}: ${reason}`,
    updatedAt: new Date().toISOString().slice(0, 10),
  };
  return {
    restored,
    note: `Template ${current.id} rolled back to the layout of version ${olderSnapshot.version} as new version ${restored.version}. Review the preview before publishing.`,
  };
}

export function getTemplateById(
  templates: TemplateDefinition[],
  id: string,
): TemplateDefinition | undefined {
  return templates.find((t) => t.id === id);
}

export function getTemplateByRole(
  templates: TemplateDefinition[],
  role: string,
): TemplateDefinition | undefined {
  return templates.find((t) => t.role === role);
}
