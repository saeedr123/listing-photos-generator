// Browser test: a seller makes listing images for their own pack.
//
// Not part of npm test or CI: needs a running app (production build)
// on a THROWAWAY database, and a browser with WebGL. See
// tests/visual/seller-flow.cjs for how to start the app.
//
//   node tests/visual/pack-studio-flow.cjs [--base-url=http://localhost:3100]
//
// Covers: the free plan pack limit, opening the studio for a pack, the
// image text fact check (a wrong tab count is blocked, the right one
// passes), a full export recorded in the pack history, and the seller
// headline (not kit placeholder text) on the images.

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { chromium } = require("playwright");

const arg = process.argv.find((a) => a.startsWith("--base-url="));
const BASE = arg ? arg.slice("--base-url=".length) : "http://localhost:3100";
const ROOT = path.join(__dirname, "..", "..");
const OUT = path.join(__dirname, "output");
const DESIGNS = [1, 2, 3].map((n) => path.join(ROOT, "tests", "fixtures", "designs", `test-chart-a4-page-${n}.png`));
const results = [];
const record = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`);
};

(async () => {
  const browser = await chromium.launch();
  const forwarded = "10.6." + Math.floor(Math.random() * 250) + "." + Math.floor(Math.random() * 250);
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 }, extraHTTPHeaders: { "x-forwarded-for": forwarded }, acceptDownloads: true });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log("pageerror", e.message.slice(0, 200)));

  await page.goto(`${BASE}/auth/register?next=%2Fdashboard`);
  await page.fill('input[type="email"]', `pack-studio-${Date.now()}@example.test`);
  await page.fill('input[type="password"]', "Pack-Studio-Pass-2026");
  await Promise.all([page.waitForURL((u) => u.pathname === "/dashboard", { timeout: 60000 }), page.click('button[type="submit"]')]);

  // First pack, with the test product facts.
  await page.goto(`${BASE}/builder?new=1&name=Studio%20test%20planner`);
  await page.waitForURL(/\/builder\/[0-9a-f-]{36}$/, { timeout: 60000 });
  const packId = page.url().split("/").pop();
  await page.getByRole("button", { name: "Load the Maid of Honor test product facts" }).click();
  await page.waitForTimeout(3000);
  const tabCount = Number((await page.locator('input[type="number"]').first().inputValue()) || "12");

  // The free plan allows one pack.
  await page.goto(`${BASE}/builder?new=1`);
  await page.waitForFunction(() => /pack/i.test(document.body.innerText) && !/Starting your pack/.test(document.body.innerText), null, { timeout: 60000 });
  record("the free plan stops a second pack", /free|plan|Premium/i.test(await page.locator("body").innerText()) && !/\/builder\/[0-9a-f-]{36}$/.test(page.url()), (await page.locator("body").innerText()).split("\n").slice(-2).join(" ").slice(0, 120));

  // Open the studio for the pack.
  await page.goto(`${BASE}/builder/${packId}`);
  for (let i = 0; i < 5; i++) { await page.getByRole("button", { name: "Continue" }).click(); await page.waitForTimeout(200); }
  await page.getByRole("link", { name: "Make listing images in the Mockup Studio" }).click();
  await page.waitForURL((u) => u.pathname === "/studio" && u.searchParams.get("pack") === packId, { timeout: 60000 });
  await page.waitForSelector('[data-testid="pack-text"]', { timeout: 120000 });
  record("the studio opens for the pack", /Text on your images, for /.test(await page.locator('[data-testid="pack-text"]').innerText()));

  // A wrong tab count is blocked.
  await page.fill('[data-testid="studio-headline"]', `${tabCount + 8} tabs in Google Sheets`);
  await page.click('[data-testid="studio-text-save"]');
  await page.waitForSelector('[data-testid="studio-text-message"]', { timeout: 30000 });
  record("a wrong tab count in the image text is flagged", /do not match|tabs/.test(await page.locator('[data-testid="studio-text-message"]').innerText()));

  await page.setInputFiles('[data-testid="design-input"]', DESIGNS);
  await page.waitForSelector('[data-testid="export-button"]', { timeout: 120000 });
  await page.click('[data-testid="export-button"]');
  await page.waitForSelector('[data-testid="export-error"]', { timeout: 60000 });
  record("export is stopped by the fact check", /fact check/i.test(await page.locator('[data-testid="export-error"]').innerText()));

  // The right tab count passes, and the export is recorded.
  await page.fill('[data-testid="studio-headline"]', `${tabCount} tabs in Google Sheets`);
  await page.fill('[data-testid="studio-bullets"]', "Guest list\nBudget tracker");
  await page.click('[data-testid="studio-text-save"]');
  await page.waitForFunction(() => /matches the product facts/.test(document.querySelector('[data-testid="studio-text-message"]')?.textContent || ""), null, { timeout: 30000 });
  record("the right tab count passes the check", true);
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 900000 }), page.click('[data-testid="export-button"]')]);
  fs.mkdirSync(OUT, { recursive: true });
  const zipPath = path.join(OUT, "pack-" + download.suggestedFilename());
  await download.saveAs(zipPath);
  await page.waitForFunction(() => /Recorded in the pack export history/.test(document.querySelector('[data-testid="export-status"]')?.textContent || ""), null, { timeout: 60000 });
  record("the export is recorded in the pack history", true);

  // The seller headline is on the image, not the kit placeholder.
  const manifest = spawnSync("python3", ["-c", "import zipfile,sys,json; z=zipfile.ZipFile(sys.argv[1]); print(z.read('manifest.json').decode())", zipPath], { encoding: "utf8" });
  const parsed = JSON.parse(manifest.stdout);
  const headlines = parsed.images.map((image) => image.text.headline).filter(Boolean);
  record("images carry the seller headline, never placeholder text", headlines.length > 0 && headlines.every((h) => h === `${tabCount} tabs in Google Sheets`) && !JSON.stringify(parsed.images).includes("placeholder"), headlines[0] || "no headline");

  // Dashboard shows both studio exports (the blocked one and the ready one).
  await page.goto(`${BASE}/dashboard`);
  const dashboard = await page.locator("body").innerText();
  record("the dashboard lists the studio exports", (dashboard.match(/images_zip/g) || []).length >= 2, (dashboard.match(/images_zip[^\n]*/g) || []).join(" | ").slice(0, 160));

  await browser.close();
  console.log(`\n${results.filter(Boolean).length} passed, ${results.filter((r) => !r).length} failed.`);
  if (results.some((r) => !r)) process.exitCode = 1;
})().catch((e) => { console.error(e); process.exit(1); });
