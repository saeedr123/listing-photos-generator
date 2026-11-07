// Mockup fit tests, per PROMPT.md sections 7 and 9.
// Contain fit, centred, no stretch, no colour change, no crop unless
// approved. Landscape sheet in a portrait phone warns, never stretches.
// A flat basic rectangle with a plain background FAILS the premium label.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  checkPremium,
  containFit,
  licenceGate,
  loadMockups,
  orientationAllowed,
  orientationOf,
  validateAddFlow,
  validateMockup,
} from "../packages/mockup-engine/src/index.ts";

const DIR = new URL("../packages/mockup-engine/mockups/", import.meta.url).pathname;
const mockups = loadMockups(DIR);

describe("Mockup Library starter set", () => {
  it("has exactly 5 starter mockups", () => {
    assert.equal(mockups.length, 5);
    assert.deepEqual(
      mockups.map((m) => m.id),
      ["flat-feature-frame", "laptop-alone", "laptop-plus-phone", "phone-alone", "tablet-alone"],
    );
  });

  it("every mockup validates with no issues", () => {
    for (const mockup of mockups) {
      assert.deepEqual(validateMockup(mockup), [], mockup.id);
    }
  });

  it("every mockup carries a complete licence record", () => {
    for (const mockup of mockups) {
      const gate = licenceGate(mockup);
      assert.equal(gate.canEnable, true, mockup.id);
      assert.ok(mockup.licence.source, mockup.id);
      assert.ok(mockup.licence.licenceType, mockup.id);
      assert.ok(mockup.licence.licenceDate, mockup.id);
      assert.ok(mockup.licence.licenceStorageLocation, mockup.id);
    }
  });

  it("straight devices are the default, no warp is required", () => {
    for (const mockup of mockups) {
      assert.equal(mockup.warpRequired, false, mockup.id);
    }
  });
});

describe("contain fit", () => {
  it("landscape sheet in a landscape laptop screen: contain, centred, no stretch", () => {
    const laptop = mockups.find((m) => m.id === "laptop-alone");
    const fit = containFit({
      sourceWidth: 3000,
      sourceHeight: 2000,
      sourceOrientation: "landscape",
      screen: laptop.screenAreas[0],
      frameWidth: laptop.frameWidthPx,
      frameHeight: laptop.frameHeightPx,
      cropApproved: false,
    });
    assert.equal(fit.stretched, false);
    assert.equal(fit.cropped, false);
    assert.equal(fit.colourChanged, false);
    // Screen area is 640 by 400 in 0 to 1000 space on a 3000 by 2000 frame,
    // so the screen is 1920 by 800 px. A 3:2 source fits by height.
    assert.ok(Math.abs(fit.fittedHeight - 800) < 1);
    assert.ok(Math.abs(fit.fittedWidth - 1200) < 1);
    assert.ok(fit.letterboxLeft > 0);
    assert.ok(Math.abs(fit.letterboxTop) < 1);
  });

  it("landscape sheet in a portrait phone: warns, never stretches", () => {
    const phone = mockups.find((m) => m.id === "phone-alone");
    const fit = containFit({
      sourceWidth: 3000,
      sourceHeight: 2000,
      sourceOrientation: "landscape",
      screen: phone.screenAreas[0],
      frameWidth: phone.frameWidthPx,
      frameHeight: phone.frameHeightPx,
      cropApproved: false,
    });
    assert.equal(fit.stretched, false);
    assert.ok(fit.warnings.some((w) => w.includes("Landscape sheet in a portrait screen area")));
    assert.ok(fit.warnings.some((w) => w.includes("Never stretch to fill")));
    // The sheet shows as a small band: fitted height is far below the screen height.
    assert.ok(fit.fittedHeight < 1000);
    assert.ok(fit.letterboxTop > 100);
    assert.ok(fit.letterboxBottom > 100);
  });

  it("orientation check blocks a landscape source in a portrait only mockup", () => {
    const phone = mockups.find((m) => m.id === "phone-alone");
    const check = orientationAllowed(phone.allowedScreenOrientations, "landscape");
    assert.equal(check.allowed, false);
    assert.match(check.message, /never stretch/);
    const ok = orientationAllowed(phone.allowedScreenOrientations, "portrait");
    assert.equal(ok.allowed, true);
  });

  it("orientationOf classifies sizes correctly", () => {
    assert.equal(orientationOf(3000, 2000), "landscape");
    assert.equal(orientationOf(2000, 3000), "portrait");
    assert.equal(orientationOf(2000, 2000), "square");
  });
});

describe("premium quality check", () => {
  it("flat basic rectangle with a plain background FAILS the premium label", () => {
    const flat = mockups.find((m) => m.id === "flat-feature-frame");
    assert.equal(flat.qualityLabel, "basic");
    const result = checkPremium(flat);
    assert.equal(result.passesPremium, false);
    assert.equal(result.label, "basic");
    assert.ok(result.failedCriteria.length > 0);
  });

  it("laptop, phone, tablet, and laptop plus phone meet the declared premium criteria", () => {
    for (const id of ["laptop-alone", "phone-alone", "tablet-alone", "laptop-plus-phone"]) {
      const mockup = mockups.find((m) => m.id === id);
      const result = checkPremium(mockup);
      assert.equal(result.passesPremium, true, id);
      assert.equal(result.label, "premium", id);
    }
  });

  it("a premium label with a missing criterion fails", () => {
    const laptop = mockups.find((m) => m.id === "laptop-alone");
    const broken = JSON.parse(JSON.stringify(laptop));
    broken.premiumCriteria.softRealisticShadows = false;
    const result = checkPremium(broken);
    assert.equal(result.passesPremium, false);
    assert.ok(result.failedCriteria.includes("soft realistic shadows"));
  });
});

describe("easy add flow", () => {
  it("reports every missing step before enable", () => {
    const flow = validateAddFlow({
      frameUploaded: true,
      screenAreaMarked: false,
      orientationsSet: false,
      nichePacksSet: true,
      previewedWithRealRender: false,
    });
    assert.equal(flow.readyToEnable, false);
    assert.equal(flow.missingSteps.length, 3);
  });

  it("is ready only when all five steps are done", () => {
    const flow = validateAddFlow({
      frameUploaded: true,
      screenAreaMarked: true,
      orientationsSet: true,
      nichePacksSet: true,
      previewedWithRealRender: true,
    });
    assert.equal(flow.readyToEnable, true);
    assert.deepEqual(flow.missingSteps, []);
  });
});
