// The rate limit config must hold a valid rule for every limit the web
// app checks, or the action would throw at run time.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const config = JSON.parse(readFileSync(new URL("../config/rate-limits.json", import.meta.url), "utf8"));
const source = readFileSync(new URL("../apps/web/src/lib/rate-limits.ts", import.meta.url), "utf8");
const names = [...source.matchAll(/\|\s*"([a-z]+\.[a-z]+)"/g)].map((m) => m[1]);

describe("rate limit config", () => {
  it("lists every limit the app checks", () => {
    assert.ok(names.length >= 7, "names parsed from rate-limits.ts");
    for (const name of names) assert.ok(config.rules[name], `missing rule ${name}`);
  });

  it("every rule allows a positive number of attempts in a positive window", () => {
    for (const [name, rule] of Object.entries(config.rules)) {
      assert.ok(Number.isInteger(rule.maxAttempts) && rule.maxAttempts > 0, name);
      assert.ok(Number.isInteger(rule.windowSeconds) && rule.windowSeconds > 0, name);
    }
  });

  it("a studio export of the largest set fits inside one window", () => {
    const studio = JSON.parse(readFileSync(new URL("../config/studio.json", import.meta.url), "utf8"));
    assert.ok(config.rules["studio.gate"].maxAttempts >= studio.batch.targetMaxImages * 5, "at least five full sets per window");
  });
});
