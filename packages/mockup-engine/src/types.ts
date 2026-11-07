// Mockup engine types.
// A mockup is a presentation frame. The screen inside it is always the
// seller real product render. A mockup never invents product content and is
// never presented as a real sheet screenshot.

export type Orientation = "landscape" | "portrait" | "square";

export type MockupStatus = "draft" | "preview" | "published" | "retired";

export type QualityLabel = "premium" | "basic";

export interface ScreenArea {
  // Coordinates in a 0 to 1000 space, relative to the frame.
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LicenceRecord {
  source: string;
  licenceType: string;
  licenceDate: string;
  licenceStorageLocation: string;
  creator: string;
  notes: string;
}

export interface PremiumCriteria {
  realisticPerspective: boolean;
  softRealisticShadows: boolean;
  depth: boolean;
  lifestyleOrDeskScene: boolean;
  realisticMaterialsAndEdges: boolean;
  screenCrispAtExportSize: boolean;
}

export interface MockupDefinition {
  id: string;
  slug: string;
  name: string;
  kind: string;
  version: number;
  status: MockupStatus;
  frameFile: string;
  frameWidthPx: number;
  frameHeightPx: number;
  screenAreas: ScreenArea[];
  allowedScreenOrientations: Orientation[];
  background: string;
  nichePacks: string[];
  warpRequired: boolean;
  warpNote: string | null;
  qualityLabel: QualityLabel;
  premiumCriteria: PremiumCriteria;
  licence: LicenceRecord;
  crispTestStatus: "not_tested" | "pass" | "fail";
  crispTestNote: string;
  changeNote: string;
  previousVersion: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface FitResult {
  // Contain fit: scale the source to fit inside the screen area, centred,
  // keeping its aspect ratio. Never stretch, never crop, never recolour.
  scale: number;
  fittedWidth: number;
  fittedHeight: number;
  offsetX: number;
  offsetY: number;
  letterboxTop: number;
  letterboxBottom: number;
  letterboxLeft: number;
  letterboxRight: number;
  stretched: false;
  cropped: false;
  colourChanged: false;
  warnings: string[];
}

export interface PremiumCheckResult {
  passesPremium: boolean;
  label: QualityLabel;
  failedCriteria: string[];
  message: string;
}
