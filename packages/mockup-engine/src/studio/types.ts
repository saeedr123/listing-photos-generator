// 3D studio types.
// A registry entry describes a mockup model: a GLB file plus the data the
// scene engine needs to place the seller real render on it. Nothing about
// the seller product is stored in a registry entry, a shot, or a style kit.

import type { HumanReviewSignOff, Orientation, PremiumCriteria, QualityLabel, ScreenArea } from "../types.ts";

export type Vec3 = [number, number, number];

export const MODEL_CATEGORIES = ["laptop", "phone", "tablet", "print", "bundle", "desk"] as const;
export type ModelCategory = (typeof MODEL_CATEGORIES)[number];

export const REGISTRY_STATUSES = ["draft", "preview", "published", "hidden", "retired"] as const;
export type RegistryStatus = (typeof REGISTRY_STATUSES)[number];

/** glb-3d is rendered by the 3D scene engine. svg-2d is an old flat frame kept as a basic 2D fallback. */
export type ModelRenderer = "glb-3d" | "svg-2d";

/** Every asset carries a licence record: fonts, HDRIs, textures and GLB models. */
export interface AssetLicence {
  source: string;
  licenceType: string;
  licenceDate: string;
  licenceStorageLocation: string;
  creator: string;
  notes: string;
}

export interface CameraPreset {
  id: string;
  label: string;
  /** Camera position in metres, in the model own space. */
  position: Vec3;
  /** The point the camera looks at. */
  target: Vec3;
  /** Vertical field of view in degrees. */
  fovDeg: number;
}

export type SurfaceKind = "screen" | "paper";

/**
 * A surface is the named mesh that shows the seller design: a device
 * screen or a sheet of paper. Its UVs must map the full 0 to 1 square to
 * the visible area, with the origin at the top left (the glTF convention).
 */
export interface ModelSurface {
  id: string;
  meshName: string;
  kind: SurfaceKind;
  /** Width divided by height of the visible area. */
  aspect: number;
  /** Which page of the design this surface shows by default, from 0. */
  pageSlot: number;
  /** Colour of the empty band left by contain fit. The design itself is never recoloured. */
  letterboxColour: string;
}

export interface ColourOption {
  id: string;
  label: string;
  /** Name of the material in the GLB that takes this colour. */
  materialName: string;
  colour: string;
}

export interface ModelFileRef {
  /** Object storage key, or a builtin/ key for a file kept in the repository. */
  storageKey: string;
  bytes: number;
  sha256: string;
}

/** Kept only for svg-2d entries migrated from the old flat frame library. */
export interface LegacyFrameRef {
  frameFile: string;
  frameWidthPx: number;
  frameHeightPx: number;
  screenAreas: ScreenArea[];
  background: string;
  nichePacks: string[];
  legacyVersion: number;
}

export interface ModelRegistryEntry {
  id: string;
  slug: string;
  name: string;
  category: ModelCategory;
  tags: string[];
  renderer: ModelRenderer;
  modelFile: ModelFileRef | null;
  legacyFrame: LegacyFrameRef | null;
  surfaces: ModelSurface[];
  allowedOrientations: Orientation[];
  cameraPresets: CameraPreset[];
  defaultCameraPresetId: string | null;
  colourOptions: ColourOption[];
  defaultColourOptionId: string | null;
  previewThumbnail: { storageKey: string } | null;
  licence: AssetLicence;
  /** Admin confirms the model shows no brand logo or trademark. */
  unbrandedConfirmed: boolean;
  /** Admin has previewed the model with a real product render. */
  previewedWithRealRender: boolean;
  qualityLabel: QualityLabel;
  premiumCriteria: PremiumCriteria;
  humanReview: HumanReviewSignOff | null;
  version: number;
  status: RegistryStatus;
  previousVersion: number | null;
  changeNote: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface StudioIssue {
  code: string;
  message: string;
}

// ---- Assets other than models -------------------------------------------

export interface Softbox {
  /** Centre of the light panel in metres. */
  position: Vec3;
  /** Width and height of the panel in metres. */
  size: [number, number];
  /** Light colour and strength. Strength multiplies the colour. */
  colour: string;
  intensity: number;
}

export type EnvironmentSource =
  | { type: "procedural-studio"; roomColour: string; roomIntensity: number; softboxes: Softbox[] }
  | { type: "hdri"; storageKey: string };

export interface LightingPreset {
  id: string;
  name: string;
  environment: EnvironmentSource;
  environmentIntensity: number;
  exposure: number;
  licence: AssetLicence;
  version: number;
  status: RegistryStatus;
  previousVersion: number | null;
  changeNote: string;
}

export interface TextureAsset {
  id: string;
  name: string;
  storageKey: string;
  /** Real world size of one tile of the texture, in metres. */
  tileSizeMetres: number;
  licence: AssetLicence;
  version: number;
  status: RegistryStatus;
  previousVersion: number | null;
  changeNote: string;
}

// ---- Shots ----------------------------------------------------------------

export const SHOT_ROLES = [
  "hero",
  "angled-hero",
  "laptop-plus-phone",
  "phone-view",
  "printed-sheet",
  "fanned-pages",
  "what-is-inside",
  "formats-and-sizes",
  "custom",
] as const;
export type ShotRole = (typeof SHOT_ROLES)[number];

export interface ShotModelPlacement {
  modelId: string;
  position: Vec3;
  rotationDeg: Vec3;
  scale: number;
  colourOptionId: string | null;
  /** Design page shown on each surface, by surface id. Missing ids use the surface pageSlot. */
  surfacePages: Record<string, number>;
}

export interface ShotCamera {
  position: Vec3;
  target: Vec3;
  fovDeg: number;
}

export interface ContactShadowSettings {
  enabled: boolean;
  opacity: number;
  /** Blur as a fraction of the shadow plane size, 0 to 1. */
  blur: number;
  /** Side of the square shadow plane in metres. */
  planeSizeMetres: number;
  /** How far above the ground the shadow still catches geometry, in metres. */
  heightMetres: number;
}

/** Areas are in a 0 to 1000 space relative to the output image, like the old screen areas. */
export interface TextArea {
  x: number;
  y: number;
  w: number;
  h: number;
  align: "left" | "center" | "right";
}

export interface ShotTextLayout {
  headline: TextArea | null;
  bullets: TextArea | null;
  badge: TextArea | null;
}

export interface ShotDefinition {
  id: string;
  slug: string;
  name: string;
  role: ShotRole;
  /** Output aspect ratio, width to height. The pixel size comes from the platform pack. */
  aspect: { w: number; h: number };
  models: ShotModelPlacement[];
  camera: ShotCamera;
  lightingPresetId: string;
  contactShadow: ContactShadowSettings;
  textLayout: ShotTextLayout;
  /** A plain language note shown with the shot, for example a fact the seller must confirm. */
  sellerNote: string;
  version: number;
  status: RegistryStatus;
  previousVersion: number | null;
  changeNote: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

// ---- Style kits -----------------------------------------------------------

export type BackgroundSpec =
  | { type: "solid"; colour: string }
  | { type: "gradient"; from: string; to: string; angleDeg: number }
  | { type: "desk-texture"; textureId: string; backdropColour: string };

export interface FontSpec {
  /** CSS font family. A generic family ships no font file. */
  family: string;
  weight: number;
  /** Storage key of the font file, or null when no file is shipped. */
  fileStorageKey: string | null;
  /** Required when a font file is shipped. */
  licence: AssetLicence | null;
}

export interface BadgeSpec {
  style: "none" | "pill" | "circle";
  wording: string;
  backgroundColour: string;
  textColour: string;
}

export interface StyleKitShot {
  shotId: string;
  /** Overrides the kit background for this shot. Null uses the kit background. */
  background: BackgroundSpec | null;
  showHeadline: boolean;
  showBullets: boolean;
  showBadge: boolean;
}

export interface StyleKit {
  id: string;
  slug: string;
  name: string;
  /** True while the values are placeholders waiting for the owner brand choices. */
  isPlaceholder: boolean;
  placeholderNote: string;
  /** Set on a variant built from the colours of a design. Null on a saved kit. */
  variantOf: string | null;
  backgroundColours: string[];
  accentColour: string;
  textColour: string;
  background: BackgroundSpec;
  fonts: { headline: FontSpec; body: FontSpec };
  badge: BadgeSpec;
  textSlots: { headline: string; featureBullets: string[] };
  /** The ordered list of shots for one listing set. */
  shots: StyleKitShot[];
  version: number;
  status: RegistryStatus;
  previousVersion: number | null;
  changeNote: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

// ---- Design input -----------------------------------------------------------

/** One page of the seller design: a real render, measured, never invented. */
export interface DesignPage {
  id: string;
  widthPx: number;
  heightPx: number;
}
