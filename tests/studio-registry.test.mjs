// Model registry tests: validation, the admin add flow, version
// operations, premium label rules, licence records, and the migration of
// the 5 old SVG frames (kept as basic 2D fallbacks, honestly labelled).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadMockups } from "../packages/mockup-engine/src/index.ts";
import { InMemoryObjectStorage } from "../packages/storage/src/index.ts";
import {
  RegistryValidationError,
  StudioRegistry,
  duplicateModel,
  editModel,
  exportSettingsFromPack,
  hideModel,
  inspectGlb,
  isUsableInShots,
  loadStudioConfig,
  loadStudioSeeds,
  migrateLegacyMockup,
  migrateLegacyMockups,
  missingLicenceFields,
  planBatch,
  publishModel,
  resolveBuiltinAssetPath,
  rollbackModel,
  validateEntryAgainstGlb,
  validateModelAddFlow,
  validateModelEntry,
} from "../packages/mockup-engine/src/studio/index.ts";
import { loadEtsyPack } from "../packages/export/src/index.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const seeds = loadStudioSeeds(ROOT);
const config = loadStudioConfig(ROOT);
const glbBytes = (name) => new Uint8Array(readFileSync(join(ROOT, "packages/mockup-engine/assets/models", name)));
const clone = (value) => JSON.parse(JSON.stringify(value));
const ctx = { actor: "tester", now: "2026-11-16T12:00:00.000Z" };
const laptop = () => clone(seeds.models.find((m) => m.id === "laptop-generic"));
const signOff = { reviewedBy: "Test reviewer", reviewedAt: "2026-11-16", approvedBy: "Test owner", approvedAt: "2026-11-16", decision: "approved", note: "Test record only." };
const allCriteria = { realisticPerspective: true, softRealisticShadows: true, depth: true, lifestyleOrDeskScene: true, realisticMaterialsAndEdges: true, screenCrispAtExportSize: true };
const codes = (issues) => issues.map((i) => i.code);

describe("registry records kept in the repository", () => {
  const models3d = seeds.models.filter((m) => m.renderer === "glb-3d");

  it("has the built in 3D models, including print and paper models", () => {
    assert.deepEqual(models3d.map((m) => m.id).sort(), [
      "clipboard-a4", "laptop-generic", "paper-a4", "paper-fan-a4", "paper-fan-us-letter", "paper-us-letter", "phone-generic", "tablet-generic-landscape", "tablet-generic-portrait",
    ]);
  });

  it("every record validates with no issues", () => {
    for (const model of seeds.models) assert.deepEqual(validateModelEntry(model), [], model.id);
  });

  it("every asset carries a complete licence record: models, lighting, textures", () => {
    for (const asset of [...seeds.models, ...seeds.lighting, ...seeds.textures]) {
      assert.deepEqual(missingLicenceFields(asset.licence), [], asset.id);
    }
  });

  it("no record is labelled premium and none has a human review sign-off", () => {
    for (const model of seeds.models) {
      assert.equal(model.qualityLabel, "basic", model.id);
      assert.equal(model.humanReview, null, model.id);
    }
  });

  it("built in 3D models are in preview, not published: they were not previewed with a real product render", () => {
    for (const model of models3d) {
      assert.equal(model.status, "preview", model.id);
      assert.equal(model.previewedWithRealRender, false, model.id);
    }
  });

  it("each model file exists, matches its recorded size and checksum, and holds the named meshes and materials", () => {
    for (const model of models3d) {
      const path = resolveBuiltinAssetPath(ROOT, model.modelFile.storageKey);
      assert.ok(path, model.id);
      const data = readFileSync(path);
      assert.equal(data.length, model.modelFile.bytes, model.id);
      assert.equal(createHash("sha256").update(data).digest("hex"), model.modelFile.sha256, model.id);
      assert.deepEqual(validateEntryAgainstGlb(model, inspectGlb(new Uint8Array(data))), [], model.id);
    }
  });

  it("no built in model carries an image texture, so none can carry a logo", () => {
    for (const file of readdirSync(join(ROOT, "packages/mockup-engine/assets/models")).filter((f) => f.endsWith(".glb"))) {
      assert.equal(inspectGlb(glbBytes(file)).imageCount, 0, file);
    }
  });

  it("paper models cover A4 and US Letter with the right paper aspect, a fanned stack of 3, and a clipboard", () => {
    const aspect = (id, surface = 0) => seeds.models.find((m) => m.id === id).surfaces[surface].aspect;
    assert.ok(Math.abs(aspect("paper-a4") - 210 / 297) < 1e-9);
    assert.ok(Math.abs(aspect("paper-us-letter") - 8.5 / 11) < 1e-3);
    assert.ok(Math.abs(aspect("clipboard-a4") - 210 / 297) < 1e-9);
    const fan = seeds.models.find((m) => m.id === "paper-fan-a4");
    assert.deepEqual(fan.surfaces.map((s) => s.pageSlot), [0, 1, 2]);
    assert.ok(fan.surfaces.every((s) => s.kind === "paper"));
  });

  it("builtin asset keys cannot escape the assets folder", () => {
    assert.equal(resolveBuiltinAssetPath(ROOT, "builtin/../../package.json"), null);
    assert.equal(resolveBuiltinAssetPath(ROOT, "models/laptop-generic.glb"), null);
    assert.equal(resolveBuiltinAssetPath(ROOT, "builtin/models/does-not-exist.glb"), null);
  });
});

describe("GLB inspection", () => {
  it("lists mesh and material names of a real GLB", () => {
    const info = inspectGlb(glbBytes("laptop-generic.glb"));
    assert.equal(info.valid, true);
    assert.equal(info.gltfVersion, "2.0");
    assert.ok(info.meshNodeNames.includes("screen"));
    assert.ok(info.materialNames.includes("body"));
  });

  it("rejects files that are not GLB, with a plain message", () => {
    assert.match(inspectGlb(new TextEncoder().encode("this is not a model file at all")).error, /GLB signature/);
    assert.match(inspectGlb(new Uint8Array(4)).error, /too small/);
    const cut = glbBytes("phone-generic.glb").slice(0, 200);
    assert.equal(inspectGlb(cut).valid, false);
  });
});

describe("model registry validation", () => {
  it("flags each structural fault", () => {
    const cases = [
      [(m) => { m.id = "Bad Id"; }, "missing-identity"],
      [(m) => { m.category = "spaceship"; }, "bad-category"],
      [(m) => { m.modelFile = null; }, "missing-model-file"],
      [(m) => { m.surfaces = []; }, "no-surface"],
      [(m) => { m.surfaces[0].meshName = ""; }, "missing-mesh-name"],
      [(m) => { m.surfaces[0].aspect = 0; }, "bad-surface-aspect"],
      [(m) => { m.surfaces[0].letterboxColour = "grey"; }, "bad-letterbox-colour"],
      [(m) => { m.surfaces.push(clone(m.surfaces[0])); }, "duplicate-surface"],
      [(m) => { m.allowedOrientations = []; }, "no-orientations"],
      [(m) => { m.cameraPresets = []; }, "no-camera-preset"],
      [(m) => { m.defaultCameraPresetId = "nope"; }, "bad-default-camera"],
      [(m) => { m.cameraPresets[0].fovDeg = 170; }, "bad-camera-fov"],
      [(m) => { m.cameraPresets[0].target = [...m.cameraPresets[0].position]; }, "camera-on-target"],
      [(m) => { m.colourOptions[0].colour = "silver"; }, "bad-colour"],
      [(m) => { m.defaultColourOptionId = "nope"; }, "bad-default-colour"],
      [(m) => { m.version = 2; m.previousVersion = 1; m.changeNote = ""; }, "missing-change-note"],
      [(m) => { m.status = "live"; }, "bad-status"],
      [(m) => { m.renderer = "photo"; }, "bad-renderer"],
    ];
    for (const [mutate, code] of cases) {
      const model = laptop();
      mutate(model);
      assert.ok(codes(validateModelEntry(model)).includes(code), code);
    }
  });

  it("a published model needs a complete licence record, the unbranded confirmation and a real render preview", () => {
    const model = { ...laptop(), status: "published" };
    assert.deepEqual(codes(validateModelEntry(model)), ["not-previewed"]);
    model.previewedWithRealRender = true;
    assert.deepEqual(validateModelEntry(model), []);
    assert.ok(codes(validateModelEntry({ ...model, unbrandedConfirmed: false })).includes("unbranded-not-confirmed"));
    for (const field of ["source", "licenceType", "licenceDate", "licenceStorageLocation"]) {
      const broken = clone(model);
      broken.licence[field] = "";
      assert.ok(codes(validateModelEntry(broken)).includes("licence-incomplete"), field);
    }
  });
});

describe("premium label rules", () => {
  it("a model labelled premium without a recorded human review sign-off fails validation, at every status", () => {
    for (const status of ["draft", "preview", "published"]) {
      for (const humanReview of [null, { ...signOff, decision: "rejected" }, { ...signOff, reviewedBy: " " }]) {
        const model = { ...laptop(), status, previewedWithRealRender: true, qualityLabel: "premium", premiumCriteria: allCriteria, humanReview };
        assert.ok(codes(validateModelEntry(model)).includes("premium-no-human-review"), `${status} ${JSON.stringify(humanReview)}`);
      }
    }
  });

  it("premium also needs every criterion: a sign-off alone is not enough", () => {
    const model = { ...laptop(), qualityLabel: "premium", premiumCriteria: { ...allCriteria, lifestyleOrDeskScene: false }, humanReview: signOff };
    const issues = validateModelEntry(model);
    assert.ok(codes(issues).includes("premium-check-failed"));
    assert.match(issues.find((i) => i.code === "premium-check-failed").message, /lifestyle or desk scene/);
  });

  it("premium passes with every criterion and an approved sign-off", () => {
    const model = { ...laptop(), status: "published", previewedWithRealRender: true, qualityLabel: "premium", premiumCriteria: allCriteria, humanReview: signOff };
    assert.deepEqual(validateModelEntry(model), []);
  });

  it("a flat 2D frame can never be premium in the registry", () => {
    const legacy = migrateLegacyMockup(loadMockups(join(ROOT, "packages/mockup-engine/mockups")).find((m) => m.id === "laptop-alone"));
    const forced = { ...legacy, qualityLabel: "premium", premiumCriteria: allCriteria, humanReview: signOff };
    assert.ok(codes(validateModelEntry(forced)).includes("legacy-not-basic"));
  });
});

describe("migration of the 5 old SVG frames", () => {
  const old = loadMockups(join(ROOT, "packages/mockup-engine/mockups"));
  const migrated = migrateLegacyMockups(old);

  it("all 5 are kept, as 2D fallbacks", () => {
    assert.equal(migrated.length, 5);
    assert.deepEqual(migrated.map((m) => m.id).sort(), [
      "legacy-flat-feature-frame", "legacy-laptop-alone", "legacy-laptop-plus-phone", "legacy-phone-alone", "legacy-tablet-alone",
    ]);
    for (const entry of migrated) {
      assert.equal(entry.renderer, "svg-2d", entry.id);
      assert.ok(entry.tags.includes("2d-fallback"), entry.id);
      assert.match(entry.name, /2D fallback/, entry.id);
    }
  });

  it("each is honestly labelled basic, whatever the old file said", () => {
    for (const entry of migrated) {
      assert.equal(entry.qualityLabel, "basic", entry.id);
      assert.equal(entry.humanReview, null, entry.id);
      assert.equal(entry.premiumCriteria.realisticPerspective, false, entry.id);
      assert.equal(entry.premiumCriteria.depth, false, entry.id);
      assert.match(entry.changeNote, /never labelled premium/, entry.id);
    }
    const lying = { ...clone(old[1]), qualityLabel: "premium" };
    assert.equal(migrateLegacyMockup(lying).qualityLabel, "basic");
  });

  it("keeps the frame file, screen areas, orientations, niche packs and licence record", () => {
    for (const mockup of old) {
      const entry = migrated.find((m) => m.id === `legacy-${mockup.id}`);
      assert.equal(entry.legacyFrame.frameFile, mockup.frameFile);
      assert.deepEqual(entry.legacyFrame.screenAreas, mockup.screenAreas);
      assert.deepEqual(entry.legacyFrame.nichePacks, mockup.nichePacks);
      assert.equal(entry.legacyFrame.legacyVersion, mockup.version);
      assert.deepEqual(entry.allowedOrientations, mockup.allowedScreenOrientations);
      assert.deepEqual(entry.licence, mockup.licence);
      assert.deepEqual(validateModelEntry(entry), [], entry.id);
    }
  });

  it("a 2D fallback is never used by the 3D studio", () => {
    for (const entry of migrated) {
      assert.equal(isUsableInShots(entry), false, entry.id);
      assert.equal(isUsableInShots(entry, true), false, entry.id);
    }
  });

  it("the old definition files are still the source: the registry seeds include them", () => {
    assert.equal(seeds.models.filter((m) => m.renderer === "svg-2d").length, 5);
  });
});

describe("version operations", () => {
  it("edit makes a new version with a note and never changes the id", () => {
    const next = editModel(laptop(), { name: "Laptop, renamed", id: "hijack" }, "Renamed.", ctx);
    assert.equal(next.id, "laptop-generic");
    assert.equal(next.version, 2);
    assert.equal(next.previousVersion, 1);
    assert.equal(next.updatedBy, "tester");
    assert.throws(() => editModel(laptop(), { name: "x" }, "  ", ctx), /note/);
  });

  it("duplicate starts a new draft that must be previewed again", () => {
    const copy = duplicateModel({ ...laptop(), status: "published", previewedWithRealRender: true }, "laptop-copy", "Laptop copy", ctx);
    assert.equal(copy.id, "laptop-copy");
    assert.equal(copy.version, 1);
    assert.equal(copy.status, "draft");
    assert.equal(copy.previewedWithRealRender, false);
    assert.match(copy.changeNote, /Duplicated from laptop-generic version 1/);
    assert.throws(() => duplicateModel(laptop(), "laptop-generic", "", ctx), /own id/);
    assert.throws(() => duplicateModel(laptop(), "Bad Id", "", ctx), /lower case/);
  });

  it("hide needs a reason and keeps the record", () => {
    const hidden = hideModel(laptop(), "Wrong proportions.", ctx);
    assert.equal(hidden.status, "hidden");
    assert.equal(hidden.version, 2);
    assert.throws(() => hideModel(laptop(), "", ctx), /note/);
  });

  it("publish refuses a model that is not ready and lists why", () => {
    assert.throws(() => publishModel(laptop(), "Enable.", ctx), /preview the model with a real product render/);
    const ready = publishModel({ ...laptop(), previewedWithRealRender: true }, "Enable.", ctx);
    assert.equal(ready.status, "published");
  });

  it("rollback makes a new version from the older snapshot and does not go live by itself", () => {
    const v1 = { ...laptop(), status: "published", previewedWithRealRender: true };
    const v2 = editModel(v1, { name: "Broken name" }, "A bad edit.", ctx);
    const v3 = rollbackModel(v2, v1, "The edit was wrong.", ctx);
    assert.equal(v3.version, 3);
    assert.equal(v3.previousVersion, 2);
    assert.equal(v3.name, v1.name);
    assert.equal(v3.status, "preview");
    assert.match(v3.changeNote, /Rollback to version 1: The edit was wrong\./);
    assert.throws(() => rollbackModel(v2, v1, "", ctx), /note/);
    assert.throws(() => rollbackModel(v1, v2, "x", ctx), /older/);
  });
});

describe("admin add flow", () => {
  const glb = inspectGlb(glbBytes("phone-generic.glb"));
  const blank = () => ({ ...laptop(), id: "new-phone", slug: "new-phone", name: "New phone", category: "phone", modelFile: null, surfaces: [], cameraPresets: [], defaultCameraPresetId: null, colourOptions: [], defaultColourOptionId: null, allowedOrientations: [], licence: { source: "", licenceType: "", licenceDate: "", licenceStorageLocation: "", creator: "", notes: "" }, unbrandedConfirmed: false, previewedWithRealRender: false, status: "draft" });

  it("reports every missing step, in order", () => {
    const flow = validateModelAddFlow(blank(), null);
    assert.equal(flow.readyToEnable, false);
    assert.deepEqual(flow.missingSteps.slice(0, 5), [
      "Upload a GLB model file.",
      "Name the screen mesh.",
      "Set camera presets.",
      "Set allowed orientations.",
      "Preview it with a real product render.",
    ]);
    assert.ok(flow.missingSteps.some((s) => /licence record/.test(s)));
    assert.ok(flow.missingSteps.some((s) => /no brand logo/.test(s)));
  });

  it("a mesh name that is not in the uploaded file blocks the flow", () => {
    const entry = { ...blank(), modelFile: { storageKey: "models/x.glb", bytes: 1, sha256: "x" }, surfaces: [{ id: "screen", meshName: "display", kind: "screen", aspect: 0.46, pageSlot: 0, letterboxColour: "#000000" }] };
    const flow = validateModelAddFlow(entry, glb);
    assert.ok(flow.missingSteps.includes("Name the screen mesh."));
    assert.ok(codes(flow.issues).includes("mesh-not-in-glb"));
    assert.match(flow.issues.find((i) => i.code === "mesh-not-in-glb").message, /Meshes found: bezel, body, screen/);
  });

  it("is ready once every step is done", () => {
    const entry = {
      ...blank(),
      modelFile: { storageKey: "models/x.glb", bytes: 1, sha256: "x" },
      surfaces: [{ id: "screen", meshName: "screen", kind: "screen", aspect: 0.066 / 0.143, pageSlot: 0, letterboxColour: "#000000" }],
      cameraPresets: [{ id: "front", label: "Front", position: [0, 0.08, 0.4], target: [0, 0.076, 0], fovDeg: 26 }],
      defaultCameraPresetId: "front",
      allowedOrientations: ["portrait"],
      licence: { source: "Test vendor", licenceType: "Test licence", licenceDate: "2026-11-16", licenceStorageLocation: "licences/test.pdf", creator: "Test", notes: "" },
      unbrandedConfirmed: true,
      previewedWithRealRender: true,
    };
    assert.deepEqual(validateModelAddFlow(entry, glb), { readyToEnable: true, missingSteps: [], issues: [] });
  });
});

describe("registry service: a new GLB model is added with zero code changes", () => {
  const exportSettings = exportSettingsFromPack(loadEtsyPack());

  function makeRegistry() {
    const storage = new InMemoryObjectStorage();
    const registry = new StudioRegistry({
      storage,
      seeds,
      inspectModelFile: async (key) => {
        const builtin = resolveBuiltinAssetPath(ROOT, key);
        if (builtin) return inspectGlb(new Uint8Array(readFileSync(builtin)));
        const stored = await storage.get(key);
        return stored ? inspectGlb(stored.data) : null;
      },
    });
    return { storage, registry };
  }

  it("upload, name the mesh, set presets, preview, enable, then use it in a shot and in batch export", async () => {
    const { storage, registry } = makeRegistry();
    // 1. Upload a GLB. Any valid GLB works: this one stands in for a file an admin brings.
    const data = glbBytes("tablet-generic-landscape.glb");
    const uploaded = await storage.put("models/abc123-new-tablet.glb", data, { contentType: "model/gltf-binary" });
    const glb = inspectGlb(data);

    // 2 to 4. Name the screen mesh, set presets, record the licence. Saved as a draft.
    const draft = await registry.createModel({
      ...laptop(),
      id: "vendor-tablet",
      slug: "vendor-tablet",
      name: "Vendor tablet",
      category: "tablet",
      tags: ["tablet"],
      modelFile: { storageKey: uploaded.key, bytes: uploaded.bytes, sha256: uploaded.sha256 },
      surfaces: [{ id: "screen", meshName: glb.meshNodeNames.find((n) => n === "screen"), kind: "screen", aspect: 0.228 / 0.171, pageSlot: 0, letterboxColour: "#101010" }],
      allowedOrientations: ["landscape"],
      cameraPresets: [{ id: "front", label: "Front", position: [0, 0.11, 0.62], target: [0, 0.095, 0], fovDeg: 26 }],
      defaultCameraPresetId: "front",
      colourOptions: [{ id: "silver", label: "Silver", materialName: "body", colour: "#C9CCD1" }],
      defaultColourOptionId: "silver",
      licence: { source: "Example Models Ltd", licenceType: "Commercial, perpetual", licenceDate: "2026-11-16", licenceStorageLocation: "licences/example-models-2026-11-16.pdf", creator: "Example Models Ltd", notes: "Test record." },
      unbrandedConfirmed: true,
      previewedWithRealRender: false,
    }, ctx);
    assert.equal(draft.status, "draft");
    assert.equal(draft.version, 1);

    // Not usable yet, and not in the studio catalog.
    assert.equal((await registry.catalog(true)).models.some((m) => m.id === "vendor-tablet"), false);
    await assert.rejects(() => registry.publishModel("vendor-tablet", "Enable.", ctx), /preview the model with a real product render/);

    // 4. Preview with a real render, then 5. enable.
    await registry.editModel("vendor-tablet", { previewedWithRealRender: true }, "Previewed with a real product render.", ctx);
    const live = await registry.publishModel("vendor-tablet", "Enabled after preview.", ctx);
    assert.equal(live.status, "published");
    assert.equal(live.version, 3);

    // It is now in the catalog, with preview items switched off.
    const strict = await registry.catalog(false);
    assert.deepEqual(strict.models.map((m) => m.id), ["vendor-tablet"]);

    // A shot and a style kit that use it are plain records too.
    const shot = await registry.saveShot({
      ...clone(seeds.shots.find((s) => s.id === "tablet-view")),
      id: "vendor-tablet-shot",
      slug: "vendor-tablet-shot",
      name: "Vendor tablet shot",
      models: [{ modelId: "vendor-tablet", position: [0, 0, 0], rotationDeg: [-10, 0, 0], scale: 1, colourOptionId: "silver", surfacePages: {} }],
      status: "published",
    });
    const kit = { ...clone(seeds.kits[0]), isPlaceholder: false, placeholderNote: "", status: "published", shots: [{ shotId: shot.id, background: null, showHeadline: false, showBullets: false, showBadge: false }] };
    const catalog = await registry.catalog(false);
    const plan = planBatch({ kit, shots: catalog.shots, models: catalog.models, lighting: catalog.lighting, exportSettings, designPages: [{ id: "p1", widthPx: 3200, heightPx: 2400 }], targets: config.batch, allowPreviewItems: false });
    assert.equal(plan.canExport, true);
    assert.equal(plan.proofMode, false);
    assert.equal(plan.items.length, 1);
    assert.equal(plan.items[0].fileName, "01-vendor-tablet-shot.jpg");
    assert.equal(plan.items[0].surfaces[0].modelId, "vendor-tablet");
    assert.equal(plan.items[0].surfaces[0].modelVersion, 3);
  });

  it("a model cannot go live with a mesh name the file does not hold", async () => {
    const { storage, registry } = makeRegistry();
    const uploaded = await storage.put("models/abc-phone.glb", glbBytes("phone-generic.glb"), { contentType: "model/gltf-binary" });
    await registry.createModel({ ...laptop(), id: "wrong-mesh", slug: "wrong-mesh", name: "Wrong mesh", modelFile: { storageKey: uploaded.key, bytes: uploaded.bytes, sha256: uploaded.sha256 }, surfaces: [{ id: "screen", meshName: "glass", kind: "screen", aspect: 0.46, pageSlot: 0, letterboxColour: "#000000" }], colourOptions: [], defaultColourOptionId: null, previewedWithRealRender: true }, ctx);
    await assert.rejects(() => registry.publishModel("wrong-mesh", "Enable.", ctx), (error) => error instanceof RegistryValidationError && error.issues.some((i) => i.code === "mesh-not-in-glb"));
  });

  it("a model cannot go live without a licence record", async () => {
    const { registry } = makeRegistry();
    await registry.createModel({ ...laptop(), id: "no-licence", slug: "no-licence", name: "No licence", previewedWithRealRender: true, licence: { source: "", licenceType: "", licenceDate: "", licenceStorageLocation: "", creator: "", notes: "" } }, ctx);
    await assert.rejects(() => registry.publishModel("no-licence", "Enable.", ctx), /licence source, licence type, licence date, licence storage location/);
  });

  it("a draft cannot be saved with a premium label and no sign-off", async () => {
    const { registry } = makeRegistry();
    await assert.rejects(() => registry.createModel({ ...laptop(), id: "fake-premium", slug: "fake-premium", qualityLabel: "premium", premiumCriteria: allCriteria }, ctx), /no approved human visual review sign-off/);
  });

  it("duplicate, edit, hide and roll back all work through the service and keep history", async () => {
    const { registry } = makeRegistry();
    const copy = await registry.duplicateModel("phone-generic", "phone-copy", "Phone copy", ctx);
    assert.equal(copy.status, "draft");
    await registry.editModel("phone-copy", { name: "Phone copy, edited" }, "Renamed.", ctx);
    await registry.hideModel("phone-copy", "Not needed.", ctx);
    const rolled = await registry.rollbackModel("phone-copy", 1, "Bring the first draft back.", ctx);
    assert.equal(rolled.version, 4);
    assert.equal(rolled.name, "Phone copy");
    assert.deepEqual((await registry.models.history("phone-copy")).map((m) => [m.version, m.status]), [[1, "draft"], [2, "draft"], [3, "hidden"], [4, "preview"]]);
    await assert.rejects(() => registry.duplicateModel("phone-generic", "phone-copy", "", ctx), /already used/);
    // A built in record edited in admin gets version 2 in storage. The repository file is untouched.
    const edited = await registry.editModel("phone-generic", { tags: ["phone", "edited"] }, "Tag added.", ctx);
    assert.equal(edited.version, 2);
    assert.deepEqual((await registry.models.history("phone-generic")).map((m) => m.version), [1, 2]);
  });

  it("style kits are versioned and can be rolled back", async () => {
    const { registry } = makeRegistry();
    const v1 = seeds.kits[0];
    await registry.saveKit({ ...clone(v1), version: 2, previousVersion: 1, accentColour: "#AA3355", changeNote: "Accent changed." });
    const v3 = await registry.rollbackKit(v1.id, 1, "Accent was wrong.", ctx);
    assert.equal(v3.version, 3);
    assert.equal(v3.accentColour, v1.accentColour);
    await assert.rejects(() => registry.saveKit({ ...clone(v1), version: 4, previousVersion: 3, accentColour: "red", changeNote: "Bad." }), RegistryValidationError);
  });

  it("with preview items allowed, the built in models and shots are listed for proof renders only", async () => {
    const { registry } = makeRegistry();
    assert.deepEqual((await registry.catalog(false)).models, []);
    const catalog = await registry.catalog(true);
    assert.equal(catalog.models.length, 9);
    assert.equal(catalog.shots.length, 10);
    assert.ok(catalog.models.every((m) => m.renderer === "glb-3d"));
  });
});
