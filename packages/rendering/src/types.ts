// Rendering abstraction.
// One rendering path feeds both preview and JPG export, so a pack does not
// look different in each output without a documented reason.
// The render model is plain data: canvas, background, text boxes, image
// boxes, and mockup placements, all in pixel coordinates at export size.
// Preview renders the same model as SVG. Export rasterizes the same model
// to JPG. If the two ever differ, the difference is recorded in the export
// result, never silent.

export interface RenderTextBox {
  id: string;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fontFamily: string;
  fontSizePx: number;
  fontWeight: number;
  fontStyle: string;
  fill: string;
  align: "left" | "center" | "right";
  maxLines: number;
}

export interface RenderImageBox {
  id: string;
  kind: "product-render" | "mockup-frame" | "sheet-schematic";
  x: number;
  y: number;
  w: number;
  h: number;
  // Source render dimensions, used by the Crisp Quality Gate.
  sourceWidthPx: number | null;
  sourceHeightPx: number | null;
  isSample: boolean;
  label: string;
}

export interface RenderRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  stroke: string | null;
  radius: number;
  opacity: number;
}

export interface RenderModel {
  templateId: string;
  templateVersion: number;
  canvasWidthPx: number;
  canvasHeightPx: number;
  colourProfile: string;
  background: string;
  pattern: string | null;
  rects: RenderRect[];
  texts: RenderTextBox[];
  images: RenderImageBox[];
  warnings: string[];
  // Human readable note when preview and export differ, empty when they match.
  previewExportDifference: string | null;
}

export interface ResolvedText {
  areaId: string;
  text: string;
}
