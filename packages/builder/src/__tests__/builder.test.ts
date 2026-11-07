// Builder tests. Run with: node --test "src/__tests__/*.test.ts"
// Uses only Node built-ins and the package itself. No live provider, no secrets.

import test from "node:test";
import assert from "node:assert/strict";
import { validateUpload } from "../upload-validation.ts";
import { reconcilePack } from "../reconciliation.ts";
import { maidOfHonorFacts } from "../test-product.ts";
import { sampleCopy } from "../sample-content.ts";
import type { DisplayedValues } from "../reconciliation.ts";

function pdfBytes(): Uint8Array {
  return new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
}

function pngBytes(): Uint8Array {
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

function zipBytes(): Uint8Array {
  return new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
}

function matchingDisplayed(): DisplayedValues {
  return {
    tabCount: 12,
    priceListMinor: 1397,
    priceLaunchMinor: 978,
    currency: "USD",
    formatText: "Google Sheets",
    claims: [],
    copyText: "Maid of Honor Planner, 12 tabs, Google Sheets, USD 13.97",
  };
}

test("upload accepts a real PDF and a real PNG", () => {
  assert.equal(validateUpload({ fileName: "planner.pdf", sizeBytes: 1024, mimeType: "application/pdf", magicBytes: pdfBytes() }).ok, true);
  assert.equal(validateUpload({ fileName: "preview.png", sizeBytes: 2048, mimeType: "image/png", magicBytes: pngBytes() }).ok, true);
});

test("upload rejects xlsx by extension and by zip magic bytes", () => {
  const byExtension = validateUpload({ fileName: "sheet.xlsx", sizeBytes: 1024, mimeType: "application/pdf", magicBytes: pdfBytes() });
  assert.equal(byExtension.ok, false);
  assert.match(byExtension.errors.join(" "), /not accepted/);
  const byContent = validateUpload({ fileName: "sheet.pdf", sizeBytes: 1024, mimeType: "application/pdf", magicBytes: zipBytes() });
  assert.equal(byContent.ok, false);
  assert.match(byContent.errors.join(" "), /compressed or spreadsheet/);
});

test("upload rejects a mismatched extension and an empty file", () => {
  const mismatch = validateUpload({ fileName: "photo.jpg", sizeBytes: 1024, mimeType: "image/jpeg", magicBytes: pngBytes() });
  assert.equal(mismatch.ok, false);
  const empty = validateUpload({ fileName: "planner.pdf", sizeBytes: 0, mimeType: "application/pdf", magicBytes: pdfBytes() });
  assert.equal(empty.ok, false);
  assert.match(empty.errors.join(" "), /empty/);
});

test("upload rejects an oversized file without leaking system details", () => {
  const result = validateUpload({ fileName: "big.pdf", sizeBytes: 21 * 1024 * 1024, mimeType: "application/pdf", magicBytes: pdfBytes() });
  assert.equal(result.ok, false);
  assert.ok(result.errors.every((e) => !e.includes("/tmp") && !e.includes("Error")));
});

test("reconciliation passes when the pack matches the real product", () => {
  const result = reconcilePack(maidOfHonorFacts, matchingDisplayed(), false);
  assert.equal(result.status, "pass");
  assert.equal(result.canExport, true);
  assert.ok(result.items.every((i) => i.result === "match"));
});

test("reconciliation blocks export on a tab count mismatch and shows the fix", () => {
  const displayed = matchingDisplayed();
  displayed.tabCount = 20;
  displayed.copyText = "Maid of Honor Planner, 20 tabs, Google Sheets";
  const result = reconcilePack(maidOfHonorFacts, displayed, false);
  assert.equal(result.status, "blocked");
  assert.equal(result.canExport, false);
  const item = result.items.find((i) => i.factKey === "tab_count");
  assert.equal(item?.result, "mismatch");
  assert.match(item?.fix ?? "", /12 tabs/);
  assert.match(result.summary, /blocked/);
});

test("reconciliation blocks export on an Excel claim for a Sheets product", () => {
  const displayed = matchingDisplayed();
  displayed.formatText = "Excel";
  displayed.copyText = "Maid of Honor Planner, 12 tabs, Excel spreadsheet, .xlsx file";
  const result = reconcilePack(maidOfHonorFacts, displayed, false);
  assert.equal(result.canExport, false);
  const item = result.items.find((i) => i.factKey === "format");
  assert.equal(item?.result, "mismatch");
  assert.match(item?.fix ?? "", /Google Sheets/);
});

test("reconciliation blocks export on an unverified claim", () => {
  const displayed = matchingDisplayed();
  displayed.claims = ["Works on any device"];
  const result = reconcilePack(maidOfHonorFacts, displayed, false);
  assert.equal(result.canExport, false);
  const item = result.items.find((i) => i.factKey === "claim");
  assert.equal(item?.result, "mismatch");
});

test("reconciliation blocks export while sample content is present", () => {
  const copy = sampleCopy();
  assert.match(copy.title, /Sample content/);
  const result = reconcilePack(maidOfHonorFacts, matchingDisplayed(), true);
  assert.equal(result.canExport, false);
  const item = result.items.find((i) => i.factKey === "sample_content");
  assert.equal(item?.result, "mismatch");
});

test("reconciliation does not block when the pack states no price", () => {
  const displayed = matchingDisplayed();
  displayed.priceListMinor = null;
  displayed.currency = null;
  displayed.copyText = "Maid of Honor Planner, 12 tabs, Google Sheets";
  const result = reconcilePack(maidOfHonorFacts, displayed, false);
  assert.equal(result.canExport, true);
});
