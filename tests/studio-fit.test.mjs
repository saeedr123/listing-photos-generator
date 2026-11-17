// Texture fit maths for the 3D studio.
// Contain fit inside the screen or paper area, centred, no stretch, no
// recolour, no crop without approval, never upscaled.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  LANDSCAPE_ON_PORTRAIT_WARNING,
  PORTRAIT_ON_LANDSCAPE_WARNING,
  checkSurfaceCrisp,
  computeSurfaceTextureLayout,
  measureUvAspect,
  surfaceAspectMismatch,
  uvBounds,
} from "../packages/mockup-engine/src/studio/browser.ts";

const BIG = 1 << 20;

function assertContain(layout, design, surfaceAspect) {
  // Never stretched: one scale for both axes.
  assert.ok(Math.abs(layout.drawWidthPx / design.w - layout.drawHeightPx / design.h) < 1e-9, "uniform scale");
  assert.ok(layout.scale <= 1, "never upscaled");
  // Never cropped: the whole design is inside the canvas.
  assert.ok(layout.drawX >= 0 && layout.drawY >= 0);
  assert.ok(layout.drawX + layout.drawWidthPx <= layout.canvasWidthPx + 1e-9);
  assert.ok(layout.drawY + layout.drawHeightPx <= layout.canvasHeightPx + 1e-9);
  // Centred, to the pixel.
  assert.ok(Math.abs(layout.letterboxLeftPx - layout.letterboxRightPx) <= 1);
  assert.ok(Math.abs(layout.letterboxTopPx - layout.letterboxBottomPx) <= 1);
  // The canvas has the surface aspect, to within one pixel of rounding.
  assert.ok(Math.abs(layout.canvasWidthPx / layout.canvasHeightPx - surfaceAspect) < surfaceAspect * (2 / Math.min(layout.canvasWidthPx, layout.canvasHeightPx)));
  assert.equal(layout.stretched, false);
  assert.equal(layout.cropped, false);
  assert.equal(layout.colourChanged, false);
}

describe("surface texture layout", () => {
  it("a design with the surface aspect fills the surface at its native pixels", () => {
    const layout = computeSurfaceTextureLayout({ designWidthPx: 3200, designHeightPx: 2000, surfaceAspect: 1.6, maxTextureSizePx: BIG });
    assert.equal(layout.canvasWidthPx, 3200);
    assert.equal(layout.canvasHeightPx, 2000);
    assert.equal(layout.scale, 1);
    assert.equal(layout.drawX, 0);
    assert.equal(layout.drawY, 0);
    assert.equal(layout.coverage, 1);
    assert.deepEqual(layout.warnings, []);
  });

  it("a wider design is letterboxed top and bottom, at native pixels", () => {
    const design = { w: 3000, h: 1000 };
    const layout = computeSurfaceTextureLayout({ designWidthPx: design.w, designHeightPx: design.h, surfaceAspect: 1.5, maxTextureSizePx: BIG });
    assert.equal(layout.canvasWidthPx, 3000);
    assert.equal(layout.canvasHeightPx, 2000);
    assert.equal(layout.scale, 1);
    assert.equal(layout.letterboxTopPx, 500);
    assert.equal(layout.letterboxBottomPx, 500);
    assert.equal(layout.letterboxLeftPx, 0);
    assertContain(layout, design, 1.5);
  });

  it("a taller design is letterboxed left and right, at native pixels", () => {
    const design = { w: 2480, h: 3508 };
    const layout = computeSurfaceTextureLayout({ designWidthPx: design.w, designHeightPx: design.h, surfaceAspect: 1.6, maxTextureSizePx: BIG });
    assert.equal(layout.canvasHeightPx, 3508);
    assert.equal(layout.canvasWidthPx, Math.round(3508 * 1.6));
    assert.equal(layout.scale, 1);
    assert.equal(layout.drawWidthPx, 2480);
    assert.equal(layout.drawHeightPx, 3508);
    assertContain(layout, design, 1.6);
  });

  it("offsets are whole pixels, so a native size design is copied, not resampled", () => {
    for (const [w, h, aspect] of [[2481, 3508, 1.6], [999, 1001, 0.4615], [1234, 777, 0.7071]]) {
      const layout = computeSurfaceTextureLayout({ designWidthPx: w, designHeightPx: h, surfaceAspect: aspect, maxTextureSizePx: BIG });
      assert.equal(layout.scale, 1);
      assert.equal(Number.isInteger(layout.drawX), true);
      assert.equal(Number.isInteger(layout.drawY), true);
      assertContain(layout, { w, h }, aspect);
    }
  });

  it("holds for many design and surface shapes", () => {
    const designs = [[3000, 2000], [2000, 3000], [2480, 3508], [2550, 3300], [4000, 4000], [640, 480], [1, 5000], [5000, 1]];
    const aspects = [1.6, 0.066 / 0.143, 0.228 / 0.171, 0.171 / 0.228, 0.21 / 0.297, 0.2159 / 0.2794, 1];
    for (const [w, h] of designs) {
      for (const aspect of aspects) {
        assertContain(computeSurfaceTextureLayout({ designWidthPx: w, designHeightPx: h, surfaceAspect: aspect, maxTextureSizePx: BIG }), { w, h }, aspect);
      }
    }
  });

  it("landscape content on a portrait surface warns and is never stretched", () => {
    const design = { w: 3000, h: 2000 };
    const layout = computeSurfaceTextureLayout({ designWidthPx: design.w, designHeightPx: design.h, surfaceAspect: 0.066 / 0.143, maxTextureSizePx: BIG });
    assert.ok(layout.warnings.includes(LANDSCAPE_ON_PORTRAIT_WARNING));
    assert.match(LANDSCAPE_ON_PORTRAIT_WARNING, /portrait screenshot or an approved crop/);
    assert.match(LANDSCAPE_ON_PORTRAIT_WARNING, /Never stretch/);
    assert.ok(layout.letterboxTopPx > 0 && layout.letterboxBottomPx > 0);
    assert.ok(layout.coverage < 0.5);
    assertContain(layout, design, 0.066 / 0.143);
  });

  it("portrait content on a landscape surface warns", () => {
    const layout = computeSurfaceTextureLayout({ designWidthPx: 2480, designHeightPx: 3508, surfaceAspect: 1.6, maxTextureSizePx: BIG });
    assert.ok(layout.warnings.includes(PORTRAIT_ON_LANDSCAPE_WARNING));
  });

  it("a design larger than the GPU texture limit is scaled down, never up, and says so", () => {
    const design = { w: 12000, h: 8000 };
    const layout = computeSurfaceTextureLayout({ designWidthPx: design.w, designHeightPx: design.h, surfaceAspect: 1.6, maxTextureSizePx: 8192 });
    assert.ok(layout.canvasWidthPx <= 8192 && layout.canvasHeightPx <= 8192);
    assert.ok(layout.scale < 1);
    assert.ok(layout.warnings.some((w) => /scaled down/.test(w)));
    assertContain(layout, design, 1.6);
  });

  it("a small design is not enlarged to fill a texture", () => {
    const layout = computeSurfaceTextureLayout({ designWidthPx: 320, designHeightPx: 200, surfaceAspect: 1.6, maxTextureSizePx: 8192 });
    assert.equal(layout.scale, 1);
    assert.equal(layout.canvasWidthPx, 320);
  });

  it("rejects a design with no measured size", () => {
    assert.throws(() => computeSurfaceTextureLayout({ designWidthPx: 0, designHeightPx: 100, surfaceAspect: 1, maxTextureSizePx: BIG }), /no measured pixel size/);
    assert.throws(() => computeSurfaceTextureLayout({ designWidthPx: 100, designHeightPx: 100, surfaceAspect: 0, maxTextureSizePx: BIG }), /positive/);
  });
});

describe("crisp check for a 3D placement", () => {
  const layout = computeSurfaceTextureLayout({ designWidthPx: 2480, designHeightPx: 3508, surfaceAspect: 0.21 / 0.297, maxTextureSizePx: BIG });

  it("passes when the design has more pixels than its placement", () => {
    const result = checkSurfaceCrisp({ designWidthPx: 2480, designHeightPx: 3508, layout, projectedWidthPx: 1000, projectedHeightPx: 1414 });
    assert.equal(result.crisp, true);
    assert.ok(result.upscaleFactor < 1);
    assert.match(result.message, /covers its/);
  });

  it("fails when the design would be enlarged, and says what size is needed", () => {
    const small = computeSurfaceTextureLayout({ designWidthPx: 400, designHeightPx: 566, surfaceAspect: 0.21 / 0.297, maxTextureSizePx: BIG });
    const result = checkSurfaceCrisp({ designWidthPx: 400, designHeightPx: 566, layout: small, projectedWidthPx: 1000, projectedHeightPx: 1414 });
    assert.equal(result.crisp, false);
    assert.ok(result.upscaleFactor > 2);
    assert.match(result.message, /Upscaling would blur it/);
    assert.match(result.message, /Re-render the design at or above/);
  });

  it("counts only the part of the surface the design covers", () => {
    // Portrait page on a landscape screen covers a narrow band.
    const banded = computeSurfaceTextureLayout({ designWidthPx: 1000, designHeightPx: 1414, surfaceAspect: 1.6, maxTextureSizePx: BIG });
    const result = checkSurfaceCrisp({ designWidthPx: 1000, designHeightPx: 1414, layout: banded, projectedWidthPx: 1600, projectedHeightPx: 1000 });
    assert.ok(Math.abs(result.placedHeightPx - 1000) < 1);
    assert.ok(result.placedWidthPx < 720);
    assert.equal(result.crisp, true);
  });
});

describe("stretch check from the model mesh", () => {
  // A flat rectangle of width W and height H, UVs covering 0 to 1.
  const quad = (W, H) => ({
    positions: [0, 0, 0, W, 0, 0, W, H, 0, 0, H, 0],
    uvs: [0, 1, 1, 1, 1, 0, 0, 0],
    indices: [0, 1, 2, 0, 2, 3],
  });

  it("measures the real aspect of a surface mesh", () => {
    const q = quad(0.304, 0.19);
    assert.ok(Math.abs(measureUvAspect(q.positions, q.uvs, q.indices) - 1.6) < 1e-6);
    const p = quad(0.21, 0.297);
    assert.ok(Math.abs(measureUvAspect(p.positions, p.uvs, p.indices) - 0.21 / 0.297) < 1e-6);
  });

  it("works without an index buffer and for a tilted surface", () => {
    const tilted = { positions: [0, 0, 0, 2, 0, 0, 2, 0.6, 0.8, 0, 0, 0, 2, 0.6, 0.8, 0, 0.6, 0.8], uvs: [0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0] };
    assert.ok(Math.abs(measureUvAspect(tilted.positions, tilted.uvs, null) - 2) < 1e-6);
  });

  it("reports a mismatch between the registry aspect and the mesh", () => {
    const q = quad(0.304, 0.19);
    const measured = measureUvAspect(q.positions, q.uvs, q.indices);
    assert.equal(surfaceAspectMismatch(1.6, measured), null);
    assert.equal(surfaceAspectMismatch(1.61, measured), null);
    assert.match(surfaceAspectMismatch(1.7778, measured), /would be stretched/);
    assert.match(surfaceAspectMismatch(1.6, null), /could not be measured/);
  });

  it("returns null when the mesh has no usable UVs", () => {
    assert.equal(measureUvAspect([0, 0, 0, 1, 0, 0, 1, 1, 0], [0, 0, 0, 0, 0, 0], [0, 1, 2]), null);
  });

  it("uv bounds show whether the surface uses the full square", () => {
    assert.deepEqual(uvBounds(quad(1, 1).uvs), { minU: 0, maxU: 1, minV: 0, maxV: 1 });
    assert.deepEqual(uvBounds([0.1, 0.2, 0.9, 0.8]), { minU: 0.1, maxU: 0.9, minV: 0.2, maxV: 0.8 });
  });
});
