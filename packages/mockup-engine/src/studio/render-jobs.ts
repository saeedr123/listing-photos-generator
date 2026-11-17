// Render job boundary.
// docs/architecture.md says render and export run as background jobs.
// Today the renderer runs in the browser with WebGL. To keep that choice
// reversible, the batch flow talks only to this interface. A later
// server side or queued runner implements the same interface and the
// batch flow, the gate and the zip step do not change.

import type { BatchItem, BatchPlan } from "./batch.ts";
import type { FramingRecord } from "./pixel-diff.ts";
import type { SurfaceTextureLayout } from "./surface-fit.ts";

export interface RenderSettings {
  /** The scene is rendered this many times larger on each side, then reduced. */
  supersample: number;
}

export interface RenderedSurfaceReport {
  modelIndex: number;
  modelId: string;
  surfaceId: string;
  designPageId: string;
  designWidthPx: number;
  designHeightPx: number;
  layout: SurfaceTextureLayout;
  /** Corners of the surface in the output image: top left, top right, bottom right, bottom left. */
  cornersPx: [number, number][];
  /** Edge lengths of the surface in the output image. */
  projectedWidthPx: number;
  projectedHeightPx: number;
  /** Aspect measured from the mesh, for the stretch check. Null when it could not be measured. */
  measuredAspect: number | null;
  warnings: string[];
}

export interface RendererInfo {
  /** Where the render ran, for example browser-webgl. */
  runner: string;
  threeRevision: string;
  glRenderer: string;
  userAgent: string;
  maxTextureSizePx: number;
}

export interface RenderedImage {
  item: BatchItem;
  /** Lossless pixels straight from the renderer. The export gate turns this into the platform format. */
  png: Uint8Array;
  widthPx: number;
  heightPx: number;
  /** The supersample factor actually used, which can be lower than asked when the GPU limit is hit. */
  supersampleUsed: number;
  framing: FramingRecord;
  surfaces: RenderedSurfaceReport[];
  renderer: RendererInfo;
  warnings: string[];
}

export interface RenderProgress {
  position: number;
  total: number;
  shotId: string;
  stage: "loading" | "rendering" | "done";
}

export interface RenderJobRunner {
  readonly name: string;
  renderItem(item: BatchItem, settings: RenderSettings): Promise<RenderedImage>;
  renderBatch(
    plan: BatchPlan,
    settings: RenderSettings,
    onProgress?: (progress: RenderProgress) => void,
  ): Promise<RenderedImage[]>;
}

/** Shared batch loop, so every runner renders in plan order and reports progress the same way. */
export async function renderBatchInOrder(
  runner: Pick<RenderJobRunner, "renderItem">,
  plan: BatchPlan,
  settings: RenderSettings,
  onProgress?: (progress: RenderProgress) => void,
): Promise<RenderedImage[]> {
  if (!plan.canExport) {
    throw new Error(`This set cannot be rendered: ${plan.errors.join(" ")}`);
  }
  const images: RenderedImage[] = [];
  const ordered = [...plan.items].sort((a, b) => a.position - b.position);
  for (const item of ordered) {
    onProgress?.({ position: item.position, total: ordered.length, shotId: item.shotId, stage: "rendering" });
    images.push(await runner.renderItem(item, settings));
    onProgress?.({ position: item.position, total: ordered.length, shotId: item.shotId, stage: "done" });
  }
  return images;
}
