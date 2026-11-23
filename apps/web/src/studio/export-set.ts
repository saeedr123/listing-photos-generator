// Batch export: render every planned shot, pass each image through the
// export gate, and pack the results into one zip in listing order.

import { buildZip, type ZipEntry } from "@listing-photos-generator/export/zip";
import type {
  BatchPlan,
  RenderJobRunner,
  RenderProgress,
  RenderedImage,
  StudioConfig,
  StudioExportSettings,
  StyleKit,
} from "@listing-photos-generator/mockup-engine/studio";
import { checkSurfaceCrisp } from "@listing-photos-generator/mockup-engine/studio";

export interface GateResponse {
  ok: boolean;
  error?: string;
  fix?: string;
  fileName: string;
  widthPx: number;
  heightPx: number;
  shortestSidePx: number;
  format: string;
  colourProfile: string;
  iccProfile: string;
  iccProfileEmbedded: boolean;
  iccVerification: string;
  gate: { status: string; blocked: boolean; checks: { status: string; reason: string; fix: string }[] };
  jpgBase64: string;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Send one render through the server side export gate. Throws with the plain language reason when it is blocked. */
export async function gateRenderedImage(image: RenderedImage): Promise<GateResponse> {
  const form = new FormData();
  form.set("png", new Blob([toArrayBuffer(image.png)], { type: "image/png" }), "render.png");
  form.set(
    "meta",
    JSON.stringify({
      fileName: image.item.fileName,
      widthPx: image.widthPx,
      heightPx: image.heightPx,
      expectedWidthPx: image.item.widthPx,
      expectedHeightPx: image.item.heightPx,
      surfaces: image.surfaces,
    }),
  );
  const response = await fetch("/api/studio/gate", { method: "POST", body: form });
  // A host can refuse a large upload before the app sees it (Vercel
  // answers 413 with a body that is not JSON). Say so plainly.
  if (response.status === 413) {
    const megabytes = (image.png.byteLength / (1024 * 1024)).toFixed(1);
    throw new Error(
      `${image.item.fileName}: the rendered image is ${megabytes} MB, larger than the host accepts in one upload. Nothing was exported. Ask an admin: the export needs a direct upload to storage for images this large.`,
    );
  }
  let body: GateResponse;
  try {
    body = (await response.json()) as GateResponse;
  } catch {
    throw new Error(`${image.item.fileName}: the export gate answered with status ${response.status} and no readable result. Nothing was exported. Try again.`);
  }
  if (!response.ok || !body.ok) {
    throw new Error([body.error ?? "The image did not pass the export gate.", body.fix ? `Fix: ${body.fix}` : ""].filter(Boolean).join(" "));
  }
  return body;
}

export interface ExportSetResult {
  zip: Uint8Array;
  zipName: string;
  manifest: Record<string, unknown>;
}

export interface ExportSetInput {
  plan: BatchPlan;
  kit: StyleKit;
  runner: RenderJobRunner;
  exportSettings: StudioExportSettings;
  config: StudioConfig;
  onProgress?: (progress: RenderProgress) => void;
}

export async function exportSet(input: ExportSetInput): Promise<ExportSetResult> {
  const { plan, kit, runner, exportSettings, config } = input;
  if (!plan.canExport) throw new Error(`This set cannot be exported: ${plan.errors.join(" ")}`);
  const entries: ZipEntry[] = [];
  const images: Record<string, unknown>[] = [];
  let rendererInfo: unknown = null;
  const ordered = [...plan.items].sort((a, b) => a.position - b.position);
  for (const item of ordered) {
    input.onProgress?.({ position: item.position, total: ordered.length, shotId: item.shotId, stage: "rendering" });
    const rendered = await runner.renderItem(item, { supersample: config.render.supersample });
    const gated = await gateRenderedImage(rendered);
    entries.push({ name: item.fileName, data: base64ToBytes(gated.jpgBase64) });
    rendererInfo = rendered.renderer;
    images.push({
      position: item.position,
      fileName: item.fileName,
      shotId: item.shotId,
      shotVersion: item.shotVersion,
      widthPx: gated.widthPx,
      heightPx: gated.heightPx,
      shortestSidePx: gated.shortestSidePx,
      format: gated.format,
      colourProfile: gated.colourProfile,
      iccProfile: gated.iccProfile,
      iccProfileEmbedded: gated.iccProfileEmbedded,
      iccVerification: gated.iccVerification,
      supersampleUsed: rendered.supersampleUsed,
      camera: rendered.framing.camera,
      text: item.text,
      background: item.background,
      surfaces: rendered.surfaces.map((surface) => {
        const crisp = checkSurfaceCrisp({
          designWidthPx: surface.designWidthPx,
          designHeightPx: surface.designHeightPx,
          layout: surface.layout,
          projectedWidthPx: surface.projectedWidthPx,
          projectedHeightPx: surface.projectedHeightPx,
        });
        const planned = item.surfaces.find((s) => s.modelIndex === surface.modelIndex && s.surfaceId === surface.surfaceId);
        return {
          modelId: surface.modelId,
          modelVersion: planned ? planned.modelVersion : null,
          surfaceId: surface.surfaceId,
          designPageId: surface.designPageId,
          designWidthPx: surface.designWidthPx,
          designHeightPx: surface.designHeightPx,
          placedWidthPx: Math.round(crisp.placedWidthPx),
          placedHeightPx: Math.round(crisp.placedHeightPx),
          cornersPx: surface.cornersPx,
          fit: "contain, centred, no stretch, no crop, no recolour",
        };
      }),
      gateChecks: gated.gate.checks,
      warnings: [...item.warnings, ...rendered.warnings, ...rendered.surfaces.flatMap((s) => s.warnings)].filter((w, i, all) => all.indexOf(w) === i),
      sellerNote: item.sellerNote,
    });
    input.onProgress?.({ position: item.position, total: ordered.length, shotId: item.shotId, stage: "done" });
  }
  const generatedAt = new Date();
  const manifest: Record<string, unknown> = {
    generatedAt: generatedAt.toISOString(),
    platformId: exportSettings.platformId,
    packSlug: exportSettings.packSlug,
    packVersion: exportSettings.packVersion,
    styleKit: { id: kit.id, version: kit.version, variantOf: kit.variantOf, isPlaceholder: kit.isPlaceholder, status: kit.status },
    proofMode: plan.proofMode,
    proofReasons: plan.proofReasons,
    publishable: !plan.proofMode,
    images,
    skipped: plan.skipped,
    warnings: plan.warnings,
    renderer: rendererInfo,
    determinism: {
      referenceBrowser: config.determinism.referenceBrowser,
      note: "Same design, style kit and shot give the same camera, screen bounds and pixel size. Pixels match the reference render within the stated threshold in the reference browser. Byte identical output across GPUs is not claimed.",
      pixelDiff: config.determinism.pixelDiff,
    },
    autoPublish: false,
  };
  entries.push({ name: "manifest.json", data: new TextEncoder().encode(JSON.stringify(manifest, null, 2)) });
  const zip = buildZip(entries, generatedAt);
  const zipName = `${kit.slug.replace(/[^a-z0-9-]/g, "-")}-listing-set${plan.proofMode ? "-proof" : ""}.zip`;
  return { zip, zipName, manifest };
}
