// Offscreen export render for one batch item.
// The 3D scene is rendered larger than the output (supersampled), then
// reduced onto a 2D canvas over the style kit background, then the kit
// text is drawn on top. The result is a lossless PNG. Turning it into the
// platform JPG with an embedded sRGB profile is the job of the export
// gate, not of this module.

import * as THREE from "three";
import type {
  BatchItem,
  LightingPreset,
  ModelRegistryEntry,
  RenderedImage,
  RendererInfo,
  ShotCamera,
  ShotDefinition,
  StyleKit,
  TextureAsset,
} from "@listing-photos-generator/mockup-engine/studio";
import { loadEnvironment } from "./environment";
import { ensureFont, studioAssetUrl, type DesignPageImage } from "./loaders";
import { paintBackground, paintTextOverlay } from "./painters";
import { buildShotContent, makeShotCamera, reportSurfaces } from "./scene-builder";

export const BROWSER_RUNNER_NAME = "browser-webgl";

let exportRenderer: THREE.WebGLRenderer | null = null;

function getExportRenderer(): THREE.WebGLRenderer {
  if (!exportRenderer) {
    const canvas = document.createElement("canvas");
    // No multisampling here: the supersample step does the anti aliasing.
    exportRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, preserveDrawingBuffer: true, premultipliedAlpha: true });
    exportRenderer.setPixelRatio(1);
  }
  return exportRenderer;
}

export function configureRenderer(renderer: THREE.WebGLRenderer, lighting: LightingPreset): void {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = lighting.exposure;
}

export function describeRenderer(renderer: THREE.WebGLRenderer): RendererInfo {
  const gl = renderer.getContext();
  const debug = gl.getExtension("WEBGL_debug_renderer_info");
  return {
    runner: BROWSER_RUNNER_NAME,
    threeRevision: THREE.REVISION,
    glRenderer: debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : "unknown",
    userAgent: typeof navigator === "undefined" ? "unknown" : navigator.userAgent,
    maxTextureSizePx: renderer.capabilities.maxTextureSize,
  };
}

/** The largest supersample factor, at or below the one asked for, that the GPU can hold. */
export function usableSupersample(requested: number, widthPx: number, heightPx: number, maxSidePx: number): number {
  for (const factor of [requested, 3, 2, 1.5, 1]) {
    if (factor <= requested && Math.max(widthPx, heightPx) * factor <= maxSidePx) return factor;
  }
  return 1;
}

export interface RenderShotInput {
  item: BatchItem;
  shot: ShotDefinition;
  kit: StyleKit;
  models: ModelRegistryEntry[];
  lighting: LightingPreset;
  textures: TextureAsset[];
  pages: DesignPageImage[];
  widthPx: number;
  heightPx: number;
  supersample: number;
  /** A camera chosen in the viewport. Missing means the shot camera. */
  cameraOverride?: ShotCamera;
  colourOverrides?: Record<number, string | null>;
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error("The browser could not encode the render."));
        return;
      }
      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, "image/png");
  });
}

export async function renderShot(input: RenderShotInput): Promise<RenderedImage> {
  const { item, shot, kit, lighting, widthPx, heightPx } = input;
  const renderer = getExportRenderer();
  configureRenderer(renderer, lighting);
  const gl = renderer.getContext();
  const maxSide = Math.min(renderer.capabilities.maxTextureSize, gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number);
  const supersampleUsed = usableSupersample(input.supersample, widthPx, heightPx, maxSide);
  const warnings: string[] = [];
  if (supersampleUsed < input.supersample) {
    warnings.push(`This device can hold a render of ${maxSide} px at most, so supersampling was reduced from ${input.supersample} to ${supersampleUsed}.`);
  }

  const built = await buildShotContent({
    shot,
    background: item.background,
    models: input.models,
    textures: input.textures,
    pages: input.pages,
    colourOverrides: input.colourOverrides,
    limits: { maxTextureSizePx: renderer.capabilities.maxTextureSize, maxAnisotropy: renderer.capabilities.getMaxAnisotropy() },
    shadowResolution: 1024,
  });
  try {
    const scene = new THREE.Scene();
    scene.environment = await loadEnvironment(renderer, lighting, studioAssetUrl);
    scene.environmentIntensity = lighting.environmentIntensity;
    scene.add(built.content);

    const cameraSpec = input.cameraOverride ?? shot.camera;
    const camera = makeShotCamera(cameraSpec, widthPx / heightPx);

    renderer.setSize(Math.round(widthPx * supersampleUsed), Math.round(heightPx * supersampleUsed), false);
    built.prepare(renderer, scene);
    renderer.setRenderTarget(null);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);

    const canvas = document.createElement("canvas");
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser could not create a 2D canvas for the export.");
    paintBackground(ctx, widthPx, heightPx, item.background);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(renderer.domElement, 0, 0, widthPx, heightPx);
    await Promise.all([
      ensureFont(kit.fonts.headline.family, kit.fonts.headline.weight, kit.fonts.headline.fileStorageKey),
      ensureFont(kit.fonts.body.family, kit.fonts.body.weight, kit.fonts.body.fileStorageKey),
    ]);
    paintTextOverlay(ctx, widthPx, heightPx, item.text, shot.textLayout, kit);

    const surfaces = reportSurfaces(built, camera, widthPx, heightPx);
    for (const warning of built.warnings) warnings.push(warning);
    const png = await canvasToPng(canvas);
    return {
      item,
      png,
      widthPx,
      heightPx,
      supersampleUsed,
      framing: {
        widthPx,
        heightPx,
        camera: { position: [...cameraSpec.position], target: [...cameraSpec.target], fovDeg: cameraSpec.fovDeg },
        surfaces: surfaces.map((s) => ({ modelIndex: s.modelIndex, surfaceId: s.surfaceId, cornersPx: s.cornersPx })),
      },
      surfaces,
      renderer: describeRenderer(renderer),
      warnings,
    };
  } finally {
    built.dispose();
  }
}
