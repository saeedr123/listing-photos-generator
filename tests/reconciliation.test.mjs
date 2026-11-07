// Reconciliation tests, per PROMPT.md section 5.
// Tab count, price, format, and claims must match the real product.
// No silent publish on a mismatch.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reconcile } from "../packages/export/src/index.ts";

const FIX = new URL("./fixtures/", import.meta.url).pathname;
const facts = JSON.parse(readFileSync(`${FIX}maid-of-honor-facts.json`, "utf8"));

const matchingListing = {
  tabCount: 12,
  priceList: { amount: 13.97, currency: "USD" },
  priceLaunch: { amount: 9.78, currency: "USD" },
  format: "Google Sheets",
  claims: ["Google Sheets only", "Instant download"],
};

describe("reconciliation", () => {
  it("passes when tab count, price, format, and claims all match", () => {
    const result = reconcile(facts, matchingListing);
    assert.equal(result.passed, true);
    assert.equal(result.blocked, false);
    assert.ok(result.items.every((i) => i.result === "match"));
  });

  it("tab count mismatch blocks export and names the fix", () => {
    const result = reconcile(facts, { ...matchingListing, tabCount: 20 });
    assert.equal(result.blocked, true);
    const item = result.items.find((i) => i.factKey === "tab_count");
    assert.equal(item.result, "mismatch");
    assert.equal(item.expected, "12");
    assert.equal(item.found, "20");
    assert.equal(item.action, "block_export");
    assert.match(item.fix, /12/);
  });

  it("price mismatch blocks export", () => {
    const result = reconcile(facts, {
      ...matchingListing,
      priceList: { amount: 19.99, currency: "USD" },
    });
    assert.equal(result.blocked, true);
    const item = result.items.find((i) => i.factKey === "price");
    assert.equal(item.result, "mismatch");
    assert.match(item.fix, /13.97/);
  });

  it("format mismatch blocks export: Sheets must never be called Excel", () => {
    const result = reconcile(facts, { ...matchingListing, format: "Excel" });
    assert.equal(result.blocked, true);
    const item = result.items.find((i) => i.factKey === "format");
    assert.equal(item.result, "mismatch");
    assert.match(item.fix, /Google Sheets/);
  });

  it("an unverified claim warns with a fix, it does not silently publish", () => {
    const result = reconcile(facts, {
      ...matchingListing,
      claims: ["Google Sheets only", "Works On Any Device"],
    });
    const item = result.items.find((i) => i.factKey === "claim" && i.found === "Works On Any Device");
    assert.equal(item.result, "mismatch");
    assert.equal(item.action, "warn");
    assert.match(item.fix, /Remove the claim/);
  });

  it("a missing tab count blocks export", () => {
    const result = reconcile(facts, { ...matchingListing, tabCount: null });
    assert.equal(result.blocked, true);
  });
});
