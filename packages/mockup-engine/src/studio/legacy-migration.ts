// Migration of the old flat SVG frames into the model registry.
// The five starter frames are kept as basic 2D fallbacks. They are never
// rendered by the 3D scene engine and never labelled premium. The old
// definition files stay the single source: this function maps them, it
// does not copy or rewrite them.

import type { MockupDefinition } from "../types.ts";
import type { ModelCategory, ModelRegistryEntry, RegistryStatus } from "./types.ts";

const KIND_TO_CATEGORY: Record<string, ModelCategory> = {
  "laptop-alone": "laptop",
  "phone-alone": "phone",
  "tablet-alone": "tablet",
  "laptop-plus-phone": "bundle",
  "flat-feature-frame": "print",
};

export const LEGACY_ID_PREFIX = "legacy-";

export function migrateLegacyMockup(mockup: MockupDefinition): ModelRegistryEntry {
  const status: RegistryStatus = mockup.status;
  return {
    id: `${LEGACY_ID_PREFIX}${mockup.id}`,
    slug: `${LEGACY_ID_PREFIX}${mockup.slug}`,
    name: `${mockup.name} (2D fallback)`,
    category: KIND_TO_CATEGORY[mockup.kind] ?? "desk",
    tags: ["2d-fallback", "svg-frame", mockup.kind],
    renderer: "svg-2d",
    modelFile: null,
    legacyFrame: {
      frameFile: mockup.frameFile,
      frameWidthPx: mockup.frameWidthPx,
      frameHeightPx: mockup.frameHeightPx,
      screenAreas: mockup.screenAreas,
      background: mockup.background,
      nichePacks: mockup.nichePacks,
      legacyVersion: mockup.version,
    },
    // A 2D frame has no named mesh. Its screen areas stay in legacyFrame.
    surfaces: [],
    allowedOrientations: mockup.allowedScreenOrientations,
    cameraPresets: [],
    defaultCameraPresetId: null,
    colourOptions: [],
    defaultColourOptionId: null,
    previewThumbnail: null,
    licence: mockup.licence,
    unbrandedConfirmed: true,
    previewedWithRealRender: mockup.crispTestStatus === "pass",
    // Whatever the old file says, a flat 2D frame enters the registry as basic.
    qualityLabel: "basic",
    premiumCriteria: {
      ...mockup.premiumCriteria,
      realisticPerspective: false,
      depth: false,
      realisticMaterialsAndEdges: false,
      softRealisticShadows: false,
    },
    humanReview: null,
    version: 1,
    status,
    previousVersion: null,
    changeNote: `Migrated from the flat frame library (${mockup.id} version ${mockup.version}). Kept as a basic 2D fallback. Not rendered by the 3D scene engine and never labelled premium.`,
    createdAt: mockup.createdAt,
    updatedAt: mockup.updatedAt,
    updatedBy: "migration",
  };
}

export function migrateLegacyMockups(mockups: MockupDefinition[]): ModelRegistryEntry[] {
  return mockups.map(migrateLegacyMockup);
}
