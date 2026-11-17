// The render job runner that runs in the browser with WebGL.
// It implements the RenderJobRunner interface from the mockup engine, so
// a later server side or queued runner can replace it without changing
// the batch flow, the gate, or the zip step.

import {
  renderBatchInOrder,
  type BatchItem,
  type BatchPlan,
  type LightingPreset,
  type ModelRegistryEntry,
  type RenderJobRunner,
  type RenderProgress,
  type RenderSettings,
  type RenderedImage,
  type ShotCamera,
  type ShotDefinition,
  type StyleKit,
  type TextureAsset,
} from "@listing-photos-generator/mockup-engine/studio";
import type { DesignPageImage } from "./engine/loaders";
import { BROWSER_RUNNER_NAME, renderShot } from "./engine/render-shot";

export interface BrowserRunnerContext {
  kit: StyleKit;
  shots: ShotDefinition[];
  models: ModelRegistryEntry[];
  lighting: LightingPreset[];
  textures: TextureAsset[];
  pages: DesignPageImage[];
  cameraOverrides?: Record<string, ShotCamera>;
  colourOverrides?: Record<string, Record<number, string | null>>;
  /** Render smaller than the planned size, for thumbnails. 1 is the planned size. */
  outputScale?: number;
}

export class BrowserRenderRunner implements RenderJobRunner {
  readonly name = BROWSER_RUNNER_NAME;
  private readonly context: BrowserRunnerContext;

  constructor(context: BrowserRunnerContext) {
    this.context = context;
  }

  async renderItem(item: BatchItem, settings: RenderSettings): Promise<RenderedImage> {
    const { context } = this;
    const shot = context.shots.find((s) => s.id === item.shotId);
    if (!shot) throw new Error(`Shot ${item.shotId} is not available.`);
    const lighting = context.lighting.find((l) => l.id === shot.lightingPresetId);
    if (!lighting) throw new Error(`Lighting preset ${shot.lightingPresetId} is not available.`);
    const scale = context.outputScale ?? 1;
    return renderShot({
      item,
      shot,
      kit: context.kit,
      models: context.models,
      lighting,
      textures: context.textures,
      pages: context.pages,
      widthPx: Math.round(item.widthPx * scale),
      heightPx: Math.round(item.heightPx * scale),
      supersample: settings.supersample,
      cameraOverride: context.cameraOverrides?.[item.shotId],
      colourOverrides: context.colourOverrides?.[item.shotId],
    });
  }

  renderBatch(plan: BatchPlan, settings: RenderSettings, onProgress?: (progress: RenderProgress) => void): Promise<RenderedImage[]> {
    return renderBatchInOrder(this, plan, settings, onProgress);
  }
}
