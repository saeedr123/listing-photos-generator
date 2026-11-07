// Export tests, per PROMPT.md section 10.
// Etsy export first: JPG, 2000px on the shortest side, sRGB, images in
// template order, plus a copy paste text pack. Quality gate and
// reconciliation run before export. Failures preserve the saved pack.

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { loadTemplates } from "../packages/template-engine/src/index.ts";
import {
  ExportError,
  buildTextPack,
  exportPack,
  loadEtsyPack,
} from "../packages/export/src/index.ts";
import { checkPremium, loadMockups } from "../packages/mockup-engine/src/index.ts";

const FIX = new URL("./fixtures/", import.meta.url).pathname;
const facts = JSON.parse(readFileSync(`${FIX}maid-of-honor-facts.json`, "utf8"));
const copy = JSON.parse(readFileSync(`${FIX}maid-of-honor-copy.json`, "utf8"));
const textPackInput = JSON.parse(readFileSync(`${FIX}maid-of-honor-text-pack.json`, "utf8"));
const templates = loadTemplates(
  new URL("../packages/template-engine/templates/", import.meta.url).pathname,
);
const mockups = loadMockups(
  new URL("../packages/mockup-engine/mockups/", import.meta.url).pathname,
);
const pack = loadEtsyPack();
// Test outputs live under the repo, not in /tmp: the VM /tmp is a small
// tmpfs and was full when these tests first ran.
const outRoot = join(new URL("./", import.meta.url).pathname, ".tmp-export-output");
rmSync(outRoot, { recursive: true, force: true });
mkdirSync(outRoot, { recursive: true });

after(() => {
  rmSync(outRoot, { recursive: true, force: true });
});

const listing = {
  tabCount: 12,
  priceList: { amount: 13.97, currency: "USD" },
  priceLaunch: { amount: 9.78, currency: "USD" },
  format: "Google Sheets",
  claims: ["Google Sheets only", "Instant download"],
};

function jpgInfo(path) {
  const check = spawnSync("python3", [
    "-c",
    "import sys; from PIL import Image, ImageStat; im = Image.open(sys.argv[1]); " +
      "print(im.format, im.size[0], im.size[1], im.mode); " +
      "print(round(sum(ImageStat.Stat(im.convert('L')).stddev), 1)); " +
      "print(len(im.getcolors(maxcolors=1000000) or []))",
    path,
  ], { encoding: "utf8" });
  assert.equal(check.status, 0, check.stderr);
  const lines = check.stdout.trim().split("\n");
  const [format, w, h, mode] = lines[0].split(" ");
  return { format, width: Number(w), height: Number(h), mode, stddev: Number(lines[1]), colours: Number(lines[2]) };
}

describe("Etsy export", () => {
  let result;
  before(() => {
    const hero = templates.find((t) => t.id === "hero");
    const feature = templates.find((t) => t.id === "feature-close-up");
    result = exportPack({
      packName: "proof-pack",
      templates: [hero, feature],
      facts,
      listing,
      resolvedCopy: copy,
      textPack: textPackInput,
      pack,
      mockups,
      outputDir: outRoot,
      proofMode: true,
      cropApproved: false,
      colourChanged: false,
    });
  });

  it("hero spec carries two mockup screens, laptop and phone", () => {
    const spec = JSON.parse(readFileSync(join(result.outputDir, "01-hero.spec.json"), "utf8"));
    assert.equal(spec.images[0].mockupKind, "laptop-plus-phone");
    assert.equal(spec.images[0].mockupScreens.length, 2);
    assert.deepEqual(
      spec.images[0].mockupScreens.map((s) => s.landscape),
      [true, false],
    );
  });

  it("writes JPGs in template order with a manifest and a text pack", () => {
    assert.deepEqual(result.manifest.images.map((i) => i.templateId), ["hero", "feature-close-up"]);
    assert.deepEqual(result.manifest.images.map((i) => i.fileName), ["01-hero.jpg", "02-feature-close-up.jpg"]);
    assert.ok(existsSync(join(result.outputDir, "01-hero.jpg")));
    assert.ok(existsSync(join(result.outputDir, "02-feature-close-up.jpg")));
    assert.ok(existsSync(join(result.outputDir, "text-pack.txt")));
    assert.ok(existsSync(join(result.outputDir, "manifest.json")));
    assert.ok(existsSync(join(result.outputDir, "01-hero.preview.svg")));
  });

  it("exports 2000px on the shortest side, JPG, sRGB, landscape", () => {
    for (const image of result.manifest.images) {
      assert.equal(image.shortestSidePx, 2000);
      assert.equal(image.format, "jpg");
      assert.equal(image.colourProfile, "sRGB");
      assert.equal(image.widthPx, 3000);
      assert.equal(image.heightPx, 2000);
      const info = jpgInfo(join(result.outputDir, image.fileName));
      assert.equal(info.format, "JPEG");
      assert.equal(info.mode, "RGB");
      assert.equal(info.width, 3000);
      assert.equal(info.height, 2000);
    }
  });

  it("exports real drawn content, not a blank image, with legible text areas", () => {
    for (const image of result.manifest.images) {
      const info = jpgInfo(join(result.outputDir, image.fileName));
      assert.ok(info.stddev > 10, `${image.fileName} looks blank, stddev ${info.stddev}`);
      assert.ok(info.colours > 50, `${image.fileName} has too few colours: ${info.colours}`);
    }
  });

  it("marks the proof pack as a sample render, never as a publishable pack", () => {
    assert.equal(result.manifest.sampleRender, true);
    assert.equal(result.manifest.proofMode, true);
    assert.ok(result.manifest.warnings.some((w) => w.includes("sample render")));
    assert.match(result.manifest.reconciliationSummary, /passed/);
  });

  it("text pack is valid: title within 140 chars, 13 tags within 20 chars each", () => {
    const built = buildTextPack({ ...textPackInput, pack });
    assert.equal(built.valid, true);
    assert.ok(built.title.length <= 140);
    assert.equal(built.tags.length, 13);
    assert.ok(built.tags.every((t) => t.length <= 20));
    const plain = readFileSync(join(result.outputDir, "text-pack.txt"), "utf8");
    assert.match(plain, /TITLE/);
    assert.match(plain, /DESCRIPTION/);
    assert.match(plain, /TAGS/);
    assert.match(plain, /PRE-PUBLISH CHECKLIST/);
  });

  it("exports portrait and landscape orientations in one pack", () => {
    const mobile = templates.find((t) => t.id === "mobile-view");
    const hero = templates.find((t) => t.id === "hero");
    const mixed = exportPack({
      packName: "mixed-orientations",
      templates: [hero, mobile],
      facts,
      listing,
      resolvedCopy: copy,
      textPack: textPackInput,
      pack,
      mockups,
      outputDir: outRoot,
      proofMode: true,
      cropApproved: false,
      colourChanged: false,
    });
    assert.deepEqual(
      mixed.manifest.images.map((i) => [i.widthPx, i.heightPx]),
      [[3000, 2000], [2000, 3000]],
    );
    assert.ok(mixed.manifest.images.every((i) => i.shortestSidePx === 2000));
  });
});

describe("export blocking and preservation", () => {
  it("reconciliation mismatch blocks export and writes nothing", () => {
    const hero = templates.find((t) => t.id === "hero");
    assert.throws(
      () =>
        exportPack({
          packName: "blocked-pack",
          templates: [hero],
          facts,
          listing: { ...listing, tabCount: 20 },
          resolvedCopy: copy,
          textPack: textPackInput,
          pack,
          outputDir: outRoot,
          proofMode: true,
          cropApproved: false,
          colourChanged: false,
        }),
      (error) => {
        assert.ok(error instanceof ExportError);
        assert.equal(error.code, "reconciliation-blocked");
        assert.match(error.message, /Export stopped/);
        assert.ok(error.fix.length > 0);
        return true;
      },
    );
    assert.equal(existsSync(join(outRoot, "blocked-pack")), false);
  });

  it("low resolution source blocks export under the Crisp Quality Gate, never upscales", () => {
    const hero = templates.find((t) => t.id === "hero");
    const lowResFacts = { ...facts, renderWidthPx: 800, renderHeightPx: 533 };
    assert.throws(
      () =>
        exportPack({
          packName: "lowres-pack",
          templates: [hero],
          facts: lowResFacts,
          listing,
          resolvedCopy: copy,
          textPack: textPackInput,
          pack,
          outputDir: outRoot,
          proofMode: true,
          cropApproved: false,
          colourChanged: false,
        }),
      (error) => {
        assert.ok(error instanceof ExportError);
        assert.equal(error.code, "quality-gate-blocked");
        assert.match(error.message, /Upscaling would blur/);
        return true;
      },
    );
    assert.equal(existsSync(join(outRoot, "lowres-pack")), false);
  });

  it("a sample render without proof mode blocks export", () => {
    const hero = templates.find((t) => t.id === "hero");
    assert.throws(
      () =>
        exportPack({
          packName: "sample-blocked",
          templates: [hero],
          facts,
          listing,
          resolvedCopy: copy,
          textPack: textPackInput,
          pack,
          outputDir: outRoot,
          proofMode: false,
          cropApproved: false,
          colourChanged: false,
        }),
      (error) => error.code === "quality-gate-blocked",
    );
  });

  it("a failed export preserves the saved pack", () => {
    const hero = templates.find((t) => t.id === "hero");
    const good = exportPack({
      packName: "preserve-pack",
      templates: [hero],
      facts,
      listing,
      resolvedCopy: copy,
      textPack: textPackInput,
      pack,
      mockups,
      outputDir: outRoot,
      proofMode: true,
      cropApproved: false,
      colourChanged: false,
    });
    const manifestBefore = readFileSync(join(good.outputDir, "manifest.json"), "utf8");
    const badTextPack = { ...textPackInput, title: "x".repeat(200) };
    assert.throws(
      () =>
        exportPack({
          packName: "preserve-pack",
          templates: [hero],
          facts,
          listing,
          resolvedCopy: copy,
          textPack: badTextPack,
          pack,
          outputDir: outRoot,
          proofMode: true,
          cropApproved: false,
          colourChanged: false,
        }),
      (error) => error.code === "text-pack-invalid",
    );
    const manifestAfter = readFileSync(join(good.outputDir, "manifest.json"), "utf8");
    assert.equal(manifestAfter, manifestBefore);
    assert.ok(existsSync(join(good.outputDir, "01-hero.jpg")));
  });

  it("long titles and long tag phrases fail the text pack, with a fix", () => {
    const longTitle = buildTextPack({ ...textPackInput, title: "x".repeat(200), pack });
    assert.equal(longTitle.valid, false);
    assert.ok(longTitle.issues.some((i) => i.code === "title-too-long"));
    const longTag = buildTextPack({
      ...textPackInput,
      tags: ["maid of honor planner workbook"],
      pack,
    });
    assert.equal(longTag.valid, false);
    assert.ok(longTag.issues.some((i) => i.code === "tag-too-long"));
  });

  it("premium frame check runs for the mockups used: flat frame is basic, never premium", () => {
    const mockups = loadMockups(
      new URL("../packages/mockup-engine/mockups/", import.meta.url).pathname,
    );
    const flat = mockups.find((m) => m.id === "flat-feature-frame");
    assert.equal(checkPremium(flat).passesPremium, false);
  });
});
