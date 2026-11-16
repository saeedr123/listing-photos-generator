// Shot and style kit validation, batch set order, colour extraction,
// pixel diff, and the studio config.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  boxDownsample,
  buildKitVariantFromColours,
  compareFraming,
  contrastRatio,
  diffRgba,
  exportSettingsFromPack,
  extractDominantColours,
  kitIsProofOnly,
  loadStudioConfig,
  loadStudioSeeds,
  mixColours,
  outputSizeForShot,
  pagesNeededByShot,
  planBatch,
  renderBatchInOrder,
  validateShot,
  validateStudioConfig,
  validateStyleKit,
} from "../packages/mockup-engine/src/studio/index.ts";
import { loadEtsyPack } from "../packages/export/src/index.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const seeds = loadStudioSeeds(ROOT);
const config = loadStudioConfig(ROOT);
const pack = loadEtsyPack();
const exportSettings = exportSettingsFromPack(pack);
const clone = (value) => JSON.parse(JSON.stringify(value));
const codes = (issues) => issues.map((i) => i.code);
const shotContext = { models: seeds.models, lighting: seeds.lighting };
const kitContext = { shots: seeds.shots, textures: seeds.textures };
const kit = () => clone(seeds.kits.find((k) => k.id === "modustemplates"));
const shot = (id) => clone(seeds.shots.find((s) => s.id === id));
const a4 = (n) => Array.from({ length: n }, (_, i) => ({ id: `page-${i + 1}`, widthPx: 2480, heightPx: 3508 }));
const plan = (overrides = {}) => planBatch({ kit: kit(), shots: seeds.shots, models: seeds.models, lighting: seeds.lighting, exportSettings, designPages: a4(3), targets: config.batch, allowPreviewItems: true, ...overrides });

describe("studio config", () => {
  it("is valid and names the reference browser", () => {
    assert.deepEqual(validateStudioConfig(config), []);
    assert.match(config.determinism.referenceBrowser, /Chromium/);
    assert.ok(config.batch.targetMinImages === 7 && config.batch.targetMaxImages === 10);
    assert.ok(config.colourExtraction.minColours === 3 && config.colourExtraction.maxColours === 5);
  });

  it("holds no platform value: pixel size, format and image limit come from the platform pack", () => {
    const text = readFileSync(join(ROOT, "config/studio.json"), "utf8");
    const parsed = JSON.parse(text);
    for (const key of ["shortestSidePx", "format", "maxImages", "colourProfile", "quality"]) {
      assert.equal(JSON.stringify(parsed).includes(`"${key}"`), false, key);
    }
    assert.equal(exportSettings.shortestSidePx, pack.export.shortestSidePx);
  });

  it("rejects broken settings", () => {
    assert.ok(codes(validateStudioConfig({ ...clone(config), batch: { targetMinImages: 9, targetMaxImages: 3 } })).includes("bad-batch-targets"));
    assert.ok(codes(validateStudioConfig({ ...clone(config), render: { supersample: 0 } })).includes("bad-supersample"));
    const noBrowser = clone(config);
    noBrowser.determinism.referenceBrowser = "";
    assert.ok(codes(validateStudioConfig(noBrowser)).includes("no-reference-browser"));
  });
});

describe("shot validation", () => {
  it("every shot in the repository validates against the registry", () => {
    assert.equal(seeds.shots.length, 10);
    for (const s of seeds.shots) assert.deepEqual(validateShot(s, shotContext), [], s.id);
  });

  it("covers the shot roles the listing set needs", () => {
    const roles = new Set(seeds.shots.map((s) => s.role));
    for (const role of ["hero", "angled-hero", "laptop-plus-phone", "phone-view", "printed-sheet", "fanned-pages", "what-is-inside", "formats-and-sizes"]) {
      assert.ok(roles.has(role), role);
    }
  });

  it("a shot holds no colour and no wording: those come from the style kit", () => {
    for (const s of seeds.shots) {
      assert.equal(JSON.stringify(s).match(/#[0-9A-Fa-f]{6}/), null, s.id);
      assert.deepEqual(Object.keys(s.textLayout).sort(), ["badge", "bullets", "headline"], s.id);
    }
  });

  it("flags each fault", () => {
    const cases = [
      [(s) => { s.models = []; }, "no-models"],
      [(s) => { s.models[0].modelId = "ghost-model"; }, "model-not-found"],
      [(s) => { s.models[0].modelId = "legacy-laptop-alone"; }, "model-not-3d"],
      [(s) => { s.models[0].scale = 0; }, "bad-scale"],
      [(s) => { s.models[0].surfacePages = { nope: 0 }; }, "surface-not-found"],
      [(s) => { s.models[0].surfacePages = { screen: -1 }; }, "bad-surface-page"],
      [(s) => { s.models[0].colourOptionId = "neon"; }, "colour-option-not-found"],
      [(s) => { s.camera.target = [...s.camera.position]; }, "camera-on-target"],
      [(s) => { s.camera.fovDeg = 1; }, "bad-camera-fov"],
      [(s) => { s.lightingPresetId = "ghost-light"; }, "lighting-not-found"],
      [(s) => { s.contactShadow.opacity = 2; }, "bad-contact-shadow"],
      [(s) => { s.aspect = { w: 0, h: 2 }; }, "bad-aspect"],
      [(s) => { s.role = "poster"; }, "bad-role"],
      [(s) => { s.textLayout.headline = { x: 900, y: 0, w: 200, h: 100, align: "center" }; }, "text-area-out-of-frame"],
    ];
    for (const [mutate, code] of cases) {
      const s = shot("hero");
      mutate(s);
      assert.ok(codes(validateShot(s, shotContext)).includes(code), code);
    }
  });

  it("a published shot must not use a model that is not enabled", () => {
    const s = { ...shot("hero"), status: "published" };
    assert.ok(codes(validateShot(s, shotContext)).includes("model-not-enabled"));
  });

  it("counts the design pages a shot needs", () => {
    assert.equal(pagesNeededByShot(shot("hero"), seeds.models), 1);
    assert.equal(pagesNeededByShot(shot("fanned-pages"), seeds.models), 3);
    assert.equal(pagesNeededByShot(shot("what-is-inside"), seeds.models), 3);
    assert.equal(pagesNeededByShot(shot("formats-and-sizes"), seeds.models), 1);
  });
});

describe("style kit validation", () => {
  it("the draft kit is schema valid and marked as a placeholder draft", () => {
    const k = kit();
    assert.deepEqual(validateStyleKit(k, kitContext), []);
    assert.equal(k.isPlaceholder, true);
    assert.equal(k.status, "draft");
    assert.match(k.placeholderNote, /placeholder/);
    assert.match(k.placeholderNote, /Waiting for the owner brand choices/);
    assert.equal(kitIsProofOnly(k), true);
  });

  it("a kit with placeholder values cannot be published", () => {
    assert.ok(codes(validateStyleKit({ ...kit(), status: "published" }, kitContext)).includes("placeholder-published"));
  });

  it("holds everything a consistent shop look needs", () => {
    const k = kit();
    for (const key of ["backgroundColours", "accentColour", "fonts", "badge", "textSlots", "shots", "background"]) assert.ok(key in k, key);
    assert.ok(Array.isArray(k.textSlots.featureBullets));
    assert.equal(typeof k.badge.wording, "string");
  });

  it("flags each fault", () => {
    const cases = [
      [(k) => { k.backgroundColours = []; }, "bad-background-colours"],
      [(k) => { k.accentColour = "blue"; }, "bad-accent-colour"],
      [(k) => { k.background = { type: "photo" }; }, "bad-background-type"],
      [(k) => { k.background = { type: "desk-texture", textureId: "ghost-texture", backdropColour: "#FFFFFF" }; }, "texture-not-found"],
      [(k) => { k.fonts.headline.family = ""; }, "missing-font-family"],
      [(k) => { k.fonts.body.weight = 50; }, "bad-font-weight"],
      [(k) => { k.badge.style = "starburst"; }, "bad-badge-style"],
      [(k) => { k.textSlots.featureBullets = [1, 2]; }, "bad-text-slots"],
      [(k) => { k.shots = []; }, "no-shots"],
      [(k) => { k.shots.push(clone(k.shots[0])); }, "duplicate-shot"],
      [(k) => { k.shots[0].shotId = "ghost-shot"; }, "shot-not-found"],
      [(k) => { k.isPlaceholder = true; k.placeholderNote = ""; }, "missing-placeholder-note"],
    ];
    for (const [mutate, code] of cases) {
      const k = kit();
      mutate(k);
      assert.ok(codes(validateStyleKit(k, kitContext)).includes(code), code);
    }
  });

  it("a shipped font file needs a licence record, a generic family does not", () => {
    const k = kit();
    assert.equal(k.fonts.headline.fileStorageKey, null);
    k.fonts.headline = { family: "Brand Serif", weight: 700, fileStorageKey: "fonts/brand-serif.woff2", licence: null };
    assert.ok(codes(validateStyleKit(k, kitContext)).includes("font-licence-incomplete"));
    k.fonts.headline.licence = { source: "Foundry", licenceType: "Web licence", licenceDate: "2026-11-16", licenceStorageLocation: "licences/brand-serif.pdf", creator: "Foundry", notes: "" };
    assert.deepEqual(validateStyleKit(k, kitContext), []);
  });
});

describe("batch set order", () => {
  it("the set follows the kit shot order, numbered from 01", () => {
    const result = plan();
    assert.equal(result.canExport, true);
    assert.deepEqual(result.items.map((i) => i.fileName), [
      "01-hero.jpg", "02-angled-hero.jpg", "03-laptop-plus-phone.jpg", "04-phone-view.jpg", "05-tablet-view.jpg",
      "06-printed-sheet.jpg", "07-clipboard-sheet.jpg", "08-fanned-pages.jpg", "09-what-is-inside.jpg", "10-formats-and-sizes.jpg",
    ]);
    assert.deepEqual(result.items.map((i) => i.position), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    assert.deepEqual(result.skipped, []);
  });

  it("reordering the kit reorders the set, and positions stay consecutive", () => {
    const k = kit();
    k.shots = [k.shots[5], k.shots[0], k.shots[3]];
    const result = plan({ kit: k });
    assert.deepEqual(result.items.map((i) => i.fileName), ["01-printed-sheet.jpg", "02-hero.jpg", "03-phone-view.jpg"]);
  });

  it("the pixel size comes from the platform pack and the shot aspect, never from the engine", () => {
    for (const item of plan().items) {
      assert.equal(Math.min(item.widthPx, item.heightPx), pack.export.shortestSidePx);
      assert.equal(item.widthPx, 3000);
    }
    const otherPack = { ...exportSettings, shortestSidePx: 1600, format: "png" };
    const result = plan({ exportSettings: otherPack });
    assert.equal(result.items[0].widthPx, 2400);
    assert.equal(result.items[0].heightPx, 1600);
    assert.equal(result.items[0].fileName, "01-hero.png");
    assert.deepEqual(outputSizeForShot({ aspect: { w: 2, h: 3 } }, 2000), { widthPx: 2000, heightPx: 3000 });
    assert.deepEqual(outputSizeForShot({ aspect: { w: 1, h: 1 } }, 2000), { widthPx: 2000, heightPx: 2000 });
  });

  it("text is left off image 1 when the pack says to avoid text overlays on the first image", () => {
    const k = kit();
    k.shots[0].showHeadline = true;
    const withRule = plan({ kit: k });
    assert.deepEqual(withRule.items[0].text, { headline: null, bullets: [], badge: null });
    assert.ok(withRule.items[0].warnings.some((w) => /avoid text overlays on the first image/.test(w)));
    const withoutRule = plan({ kit: k, exportSettings: { ...exportSettings, firstImageAvoidTextOverlay: false } });
    assert.equal(withoutRule.items[0].text.headline, "Headline placeholder");
  });

  it("text comes only from the kit, and an empty slot is left out, never filled", () => {
    const k = kit();
    k.textSlots.headline = "   ";
    k.textSlots.featureBullets = ["One", "", "  "];
    k.badge.wording = "";
    const result = plan({ kit: k });
    for (const item of result.items) {
      assert.equal(item.text.headline, null);
      assert.equal(item.text.badge, null);
    }
    assert.deepEqual(result.items.find((i) => i.shotId === "phone-view").text.bullets, ["One"]);
  });

  it("a shot that needs more pages than the design has is left out, never padded", () => {
    const result = plan({ designPages: a4(1) });
    assert.deepEqual(result.skipped.map((s) => s.shotId), ["fanned-pages", "what-is-inside"]);
    assert.match(result.skipped[0].reason, /shows 3 design pages and the design has 1/);
    assert.match(result.skipped[0].reason, /never repeated or invented/);
    assert.equal(result.items.length, 8);
    assert.deepEqual(result.items.map((i) => i.position), [1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("warns when the set is outside the 7 to 10 target", () => {
    const k = kit();
    k.shots = k.shots.slice(0, 3);
    assert.ok(plan({ kit: k }).warnings.some((w) => /has 3 images\. The target is 7 to 10/.test(w)));
    assert.equal(plan().warnings.some((w) => /The target is/.test(w)), false);
  });

  it("blocks a set above the pack image limit", () => {
    const result = plan({ exportSettings: { ...exportSettings, maxImages: 4 } });
    assert.equal(result.canExport, false);
    assert.ok(result.errors.some((e) => /allows 4/.test(e)));
  });

  it("blocks a first image whose orientation the pack does not allow", () => {
    const portraitHero = { ...shot("hero"), aspect: { w: 2, h: 3 } };
    const result = plan({ shots: seeds.shots.map((s) => (s.id === "hero" ? portraitHero : s)) });
    assert.equal(result.canExport, false);
    assert.ok(result.errors.some((e) => /Image 1 is portrait/.test(e)));
    assert.ok(result.warnings.some((w) => /mixes landscape and portrait/.test(w)));
  });

  it("warns for portrait content on a landscape screen and never plans a stretch", () => {
    const hero = plan().items[0];
    assert.ok(hero.warnings.some((w) => /Portrait content on a landscape surface/.test(w)));
    assert.ok(hero.warnings.some((w) => /Never stretch/.test(w)));
    const landscape = plan({ designPages: [{ id: "wide", widthPx: 3200, heightPx: 2000 }] });
    const phone = landscape.items.find((i) => i.shotId === "phone-view");
    assert.ok(phone.warnings.some((w) => /Landscape content on a portrait surface/.test(w)));
    assert.ok(phone.warnings.some((w) => /portrait screenshot or an approved crop/.test(w)));
  });

  it("nothing can be planned without a design", () => {
    const result = plan({ designPages: [] });
    assert.equal(result.canExport, false);
    assert.match(result.errors[0], /never from invented content/);
  });

  it("preview status items make the set a proof only, and are refused when not allowed", () => {
    const proof = plan();
    assert.equal(proof.proofMode, true);
    assert.ok(proof.proofReasons.some((r) => /draft or holds placeholder values/.test(r)));
    assert.ok(proof.proofReasons.some((r) => /preview status/.test(r)));
    const strict = plan({ allowPreviewItems: false });
    assert.equal(strict.canExport, false);
    assert.equal(strict.items.length, 0);
    assert.equal(strict.skipped.length, 10);
  });

  it("the background of each image comes from the kit, with the kit entry override", () => {
    const result = plan();
    assert.deepEqual(result.items[0].background, kit().background);
    assert.equal(result.items.find((i) => i.shotId === "printed-sheet").background.type, "desk-texture");
    assert.equal(result.items.find((i) => i.shotId === "tablet-view").background.type, "solid");
  });

  it("the render loop runs in listing order and refuses a blocked plan", async () => {
    const order = [];
    const runner = { renderItem: async (item) => { order.push(item.position); return { item }; } };
    const result = plan();
    const shuffled = { ...result, items: [...result.items].reverse() };
    const progress = [];
    await renderBatchInOrder(runner, shuffled, { supersample: 2 }, (p) => progress.push(`${p.position}:${p.stage}`));
    assert.deepEqual(order, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    assert.equal(progress[0], "1:rendering");
    assert.equal(progress[progress.length - 1], "10:done");
    await assert.rejects(() => renderBatchInOrder(runner, plan({ designPages: [] }), { supersample: 2 }), /cannot be rendered/);
  });
});

describe("colour extraction", () => {
  const options = config.colourExtraction;
  function image(blocks, width = 100, height = 100) {
    // blocks: [[r, g, b, share]], laid out as horizontal bands.
    const data = new Uint8ClampedArray(width * height * 4);
    let row = 0;
    for (const [r, g, b, share] of blocks) {
      const rows = Math.round(share * height);
      for (let y = row; y < Math.min(height, row + rows); y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
        }
      }
      row += rows;
    }
    return { data, width, height };
  }

  it("finds the dominant colours, most common first", () => {
    const img = image([[255, 255, 255, 0.5], [31, 78, 121, 0.3], [200, 30, 40, 0.15], [240, 200, 20, 0.05]]);
    const result = extractDominantColours(img.data, img.width, img.height, options);
    assert.deepEqual(result.colours.map((c) => c.hex), ["#FFFFFF", "#1F4E79", "#C81E28", "#F0C814"]);
    assert.ok(Math.abs(result.colours[0].share - 0.5) < 0.02);
    assert.equal(result.fewerThanMinimum, false);
  });

  it("returns 3 to 5 colours for a design with many colours", () => {
    const img = image([[250, 250, 250, 0.3], [20, 40, 90, 0.2], [200, 40, 40, 0.15], [40, 160, 80, 0.15], [240, 190, 40, 0.1], [120, 60, 150, 0.05], [10, 10, 10, 0.05]]);
    const result = extractDominantColours(img.data, img.width, img.height, options);
    assert.ok(result.colours.length >= 3 && result.colours.length <= 5);
    assert.equal(result.colours[0].hex, "#FAFAFA");
  });

  it("is deterministic", () => {
    const img = image([[250, 250, 250, 0.4], [20, 40, 90, 0.35], [200, 40, 40, 0.25]]);
    const a = extractDominantColours(img.data, img.width, img.height, options);
    const b = extractDominantColours(img.data, img.width, img.height, options);
    assert.deepEqual(a, b);
  });

  it("never changes the design pixels", () => {
    const img = image([[250, 250, 250, 0.4], [20, 40, 90, 0.35], [200, 40, 40, 0.25]]);
    const before = Uint8ClampedArray.from(img.data);
    extractDominantColours(img.data, img.width, img.height, options);
    assert.deepEqual(img.data, before);
  });

  it("invents no colour when the design has fewer than the minimum", () => {
    const img = image([[255, 255, 255, 0.5], [0, 0, 0, 0.5]]);
    const result = extractDominantColours(img.data, img.width, img.height, options);
    assert.equal(result.colours.length, 2);
    assert.equal(result.fewerThanMinimum, true);
  });

  it("skips transparent pixels", () => {
    const img = image([[10, 200, 10, 0.5], [0, 0, 0, 0.5]]);
    for (let i = 3; i < img.data.length / 2; i += 4) img.data[i] = 0;
    const result = extractDominantColours(img.data, img.width, img.height, options);
    assert.deepEqual(result.colours.map((c) => c.hex), ["#000000"]);
  });

  it("the style kit variant is an offer built from the colours, and the kit itself is not changed", () => {
    const base = kit();
    const before = clone(base);
    const colours = [{ hex: "#FFFFFF", share: 0.5 }, { hex: "#1F4E79", share: 0.3 }, { hex: "#C81E28", share: 0.2 }];
    const variant = buildKitVariantFromColours(base, colours, options.variantTintAmount);
    assert.deepEqual(base, before);
    assert.equal(variant.variantOf, "modustemplates");
    assert.equal(variant.id, "modustemplates--design-colours");
    assert.equal(variant.accentColour, "#C81E28");
    assert.equal(variant.backgroundColours[0], mixColours("#1F4E79", "#FFFFFF", options.variantTintAmount));
    assert.ok(contrastRatio(variant.textColour, variant.backgroundColours[0]) >= 4.5);
    assert.ok(variant.shots.every((s) => s.background === null));
    assert.equal(variant.isPlaceholder, base.isPlaceholder);
    assert.equal(variant.status, base.status);
    assert.deepEqual(validateStyleKit(variant, kitContext), []);
    assert.throws(() => buildKitVariantFromColours(base, [], 0.85), /No colours/);
  });
});

describe("determinism checks", () => {
  const threshold = config.determinism.pixelDiff;
  const solid = (w, h, value) => ({ widthPx: w, heightPx: h, data: new Uint8ClampedArray(w * h * 4).fill(value) });

  it("identical renders are within the threshold", () => {
    const result = diffRgba(solid(40, 30, 120), solid(40, 30, 120), threshold);
    assert.equal(result.withinThreshold, true);
    assert.equal(result.differentPixels, 0);
    assert.equal(result.maxChannelDifference, 0);
  });

  it("tiny rounding noise is within the threshold, a visible change is not", () => {
    const reference = solid(100, 100, 120);
    const noisy = solid(100, 100, 120);
    for (let i = 0; i < noisy.data.length; i += 4 * 7) noisy.data[i] = 122;
    assert.equal(diffRgba(reference, noisy, threshold).withinThreshold, true);
    const moved = solid(100, 100, 120);
    for (let i = 0; i < 100 * 20 * 4; i++) moved.data[i] = 200;
    const result = diffRgba(reference, moved, threshold);
    assert.equal(result.withinThreshold, false);
    assert.match(result.message, /A human must review this diff before release/);
  });

  it("a different pixel size is never within the threshold", () => {
    const result = diffRgba(solid(40, 30, 120), solid(41, 30, 120), threshold);
    assert.equal(result.sameSize, false);
    assert.equal(result.withinThreshold, false);
  });

  it("box downsample averages whole blocks", () => {
    const image = { widthPx: 4, heightPx: 2, data: new Uint8ClampedArray(4 * 2 * 4) };
    for (let p = 0; p < 8; p++) image.data.set(p % 4 < 2 ? [100, 0, 0, 255] : [0, 200, 0, 255], p * 4);
    const small = boxDownsample(image, 2);
    assert.equal(small.widthPx, 2);
    assert.equal(small.heightPx, 1);
    assert.deepEqual([...small.data], [100, 0, 0, 255, 0, 200, 0, 255]);
    assert.throws(() => boxDownsample(image, 3), /does not divide/);
  });

  it("framing comparison checks pixel size, camera and screen bounds", () => {
    const framing = { widthPx: 3000, heightPx: 2000, camera: { position: [0, 0.2, 0.72], target: [0, 0.1, 0], fovDeg: 28 }, surfaces: [{ modelIndex: 0, surfaceId: "screen", cornersPx: [[800, 400], [2200, 400], [2200, 1280], [800, 1280]] }] };
    assert.deepEqual(compareFraming(framing, clone(framing), config.determinism.cornerTolerancePx), { same: true, differences: [] });
    const nudged = clone(framing);
    nudged.surfaces[0].cornersPx[0] = [800.3, 400.2];
    assert.equal(compareFraming(framing, nudged, config.determinism.cornerTolerancePx).same, true);
    const moved = clone(framing);
    moved.surfaces[0].cornersPx[0] = [803, 400];
    assert.match(compareFraming(framing, moved, config.determinism.cornerTolerancePx).differences[0], /corner 1 moved 3\.00 px/);
    const otherCamera = clone(framing);
    otherCamera.camera.fovDeg = 30;
    assert.ok(compareFraming(framing, otherCamera, 0.5).differences.includes("Camera differs from the reference."));
    const otherSize = { ...clone(framing), widthPx: 2400 };
    assert.match(compareFraming(framing, otherSize, 0.5).differences[0], /Pixel size/);
  });
});
