// Export gate for rendered images, the JPG encoder with the embedded
// sRGB profile, and the zip writer. Every platform value is read from
// the platform pack passed in.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ExportError,
  ICC_PROFILE_NAME,
  buildZip,
  crc32,
  gateAndEncodeRenderedImage,
  loadEtsyPack,
  readIccProfile,
  runRenderedImageGate,
} from "../packages/export/src/index.ts";

const pack = loadEtsyPack();
const work = mkdtempSync(join(tmpdir(), "lpg-studio-export-"));
process.on("exit", () => rmSync(work, { recursive: true, force: true }));

function makePng(width, height, mode = "RGB", alpha = 255) {
  const path = join(work, `in-${width}x${height}-${mode}-${alpha}.png`);
  const script = `
from PIL import Image
import sys
w, h, mode, alpha, path = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3], int(sys.argv[4]), sys.argv[5]
img = Image.new("RGB", (w, h), (244, 241, 236))
px = img.load()
for x in range(0, w, 97):
    for y in range(0, h, 89):
        px[x, y] = (255, 0, 0)
img.paste((0, 0, 255), (w // 4, h // 4, w // 2, h // 2))
if mode == "RGBA":
    img = img.convert("RGBA")
    img.putalpha(alpha)
img.save(path, "PNG")
`;
  const made = spawnSync("python3", ["-c", script, String(width), String(height), mode, String(alpha), path], { encoding: "utf8" });
  assert.equal(made.status, 0, made.stderr);
  return new Uint8Array(readFileSync(path));
}

const goodSurface = { surfaceId: "laptop-generic/screen", designWidthPx: 2480, designHeightPx: 3508, placedWidthPx: 620, placedHeightPx: 877, stretched: false, cropped: false, aspectMismatch: null };
const input = (overrides = {}) => ({
  fileName: "01-hero.jpg",
  widthPx: 3000,
  heightPx: 2000,
  expectedWidthPx: 3000,
  expectedHeightPx: 2000,
  colourProfile: "sRGB",
  colourChanged: false,
  cropApproved: false,
  surfaces: [goodSurface],
  pack,
  ...overrides,
});
const blockReasons = (result) => result.checks.filter((c) => c.status === "block").map((c) => c.reason);

describe("rendered image gate", () => {
  it("passes a render at the pack export size with a crisp, unstretched design", () => {
    const result = runRenderedImageGate(input());
    assert.equal(result.blocked, false);
    assert.equal(result.status, "pass");
    assert.ok(result.checks.some((c) => /meets the etsy pack export size of 2000px/.test(c.reason)));
  });

  it("blocks a render below the pack export size", () => {
    const result = runRenderedImageGate(input({ widthPx: 2400, heightPx: 1600, expectedWidthPx: 2400, expectedHeightPx: 1600 }));
    assert.equal(result.blocked, true);
    assert.match(blockReasons(result)[0], /shortest side is 1600px, below the etsy pack export size of 2000px/);
  });

  it("reads the export size from the pack, not from the engine", () => {
    const smallerPack = { ...pack, platformId: "other", export: { ...pack.export, shortestSidePx: 1500 } };
    const result = runRenderedImageGate(input({ widthPx: 2400, heightPx: 1600, expectedWidthPx: 2400, expectedHeightPx: 1600, pack: smallerPack }));
    assert.equal(result.blocked, false);
    const largerPack = { ...pack, export: { ...pack.export, shortestSidePx: 2500 } };
    assert.equal(runRenderedImageGate(input({ pack: largerPack })).blocked, true);
  });

  it("blocks a render that is not the planned size", () => {
    const result = runRenderedImageGate(input({ widthPx: 3200, heightPx: 2000 }));
    assert.ok(blockReasons(result).some((r) => /the plan asked for 3000x2000px/.test(r)));
  });

  it("blocks a colour change, a wrong profile, a stretch and an unapproved crop", () => {
    assert.ok(blockReasons(runRenderedImageGate(input({ colourChanged: true }))).some((r) => /colour was changed/.test(r)));
    assert.ok(blockReasons(runRenderedImageGate(input({ colourProfile: "CMYK" }))).some((r) => /needs sRGB/.test(r)));
    assert.ok(blockReasons(runRenderedImageGate(input({ surfaces: [{ ...goodSurface, stretched: true }] }))).some((r) => /would be stretched/.test(r)));
    assert.ok(blockReasons(runRenderedImageGate(input({ surfaces: [{ ...goodSurface, aspectMismatch: "The registry says 1.6 but the mesh measures 1.78." }] }))).some((r) => /mesh measures 1\.78/.test(r)));
    assert.ok(blockReasons(runRenderedImageGate(input({ surfaces: [{ ...goodSurface, cropped: true }] }))).some((r) => /cropped without seller approval/.test(r)));
    assert.equal(runRenderedImageGate(input({ cropApproved: true, surfaces: [{ ...goodSurface, cropped: true }] })).blocked, false);
  });

  it("blocks an upscaled design and says what size is needed", () => {
    const result = runRenderedImageGate(input({ surfaces: [{ ...goodSurface, designWidthPx: 400, designHeightPx: 566 }] }));
    assert.equal(result.blocked, true);
    assert.match(blockReasons(result)[0], /design source is 400x566px but it is placed at 620x877px/);
    assert.match(result.checks.find((c) => c.status === "block").fix, /Never upscale a low resolution source/);
  });

  it("blocks an image with no design surface, and a design with no measured size", () => {
    assert.ok(blockReasons(runRenderedImageGate(input({ surfaces: [] }))).some((r) => /no design surface/.test(r)));
    assert.ok(blockReasons(runRenderedImageGate(input({ surfaces: [{ ...goodSurface, designWidthPx: 0 }] }))).some((r) => /no measured source size/.test(r)));
  });
});

describe("gate and encode", () => {
  it("writes a JPG at the same size with the sRGB ICC profile in its bytes", () => {
    const gated = gateAndEncodeRenderedImage(input(), makePng(3000, 2000));
    assert.equal(gated.format, "jpg");
    assert.equal(gated.shortestSidePx, 2000);
    assert.equal(gated.iccProfile, ICC_PROFILE_NAME);
    assert.equal(gated.iccProfileEmbedded, true);
    // Proved from the bytes, not from a flag.
    const icc = readIccProfile(Buffer.from(gated.bytes));
    assert.equal(icc.present, true);
    assert.equal(icc.profileDescription, ICC_PROFILE_NAME);
    assert.equal(gated.bytes[0], 0xff);
    assert.equal(gated.bytes[1], 0xd8);
    const out = join(work, "check.jpg");
    writeFileSync(out, gated.bytes);
    const probe = spawnSync("python3", ["-c", "from PIL import Image; import sys; i = Image.open(sys.argv[1]); print(i.format, i.mode, i.size[0], i.size[1], i.getpixel((1000, 700)))", out], { encoding: "utf8" });
    assert.match(probe.stdout, /^JPEG RGB 3000 2000 /);
    // The blue block is still blue: no recolour beyond JPG rounding.
    const [r, g, b] = probe.stdout.match(/\((\d+), (\d+), (\d+)\)/).slice(1).map(Number);
    assert.ok(r < 8 && g < 8 && b > 247, probe.stdout);
  });

  it("stops with a plain language error when the gate blocks, and writes nothing", () => {
    assert.throws(
      () => gateAndEncodeRenderedImage(input({ colourChanged: true }), makePng(3000, 2000)),
      (error) => error instanceof ExportError && error.code === "quality-gate-blocked" && /colour was changed/.test(error.message),
    );
  });

  it("blocks a PNG whose real size is not the size that was reported", () => {
    assert.throws(
      () => gateAndEncodeRenderedImage(input(), makePng(1500, 1000)),
      (error) => error instanceof ExportError && /Image is 1500x1000px, expected 3000x2000px/.test(error.message),
    );
  });

  it("blocks a PNG with transparent pixels", () => {
    assert.throws(
      () => gateAndEncodeRenderedImage(input(), makePng(3000, 2000, "RGBA", 128)),
      (error) => error instanceof ExportError && /transparent pixels/.test(error.message),
    );
    // Fully opaque RGBA is fine.
    assert.equal(gateAndEncodeRenderedImage(input(), makePng(3000, 2000, "RGBA", 255)).iccProfileEmbedded, true);
  });

  it("refuses a pack that asks for a format this encoder does not write", () => {
    const pngPack = { ...pack, export: { ...pack.export, format: "png" } };
    assert.throws(() => gateAndEncodeRenderedImage(input({ pack: pngPack }), makePng(3000, 2000)), /writes JPG only/);
  });

  it("refuses bytes that are not a PNG", () => {
    assert.throws(() => gateAndEncodeRenderedImage(input(), new TextEncoder().encode("not an image")), ExportError);
  });
});

describe("zip writer", () => {
  const entries = [
    { name: "01-hero.jpg", data: new Uint8Array([1, 2, 3, 4, 5]) },
    { name: "02-angled-hero.jpg", data: new Uint8Array(70000).fill(7) },
    { name: "manifest.json", data: new TextEncoder().encode(JSON.stringify({ ok: true })) },
  ];
  const stamp = new Date(Date.UTC(2026, 10, 16, 12, 0, 0));

  it("crc32 matches the standard check value", () => {
    assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
  });

  it("writes an archive a standard zip reader accepts, with entries in listing order", () => {
    const zip = buildZip(entries, stamp);
    const path = join(work, "set.zip");
    writeFileSync(path, zip);
    const script = "import zipfile, sys, json; z = zipfile.ZipFile(sys.argv[1]); bad = z.testzip(); print(json.dumps({'bad': bad, 'names': z.namelist(), 'sizes': [i.file_size for i in z.infolist()], 'first': list(z.read('01-hero.jpg')), 'manifest': z.read('manifest.json').decode()}))";
    const read = spawnSync("python3", ["-c", script, path], { encoding: "utf8" });
    assert.equal(read.status, 0, read.stderr);
    const info = JSON.parse(read.stdout);
    assert.equal(info.bad, null);
    assert.deepEqual(info.names, ["01-hero.jpg", "02-angled-hero.jpg", "manifest.json"]);
    assert.deepEqual(info.sizes, [5, 70000, 11]);
    assert.deepEqual(info.first, [1, 2, 3, 4, 5]);
    assert.equal(info.manifest, '{"ok":true}');
  });

  it("the same input gives the same bytes", () => {
    assert.deepEqual(buildZip(entries, stamp), buildZip(entries, stamp));
  });

  it("refuses unsafe or repeated entry names", () => {
    assert.throws(() => buildZip([{ name: "../escape.jpg", data: new Uint8Array(1) }], stamp), /not safe/);
    assert.throws(() => buildZip([{ name: "/abs.jpg", data: new Uint8Array(1) }], stamp), /not safe/);
    assert.throws(() => buildZip([entries[0], entries[0]], stamp), /used twice/);
  });
});
