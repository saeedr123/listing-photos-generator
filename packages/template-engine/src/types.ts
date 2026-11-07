// Template engine types.
// Platform neutral: no platform name, size, limit, or rule lives in this file.
// Platform values arrive through the platform export adapter at export time.
// Style rule for this file: no em dashes and no en dashes anywhere.

export type Orientation = "landscape" | "portrait" | "square";

export type TemplateStatus = "draft" | "preview" | "published" | "retired";

export interface GridBox {
  // Coordinates in a 0 to 1000 space, relative to the canvas.
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutSection {
  id: string;
  order: number;
  kind: string;
  grid: GridBox;
  description: string;
}

export interface TypographySlot {
  family: string;
  style: string;
  weight: number;
  textCase: "title" | "upper" | "sentence" | "lower";
  sizeScale: number;
  lineHeight: number;
  letterSpacing: number;
}

export interface TypographySystem {
  title: TypographySlot;
  subtitle: TypographySlot;
  body: TypographySlot;
  label: TypographySlot;
}

export interface TextArea {
  id: string;
  sectionId: string;
  kind: "title" | "subtitle" | "body" | "list" | "pill" | "label" | "cta";
  // Content is a token such as {{product.title}} or a structural label such
  // as "Step 1". Never a seller product fact written out in the template.
  contentToken: string;
  grid: GridBox;
  maxChars: number | null;
  maxLines: number;
  isSample: boolean;
}

export interface ImageArea {
  id: string;
  sectionId: string;
  kind: "product-render" | "mockup" | "background-detail";
  grid: GridBox;
  fit: "contain";
  centred: boolean;
  allowStretch: false;
  allowColourChange: false;
  allowCrop: false;
}

export interface MockupSlot {
  id: string;
  sectionId: string;
  mockupKind: string;
  grid: GridBox;
}

export interface TemplateBackground {
  type: "solid-pattern" | "solid" | "gradient-soft" | "scene";
  base: string;
  pattern: string | null;
  accent: string;
  card: string;
  text: string;
}

export interface TemplateLayout {
  canvas: { aspectRatio: string; orientation: Orientation };
  structure: string;
  grid: string;
  sections: LayoutSection[];
  sectionOrder: string[];
}

export interface TemplateDefinition {
  id: string;
  slug: string;
  name: string;
  role: string;
  version: number;
  status: TemplateStatus;
  layout: TemplateLayout;
  typography: TypographySystem;
  textAreas: TextArea[];
  imageAreas: ImageArea[];
  mockupSlots: MockupSlot[];
  allowedOrientations: Orientation[];
  background: TemplateBackground;
  nichePacks: string[];
  intendedPlatform: string;
  intendedNiche: string;
  bestUse: string;
  referenceStructure: string;
  changeNote: string;
  previousVersion: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFacts {
  // Verified product facts supplied by the seller and checked by
  // reconciliation. This type lives here only so templates can be rendered
  // against facts; no fact is stored inside any template definition.
  productName: string;
  format: string;
  tabCount: number;
  tabNames: string[];
  priceList: { amount: number; currency: string } | null;
  priceLaunch: { amount: number; currency: string } | null;
  priceNote: string;
  features: string[];
  claims: string[];
  isSampleRender: boolean;
  renderWidthPx: number;
  renderHeightPx: number;
}

export interface TemplateValidationIssue {
  code: string;
  message: string;
}

export interface DistinctnessSignature {
  sectionOrder: string[];
  sectionKinds: string[];
  grid: string;
  structure: string;
  typography: {
    titleFamily: string;
    titleStyle: string;
    titleCase: string;
    subtitleFamily: string;
    subtitleStyle: string;
    bodyFamily: string;
    bodyStyle: string;
  };
}
