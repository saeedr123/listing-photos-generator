// Visual regression and browser checks for the 3D mockup studio.
//
// This script drives a real browser. It is not part of npm test or
// tests/run-tests.sh, because it needs a running web app and a browser
// with WebGL. Run it by hand, in the reference browser named in
// config/studio.json, before a release:
//
//   1. Start the web app on a THROWAWAY database (this script signs up
//      test accounts) and a throwaway storage directory:
//        DATABASE_URL=... OBJECT_STORAGE_LOCAL_DIR="$(mktemp -d)" \
//        LPG_SEED_ADMIN_EMAIL=admin@example.test LPG_SEED_ADMIN_PASSWORD='choose-a-test-password' \
//        npm run dev -w apps/web -- -p 3100
//   2. Compare every shot with its stored reference render:
//        node tests/visual/studio-visual.cjs
//      Store new reference renders after a reviewed, intended change:
//        node tests/visual/studio-visual.cjs --update
//      Also run the export and admin flows in the browser:
//        node tests/visual/studio-visual.cjs --e2e
//
// Options: --base-url=http://localhost:3100  --shots=hero,phone-view
//          --admin-email=...  --admin-password=...  (for --e2e)
//
// What it checks, per shot:
// - Framing: same pixel size, same camera, same screen bounds.
// - Pixels: diff against the stored reference under the threshold in
//   config/studio.json. Reference renders are stored reduced by the
//   configured factor, so the repository stays small.
// - Repeat: the same shot rendered twice in one session matches itself.
// Any difference must be reviewed by a human before release. This
// script reports. It does not decide that a difference is acceptable.

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..", "..");
const REFERENCE_DIR = path.join(__dirname, "reference");
const OUTPUT_DIR = path.join(__dirname, "output");
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : fallback;
};
const BASE_URL = option("base-url", "http://localhost:3100");
const UPDATE = flag("update");
const E2E = flag("e2e");
const ONLY = option("shots", "");
const DESIGNS = [1, 2, 3].map((n) => path.join(ROOT, "tests", "fixtures", "designs", `test-chart-a4-page-${n}.png`));

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  ${detail}` : ""}`);
}

// The studio needs a signed in seller. Each run signs up a fresh test
// account, with its own X-Forwarded-For address so the per address sign
// up limit does not trip across runs. Use a throwaway database.
async function signedInSeller(browser) {
  const forwarded = "10.7." + Math.floor(Math.random() * 250) + "." + Math.floor(Math.random() * 250);
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 }, extraHTTPHeaders: { "x-forwarded-for": forwarded } });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/auth/register?next=%2Fdashboard`, { waitUntil: "networkidle", timeout: 180000 });
  await page.fill('input[type="email"]', `studio-visual-${Date.now()}@example.test`);
  await page.fill('input[type="password"]', "Studio-Visual-Pass-2026");
  await Promise.all([page.waitForURL((url) => url.pathname === "/dashboard", { timeout: 60000 }), page.click('button[type="submit"]')]);
  return page;
}

async function openStudio(browser) {
  const page = await signedInSeller(browser);
  page.on("pageerror", (error) => console.log(`page error: ${error.message}`));
  await page.goto(`${BASE_URL}/studio?harness=1`, { waitUntil: "networkidle", timeout: 180000 });
  await page.waitForSelector('[data-testid="design-input"]', { timeout: 180000 });
  await page.setInputFiles('[data-testid="design-input"]', DESIGNS);
  await page.waitForFunction(() => window.__lpgStudio && window.__lpgStudio.pageCount === 3 && window.__lpgStudio.plan && window.__lpgStudio.plan.items.length > 0, null, { timeout: 60000 });
  return page;
}

async function visual(browser) {
  const page = await openStudio(browser);
  const plan = await page.evaluate(() => ({ shots: window.__lpgStudio.plan.items.map((i) => i.shotId), skipped: window.__lpgStudio.plan.skipped, errors: window.__lpgStudio.plan.errors }));
  record("the plan builds from the 3 test chart pages", plan.errors.length === 0 && plan.skipped.length === 0, `${plan.shots.length} shots`);
  const shots = ONLY ? plan.shots.filter((id) => ONLY.split(",").includes(id)) : plan.shots;
  fs.mkdirSync(REFERENCE_DIR, { recursive: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const shotId of shots) {
    const pngPath = path.join(REFERENCE_DIR, `${shotId}.png`);
    const jsonPath = path.join(REFERENCE_DIR, `${shotId}.json`);
    if (UPDATE) {
      const reference = await page.evaluate((id) => window.__lpgStudio.referenceRender(id), shotId);
      fs.writeFileSync(pngPath, Buffer.from(reference.pngBase64, "base64"));
      const { pngBase64, ...meta } = reference;
      fs.writeFileSync(jsonPath, JSON.stringify({ shotId, ...meta }, null, 2) + "\n");
      record(`${shotId}: reference stored`, true, `${reference.fullWidthPx}x${reference.fullHeightPx} full, stored at ${reference.referenceWidthPx}x${reference.referenceHeightPx}`);
      // Repeat check: render again and compare with what was just stored.
      const again = await page.evaluate(([id, png, framing]) => window.__lpgStudio.compareReference(id, png, framing), [shotId, reference.pngBase64, reference.framing]);
      record(`${shotId}: a second render matches the first`, again.pixelDiff.withinThreshold && again.framing.same, again.pixelDiff.message);
      continue;
    }
    if (!fs.existsSync(pngPath) || !fs.existsSync(jsonPath)) {
      record(`${shotId}: reference render exists`, false, "No stored reference. Run with --update after a human review.");
      continue;
    }
    const stored = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    const comparison = await page.evaluate(([id, png, framing]) => window.__lpgStudio.compareReference(id, png, framing), [shotId, fs.readFileSync(pngPath).toString("base64"), stored.framing]);
    record(`${shotId}: framing matches the reference`, comparison.framing.same, comparison.framing.differences.join(" "));
    record(`${shotId}: output size matches the reference`, comparison.candidate.fullWidthPx === stored.fullWidthPx && comparison.candidate.fullHeightPx === stored.fullHeightPx, `${comparison.candidate.fullWidthPx}x${comparison.candidate.fullHeightPx}`);
    record(`${shotId}: pixels within the threshold`, comparison.pixelDiff.withinThreshold, comparison.pixelDiff.message);
    if (!comparison.pixelDiff.withinThreshold || !comparison.framing.same) {
      const out = path.join(OUTPUT_DIR, `${shotId}.candidate.png`);
      fs.writeFileSync(out, Buffer.from(comparison.candidate.pngBase64, "base64"));
      console.log(`      candidate written to ${out} for human review`);
    }
    if (comparison.candidate.renderer.glRenderer !== stored.renderer.glRenderer) {
      console.log(`      note: this browser reports ${comparison.candidate.renderer.glRenderer}, the reference was made on ${stored.renderer.glRenderer}`);
    }
  }
  await page.close();
}

async function exportFlow(browser) {
  const { readIccProfile } = await import(path.join(ROOT, "packages", "export", "src", "icc.ts"));
  const page = await openStudio(browser);
  // Design colours toggle and the shot grid.
  const colours = await page.locator('[data-testid="design-colours"]').innerText();
  record("colours are extracted from the design", /#[0-9A-F]{6}/.test(colours), colours.replace(/\s+/g, " ").slice(0, 90));
  await page.click('[data-testid="grid-button"]');
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="shot-grid"] img').length === 10, null, { timeout: 300000 });
  record("the grid previews the design in every shot", true, "10 previews");
  record("the live viewport shows a WebGL canvas", (await page.locator('[data-testid="shot-viewport"] canvas').count()) >= 3);

  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 900000 }), page.click('[data-testid="export-button"]')]);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const zipPath = path.join(OUTPUT_DIR, download.suggestedFilename());
  await download.saveAs(zipPath);
  record("the zip name marks a proof set", /-proof\.zip$/.test(download.suggestedFilename()), download.suggestedFilename());

  const extractDir = path.join(OUTPUT_DIR, "export-check");
  fs.rmSync(extractDir, { recursive: true, force: true });
  fs.mkdirSync(extractDir, { recursive: true });
  const unzip = spawnSync("python3", ["-c", "import zipfile, sys, json; z = zipfile.ZipFile(sys.argv[1]); bad = z.testzip(); z.extractall(sys.argv[2]); print(json.dumps({'bad': bad, 'names': z.namelist()}))", zipPath, extractDir], { encoding: "utf8" });
  const listing = JSON.parse(unzip.stdout || "{}");
  const expected = ["01-hero.jpg", "02-angled-hero.jpg", "03-laptop-plus-phone.jpg", "04-phone-view.jpg", "05-tablet-view.jpg", "06-printed-sheet.jpg", "07-clipboard-sheet.jpg", "08-fanned-pages.jpg", "09-what-is-inside.jpg", "10-formats-and-sizes.jpg", "manifest.json"];
  record("the zip holds the ordered set and a manifest", listing.bad === null && JSON.stringify(listing.names) === JSON.stringify(expected), (listing.names || []).join(", "));
  const manifest = JSON.parse(fs.readFileSync(path.join(extractDir, "manifest.json"), "utf8"));
  record("the manifest marks the set as a proof, not publishable", manifest.proofMode === true && manifest.publishable === false && manifest.autoPublish === false);
  for (const name of expected.filter((n) => n.endsWith(".jpg"))) {
    const bytes = fs.readFileSync(path.join(extractDir, name));
    const icc = readIccProfile(bytes);
    const size = spawnSync("python3", ["-c", "from PIL import Image; import sys; i = Image.open(sys.argv[1]); print(i.format, i.mode, i.size[0], i.size[1])", path.join(extractDir, name)], { encoding: "utf8" }).stdout.trim();
    const [format, mode, width, height] = size.split(" ");
    record(`${name}: JPG, sRGB profile embedded, 2000 px or more on the shortest side`, format === "JPEG" && mode === "RGB" && Math.min(Number(width), Number(height)) >= 2000 && icc.present, `${size}, ${icc.profileDescription}, ${bytes.length} bytes`);
  }
  await page.close();
}

async function adminFlow(browser) {
  const email = option("admin-email", process.env.LPG_SEED_ADMIN_EMAIL || "");
  const password = option("admin-password", process.env.LPG_SEED_ADMIN_PASSWORD || "");
  if (!email || !password) {
    record("admin flow", false, "Pass --admin-email and --admin-password, the seed admin the server was started with.");
    return;
  }
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => console.log(`page error: ${error.message}`));
  page.on("dialog", (dialog) => dialog.accept("Checked by the browser test."));

  const anonymous = await page.request.get(`${BASE_URL}/api/admin/studio/models`);
  record("the admin API refuses a signed out caller", anonymous.status() === 401);
  for (const path of ["/api/studio/catalog", "/api/studio/asset?key=builtin/models/laptop-generic.glb"]) {
    const response = await page.request.get(`${BASE_URL}${path}`);
    record(`${path.split("?")[0]} refuses a signed out caller`, response.status() === 401, `status ${response.status()}`);
  }
  const gate = await page.request.post(`${BASE_URL}/api/studio/gate`, { multipart: { meta: "{}" } });
  record("/api/studio/gate refuses a signed out caller", gate.status() === 401, `status ${gate.status()}`);
  await page.goto(`${BASE_URL}/studio`, { waitUntil: "networkidle", timeout: 180000 });
  record("the studio page asks a visitor to sign in", /to use the studio/.test(await page.locator("main").innerText()));

  await page.goto(`${BASE_URL}/auth/login?next=%2Fadmin%2Fmodels`, { waitUntil: "networkidle", timeout: 180000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await Promise.all([page.waitForURL(/\/admin/, { timeout: 60000 }), page.click('button[type="submit"]')]);
  await page.goto(`${BASE_URL}/admin/models`, { waitUntil: "networkidle", timeout: 180000 });
  await page.waitForSelector('[data-testid="add-model"]', { timeout: 120000 });
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="model-rows"] li').length >= 14, null, { timeout: 60000 });
  record("the registry lists the 3D models and the 5 2D fallbacks", true, `${await page.locator('[data-testid="model-rows"] > li').count()} rows`);

  // Add a model: upload a GLB, name the screen mesh, set presets, preview, enable.
  const id = `e2e-phone-${Date.now().toString(36)}`;
  await page.click('[data-testid="add-model"]');
  await page.setInputFiles('[data-testid="glb-input"]', path.join(ROOT, "packages", "mockup-engine", "assets", "models", "phone-generic.glb"));
  await page.waitForFunction(() => /Meshes found: bezel, body, screen/.test(document.querySelector('[data-testid="admin-message"]')?.textContent || ""), null, { timeout: 60000 });
  record("upload lists the meshes found in the GLB", true);
  await page.fill('[data-testid="model-id"]', id);
  await page.fill('[data-testid="model-name"]', "Browser test phone");
  await page.click('[data-testid="add-surface"]');
  await page.selectOption('[data-testid="surface-mesh"]', "screen");
  // A wrong aspect first: the preview must warn that the design would be stretched.
  await page.fill('[data-testid="surface-aspect"]', "1.6");
  await page.waitForFunction(() => [...document.querySelectorAll('[data-testid="preview-warning"]')].some((n) => /would be stretched/.test(n.textContent || "")), null, { timeout: 60000 });
  record("a wrong screen aspect is caught in the preview", true);
  await page.fill('[data-testid="surface-aspect"]', String(0.066 / 0.143));
  await page.waitForFunction(() => ![...document.querySelectorAll('[data-testid="preview-warning"]')].some((n) => /would be stretched/.test(n.textContent || "")), null, { timeout: 60000 });
  await page.check('[data-testid="orientation-portrait"]');
  await page.click('[data-testid="save-preset"]');
  for (const [field, value] of [["source", "Browser test vendor"], ["licenceType", "Test licence"], ["licenceDate", "2026-11-16"], ["licenceStorageLocation", "licences/browser-test.pdf"], ["creator", "Browser test"], ["notes", "Test record made by tests/visual/studio-visual.cjs."]]) {
    await page.fill(`[data-testid="licence-${field}"]`, value);
  }
  await page.check('[data-testid="unbranded-checkbox"]');
  await page.click('[data-testid="save-model"]');
  await page.waitForFunction(() => /Draft saved as version 1/.test(document.querySelector('[data-testid="admin-message"]')?.textContent || ""), null, { timeout: 60000 });
  record("the draft is saved as version 1", true);

  // Enabling before the preview step must be refused.
  await page.click('[data-testid="enable-model"]');
  await page.waitForFunction(() => /preview the model with a real product render/.test(document.querySelector('[data-testid="admin-message"]')?.textContent || ""), null, { timeout: 60000 });
  record("enable is refused before the preview step", true);

  await page.setInputFiles('[data-testid="preview-input"]', DESIGNS[0]);
  await page.check('[data-testid="previewed-checkbox"]');
  await page.fill('[data-testid="change-note"]', "Previewed in the browser test.");
  await page.click('[data-testid="save-model"]');
  await page.waitForFunction(() => /Saved as a new version/.test(document.querySelector('[data-testid="admin-message"]')?.textContent || ""), null, { timeout: 60000 });
  await page.fill('[data-testid="change-note"]', "Enabled by the browser test.");
  await page.click('[data-testid="enable-model"]');
  await page.waitForFunction(() => /Enabled\. The model can now be used/.test(document.querySelector('[data-testid="admin-message"]')?.textContent || ""), null, { timeout: 60000 });
  await page.waitForFunction((modelId) => document.querySelector(`[data-model-id="${modelId}"] [data-testid="row-status"]`)?.textContent === "published", id, { timeout: 30000 }).catch(() => {});
  const status = await page.locator(`[data-model-id="${id}"] [data-testid="row-status"]`).innerText();
  record("the model is enabled through admin, with no code change", status === "published", `status ${status}`);

  // Thumbnail from the preview, saved with the model.
  await page.click('[data-testid="capture-thumbnail"]');
  await page.waitForFunction(() => /Thumbnail captured/.test(document.querySelector('[data-testid="admin-message"]')?.textContent || ""), null, { timeout: 120000 });
  await page.fill('[data-testid="change-note"]', "Thumbnail added by the browser test.");
  await page.click('[data-testid="save-model"]');
  await page.waitForFunction(() => /Saved as a new version/.test(document.querySelector('[data-testid="admin-message"]')?.textContent || ""), null, { timeout: 60000 });
  await page.waitForSelector(`[data-model-id="${id}"] [data-testid="row-thumbnail"]`, { timeout: 60000 });
  const thumbOk = await page.evaluate((modelId) => { const img = document.querySelector(`[data-model-id="${modelId}"] [data-testid="row-thumbnail"]`); return Boolean(img && img.complete && img.naturalWidth === 600 && img.naturalHeight === 400); }, id);
  record("a preview thumbnail is captured, stored and shown", thumbOk);
  // Saving a published model makes a preview version; enable it again.
  await page.fill('[data-testid="change-note"]', "Enabled again after the thumbnail.");
  await page.click('[data-testid="enable-model"]');
  await page.waitForFunction(() => /Enabled\. The model can now be used/.test(document.querySelector('[data-testid="admin-message"]')?.textContent || ""), null, { timeout: 60000 });

  // Human review: not every criterion met keeps the model basic.
  for (const key of ["realisticPerspective", "softRealisticShadows", "screenCrispAtExportSize"]) await page.check(`[data-testid="criterion-${key}"]`);
  await page.fill('[data-testid="review-approver"]', "Test owner");
  await page.fill('[data-testid="review-note"]', "Browser test review. Not a real review.");
  await page.click('[data-testid="record-review"]');
  await page.waitForFunction(() => /Review recorded/.test(document.querySelector('[data-testid="admin-message"]')?.textContent || ""), null, { timeout: 60000 });
  record("a review with criteria not met keeps the model basic", (await page.locator('[data-testid="quality-label"]').innerText()) === "basic");
  // Every criterion met and approved: premium.
  for (const key of ["depth", "lifestyleOrDeskScene", "realisticMaterialsAndEdges"]) await page.check(`[data-testid="criterion-${key}"]`);
  await page.click('[data-testid="record-review"]');
  await page.waitForFunction(() => document.querySelector('[data-testid="quality-label"]')?.textContent === "premium", null, { timeout: 60000 });
  record("an approved review with every criterion met labels the model premium", true);

  const catalog = await (await page.request.get(`${BASE_URL}/api/studio/catalog`)).json();
  const inCatalog = catalog.catalog.models.find((m) => m.id === id);
  record("the new model is in the studio catalog, ready for shots and batch export", Boolean(inCatalog) && inCatalog.status === "published" && inCatalog.modelFile.storageKey.startsWith("models/"), inCatalog ? inCatalog.modelFile.storageKey : "missing");
  const file = await page.request.get(`${BASE_URL}/api/studio/asset?key=${encodeURIComponent(inCatalog ? inCatalog.modelFile.storageKey : "models/none.glb")}`);
  record("the uploaded GLB is served from object storage", file.status() === 200 && (await file.body()).length === 146520);

  // Hide it again, so a shared development storage is left tidy.
  await page.locator(`[data-model-id="${id}"] button`, { hasText: "Hide" }).click();
  await page.waitForFunction(() => /^Hidden\./.test(document.querySelector('[data-testid="admin-message"]')?.textContent || ""), null, { timeout: 60000 });
  const after = await (await page.request.get(`${BASE_URL}/api/studio/catalog`)).json();
  record("a hidden model leaves the studio catalog", !after.catalog.models.some((m) => m.id === id));

  // Style kits screen loads and shows the placeholder note.
  await page.goto(`${BASE_URL}/admin/style-kits`, { waitUntil: "networkidle", timeout: 180000 });
  await page.waitForSelector('[data-testid="edit-kit"]', { timeout: 120000 });
  record("the style kit screen shows the draft kit as placeholder values", /placeholder values/.test(await page.locator("main").innerText()));

  // Edit the kit: a bad colour is refused, a good edit is a new version.
  await page.click('[data-testid="edit-kit"]');
  const kitText = await page.locator('[data-testid="kit-json"]').inputValue();
  const kit = JSON.parse(kitText);
  await page.fill('[data-testid="kit-json"]', JSON.stringify({ ...kit, accentColour: "not-a-colour" }, null, 2));
  await page.fill('[data-testid="kit-change-note"]', "Browser test: bad colour.");
  await page.click('[data-testid="save-kit"]');
  await page.waitForFunction(() => /accentColour must be a hex colour/.test(document.querySelector('[data-testid="kit-message"]')?.textContent || ""), null, { timeout: 30000 });
  record("a style kit with a bad colour is refused", true);
  await page.fill('[data-testid="kit-json"]', JSON.stringify({ ...kit, accentColour: "#2F5D62" }, null, 2));
  await page.fill('[data-testid="kit-change-note"]', "Browser test: accent colour changed.");
  await page.click('[data-testid="save-kit"]');
  await page.waitForFunction(() => /Saved as a new version/.test(document.querySelector('[data-testid="kit-message"]')?.textContent || ""), null, { timeout: 30000 });
  const kits = await (await page.request.get(`${BASE_URL}/api/admin/studio/kits`)).json();
  const saved = kits.rows.find((row) => row.kit.id === kit.id);
  record("a style kit edit is stored as the next version", saved.kit.version === kit.version + 1 && saved.kit.accentColour === "#2F5D62" && saved.versions.length === kit.version + 1, `version ${saved.kit.version}`);
  const rolled = await (await page.request.post(`${BASE_URL}/api/admin/studio/kits`, { data: { action: "rollback", id: kit.id, toVersion: kit.version, changeNote: "Browser test: restore." } })).json();
  record("a style kit can be rolled back, as a new version", rolled.ok === true && rolled.kit.version === kit.version + 2 && rolled.kit.accentColour === kit.accentColour, `version ${rolled.kit && rolled.kit.version}`);
  await context.close();
}

(async () => {
  const browser = await chromium.launch();
  try {
    const version = browser.version();
    console.log(`Browser: Chromium ${version}. Base URL: ${BASE_URL}. Mode: ${UPDATE ? "update references" : "compare"}${E2E ? " plus e2e" : ""}.`);
    await visual(browser);
    if (E2E) {
      await exportFlow(browser);
      await adminFlow(browser);
    }
  } finally {
    await browser.close();
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed.`);
  if (failed.length > 0) {
    console.log("A failed visual check is a reason for a human review, not for an automatic update of the reference.");
    process.exit(1);
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
