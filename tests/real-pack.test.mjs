// Real proof pack tests.
// The pack is built from the REAL Maid of Honor Planner renders in
// workspace/etsy-maid-of-honor/templates-redesigned/, never from the
// schematic sheet. This test runs the builder, then proves each output
// JPG is 3000x2000 RGB with a real sRGB ICC profile in its bytes, and
// that the manifest names the exact source file for every image and
// states that no frame is called premium.
// Skipped when the real render folder is absent: the pack cannot be
// built from nothing, and nothing is faked in its place.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readIccProfile, ICC_PROFILE_NAME } from "../packages/export/src/index.ts";

const testDir = new URL("./", import.meta.url).pathname;
const repoRoot = join(testDir, "..");
const realPackDir = join(testDir, "proof-output", "real-pack");
const sourceDir = join(repoRoot, "..", "etsy-maid-of-honor", "templates-redesigned");
const hasRealRenders = existsSync(sourceDir);

describe("real proof pack", { skip: !hasRealRenders }, () => {
  let manifest;
  it("builds from the real renders without error", () => {
    const build = spawnSync(
      "python3",
      [join(realPackDir, "build-real-pack.py")],
      { encoding: "utf8" },
    );
    assert.equal(build.status, 0, build.stderr);
    assert.match(build.stdout, /built 01-hero\.jpg/);
    manifest = JSON.parse(readFileSync(join(realPackDir, "manifest.json"), "utf8"));
    assert.equal(manifest.images.length, 4);
  });

  it("every image is 3000x2000 RGB with an sRGB ICC profile in its bytes", () => {
    for (const image of manifest.images) {
      const bytes = readFileSync(join(realPackDir, image.file_name));
      assert.equal(image.output_size_px[0], 3000);
      assert.equal(image.output_size_px[1], 2000);
      assert.equal(image.output_mode, "RGB");
      assert.equal(image.icc_profile, ICC_PROFILE_NAME);
      assert.ok(bytes.includes(Buffer.from("ICC_PROFILE\0", "ascii")));
      const icc = readIccProfile(bytes);
      assert.equal(icc.present, true, `${image.file_name}: ${icc.detail}`);
      assert.equal(icc.profileDescription, ICC_PROFILE_NAME);
      assert.ok(
        image.mean_abs_pixel_diff_vs_source < 5,
        `${image.file_name} differs from its source by ${image.mean_abs_pixel_diff_vs_source}, more than a re-save should`,
      );
      assert.equal(image.placement.crop, "none");
      assert.equal(image.placement.stretch, "none");
      assert.equal(image.placement.colour_change, "none");
    }
  });

  it("the manifest names the exact source file for every image", () => {
    const text = readFileSync(join(realPackDir, "MANIFEST.md"), "utf8");
    for (const image of manifest.images) {
      assert.ok(existsSync(image.source_path), `source missing: ${image.source_path}`);
      assert.ok(text.includes(image.source_file), `MANIFEST.md does not name ${image.source_file}`);
      assert.ok(text.includes(image.source_sha256), `MANIFEST.md does not record the sha256 for ${image.source_file}`);
      assert.ok(text.includes(image.template_id), `MANIFEST.md does not name template ${image.template_id}`);
      assert.ok(text.includes(image.mockup_shown), `MANIFEST.md does not name the mockup for ${image.file_name}`);
    }
    assert.match(text, /USD 13\.97 list, USD 9\.78 launch/);
    assert.match(text, /12 tabs, Google Sheets format/);
  });

  it("no frame is called premium, and the review Saeed must do is stated", () => {
    const text = readFileSync(join(realPackDir, "MANIFEST.md"), "utf8");
    assert.match(text, /No frame in this pack is called premium/);
    assert.match(text, /No frame is called premium until Saeed approves it in plain words/);
    for (const word of ["Perspective", "Shadows", "Depth", "Scene"]) {
      assert.ok(text.includes(word), `MANIFEST.md does not tell Saeed to check ${word}`);
    }
    // The one known defect is recorded, not hidden.
    assert.match(text, /tablet screen is blank white in the source file/);
  });

  it("left out templates are named with reasons, none faked", () => {
    const text = readFileSync(join(realPackDir, "MANIFEST.md"), "utf8");
    assert.equal(manifest.templates_left_out.length, 7);
    for (const left of manifest.templates_left_out) {
      assert.ok(text.includes(left.template_id));
      assert.ok(left.reason.length > 20);
    }
    assert.ok(manifest.templates_left_out.some((l) => l.template_id === "mobile-view"));
    assert.ok(manifest.templates_left_out.some((l) => l.template_id === "how-it-works"));
  });
});
