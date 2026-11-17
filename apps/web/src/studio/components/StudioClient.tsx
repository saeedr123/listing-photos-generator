"use client";

// Mockup Studio: upload a design, pick a style kit, look at it in 3D,
// see it in every shot, and export the ordered image set as a zip.
// The screen or sheet in every mockup is the uploaded design itself.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildKitVariantFromColours,
  extractDominantColours,
  planBatch,
  type BackgroundSpec,
  type BatchItem,
  type DominantColour,
  type LightingPreset,
  type ModelRegistryEntry,
  type ShotCamera,
  type ShotDefinition,
  type StudioConfig,
  type StudioExportSettings,
  type StyleKit,
  type TextureAsset,
} from "@listing-photos-generator/mockup-engine/studio";
import { BrowserRenderRunner } from "../browser-runner";
import { decodeDesignFile, type DesignPageImage } from "../engine/loaders";
import { exportSet, gateRenderedImage, type ExportSetResult } from "../export-set";
import { compareWithReference, toReferenceRender } from "../harness";
import { ShotViewport } from "./ShotViewport";

interface CatalogResponse {
  ok: boolean;
  error?: string;
  catalog: { models: ModelRegistryEntry[]; shots: ShotDefinition[]; kits: StyleKit[]; lighting: LightingPreset[]; textures: TextureAsset[] };
  exportSettings: StudioExportSettings;
  config: StudioConfig;
  storageProvider: string;
}

type BackgroundChoice = "kit" | "solid" | "gradient" | "desk-texture";

function backgroundFromChoice(choice: BackgroundChoice, kit: StyleKit, fallback: BackgroundSpec, textures: TextureAsset[]): BackgroundSpec {
  const first = kit.backgroundColours[0];
  const second = kit.backgroundColours[1] ?? first;
  if (choice === "solid") return { type: "solid", colour: first };
  if (choice === "gradient") return { type: "gradient", from: first, to: second, angleDeg: kit.background.type === "gradient" ? kit.background.angleDeg : 180 };
  if (choice === "desk-texture" && textures[0]) return { type: "desk-texture", textureId: textures[0].id, backdropColour: second };
  return fallback;
}

function downloadBytes(bytes: Uint8Array, name: string, type: string): void {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  const url = URL.createObjectURL(new Blob([copy], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function readPixels(page: DesignPageImage, maxSide: number): { data: Uint8ClampedArray; width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(page.widthPx, page.heightPx));
  const width = Math.max(1, Math.round(page.widthPx * scale));
  const height = Math.max(1, Math.round(page.heightPx * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("This browser could not read the design pixels.");
  ctx.drawImage(page.source, 0, 0, width, height);
  return { data: ctx.getImageData(0, 0, width, height).data, width, height };
}

export function StudioClient() {
  const [data, setData] = useState<CatalogResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pages, setPages] = useState<DesignPageImage[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [kitId, setKitId] = useState<string>("");
  const [useDesignColours, setUseDesignColours] = useState(false);
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const [cameraOverrides, setCameraOverrides] = useState<Record<string, ShotCamera>>({});
  const [colourOverrides, setColourOverrides] = useState<Record<string, Record<number, string | null>>>({});
  const [backgroundChoices, setBackgroundChoices] = useState<Record<string, BackgroundChoice>>({});
  const [viewportWarnings, setViewportWarnings] = useState<string[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [gridBusy, setGridBusy] = useState(false);
  const [exportState, setExportState] = useState<{ busy: boolean; message: string; error: string | null; result: ExportSetResult | null }>({ busy: false, message: "", error: null, result: null });
  const thumbnailUrls = useRef<string[]>([]);

  useEffect(() => {
    fetch("/api/studio/catalog")
      .then(async (response) => {
        const body = (await response.json()) as CatalogResponse;
        if (!response.ok || !body.ok) throw new Error(body.error ?? "The studio catalog could not be loaded.");
        setData(body);
        setKitId((current) => current || (body.catalog.kits[0]?.id ?? ""));
      })
      .catch((error: unknown) => setLoadError(error instanceof Error ? error.message : "The studio catalog could not be loaded."));
  }, []);

  const baseKit = useMemo(() => data?.catalog.kits.find((kit) => kit.id === kitId) ?? null, [data, kitId]);

  const designColours = useMemo<DominantColour[]>(() => {
    if (!data || pages.length === 0) return [];
    try {
      const pixels = readPixels(pages[0], 400);
      return extractDominantColours(pixels.data, pixels.width, pixels.height, data.config.colourExtraction).colours;
    } catch {
      return [];
    }
  }, [data, pages]);

  const kit = useMemo<StyleKit | null>(() => {
    if (!baseKit || !data) return null;
    if (useDesignColours && designColours.length > 0) {
      return buildKitVariantFromColours(baseKit, designColours, data.config.colourExtraction.variantTintAmount);
    }
    return baseKit;
  }, [baseKit, data, designColours, useDesignColours]);

  const plan = useMemo(() => {
    if (!data || !kit) return null;
    const planned = planBatch({
      kit,
      shots: data.catalog.shots,
      models: data.catalog.models,
      lighting: data.catalog.lighting,
      exportSettings: data.exportSettings,
      designPages: pages.map((page) => ({ id: page.id, widthPx: page.widthPx, heightPx: page.heightPx })),
      targets: data.config.batch,
      allowPreviewItems: data.config.catalog.includePreviewItems,
    });
    // A background picked in the viewport replaces the kit background for that shot.
    return {
      ...planned,
      items: planned.items.map((item) => ({
        ...item,
        background: backgroundFromChoice(backgroundChoices[item.shotId] ?? "kit", kit, item.background, data.catalog.textures),
      })),
    };
  }, [data, kit, pages, backgroundChoices]);

  const selectedItem: BatchItem | null = useMemo(() => {
    if (!plan || plan.items.length === 0) return null;
    return plan.items.find((item) => item.shotId === selectedShotId) ?? plan.items[0];
  }, [plan, selectedShotId]);
  const selectedShot = useMemo(() => (data && selectedItem ? data.catalog.shots.find((s) => s.id === selectedItem.shotId) ?? null : null), [data, selectedItem]);
  const selectedLighting = useMemo(() => (data && selectedShot ? data.catalog.lighting.find((l) => l.id === selectedShot.lightingPresetId) ?? null : null), [data, selectedShot]);

  const makeRunner = useCallback(
    (outputScale: number) => {
      if (!data || !kit) throw new Error("The studio is not ready.");
      return new BrowserRenderRunner({
        kit,
        shots: data.catalog.shots,
        models: data.catalog.models,
        lighting: data.catalog.lighting,
        textures: data.catalog.textures,
        pages,
        cameraOverrides,
        colourOverrides,
        outputScale,
      });
    },
    [data, kit, pages, cameraOverrides, colourOverrides],
  );

  const onFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || !data) return;
      setUploadError(null);
      const accepted = data.config.upload.designContentTypes;
      const list = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      const decoded: DesignPageImage[] = [];
      for (const [index, file] of list.entries()) {
        if (!accepted.includes(file.type)) {
          setUploadError(`${file.name} is not an accepted image type. Accepted: ${accepted.join(", ")}.`);
          return;
        }
        if (file.size > data.config.upload.maxDesignBytes) {
          setUploadError(`${file.name} is larger than the upload limit.`);
          return;
        }
        try {
          decoded.push(await decodeDesignFile(file, `page-${index + 1}`, file.name));
        } catch {
          setUploadError(`${file.name} could not be read as an image.`);
          return;
        }
      }
      setPages(decoded);
      setExportState({ busy: false, message: "", error: null, result: null });
    },
    [data],
  );

  const renderGrid = useCallback(async () => {
    if (!plan || !data) return;
    setGridBusy(true);
    for (const url of thumbnailUrls.current) URL.revokeObjectURL(url);
    thumbnailUrls.current = [];
    const next: Record<string, string> = {};
    try {
      const runner = makeRunner(0.25);
      for (const item of plan.items) {
        const rendered = await runner.renderItem(item, { supersample: 2 });
        const copy = new ArrayBuffer(rendered.png.byteLength);
        new Uint8Array(copy).set(rendered.png);
        const url = URL.createObjectURL(new Blob([copy], { type: "image/png" }));
        thumbnailUrls.current.push(url);
        next[item.shotId] = url;
        setThumbnails({ ...next });
      }
    } finally {
      setGridBusy(false);
    }
  }, [plan, data, makeRunner]);

  const runExport = useCallback(async () => {
    if (!plan || !data || !kit) return;
    setExportState({ busy: true, message: "Starting", error: null, result: null });
    try {
      const result = await exportSet({
        plan,
        kit,
        runner: makeRunner(1),
        exportSettings: data.exportSettings,
        config: data.config,
        onProgress: (progress) =>
          setExportState((state) => ({ ...state, message: `Image ${progress.position} of ${progress.total}: ${progress.stage === "done" ? "passed the export gate" : "rendering"}` })),
      });
      setExportState({ busy: false, message: `${plan.items.length} images exported.`, error: null, result });
      downloadBytes(result.zip, result.zipName, "application/zip");
    } catch (error) {
      setExportState({ busy: false, message: "", error: error instanceof Error ? error.message : "The export failed. Your design was not changed.", result: null });
    }
  }, [plan, data, kit, makeRunner]);

  // Test hook, used by the visual regression script. Only active with ?harness=1.
  useEffect(() => {
    if (typeof window === "undefined" || !new URLSearchParams(window.location.search).has("harness")) return;
    const hook = {
      ready: Boolean(data && kit),
      pageCount: pages.length,
      plan,
      renderItem: async (shotId: string, outputScale: number, supersample: number) => {
        if (!plan) throw new Error("No plan yet.");
        const item = plan.items.find((i) => i.shotId === shotId);
        if (!item) throw new Error(`Shot ${shotId} is not in the plan.`);
        const rendered = await makeRunner(outputScale).renderItem(item, { supersample });
        let binary = "";
        for (let i = 0; i < rendered.png.length; i += 0x8000) binary += String.fromCharCode(...rendered.png.subarray(i, i + 0x8000));
        return { pngBase64: btoa(binary), widthPx: rendered.widthPx, heightPx: rendered.heightPx, framing: rendered.framing, surfaces: rendered.surfaces, warnings: rendered.warnings, renderer: rendered.renderer, supersampleUsed: rendered.supersampleUsed };
      },
      referenceRender: async (shotId: string) => {
        if (!plan || !data) throw new Error("No plan yet.");
        const item = plan.items.find((i) => i.shotId === shotId);
        if (!item) throw new Error(`Shot ${shotId} is not in the plan.`);
        return toReferenceRender(await makeRunner(1).renderItem(item, { supersample: data.config.render.supersample }), data.config);
      },
      compareReference: async (shotId: string, referencePngBase64: string, referenceFraming: Parameters<typeof compareWithReference>[2]) => {
        if (!plan || !data) throw new Error("No plan yet.");
        const item = plan.items.find((i) => i.shotId === shotId);
        if (!item) throw new Error(`Shot ${shotId} is not in the plan.`);
        const rendered = await makeRunner(1).renderItem(item, { supersample: data.config.render.supersample });
        return compareWithReference(rendered, referencePngBase64, referenceFraming, data.config);
      },
      gateItem: async (shotId: string) => {
        if (!plan || !data) throw new Error("No plan yet.");
        const item = plan.items.find((i) => i.shotId === shotId);
        if (!item) throw new Error(`Shot ${shotId} is not in the plan.`);
        const rendered = await makeRunner(1).renderItem(item, { supersample: data.config.render.supersample });
        return gateRenderedImage(rendered);
      },
    };
    (window as unknown as { __lpgStudio?: typeof hook }).__lpgStudio = hook;
  }, [data, kit, pages, plan, makeRunner]);

  if (loadError) {
    return <p className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800" role="alert">{loadError}</p>;
  }
  if (!data) return <p className="text-sm text-slate-600">Loading the studio...</p>;

  const camera = selectedShot ? cameraOverrides[selectedShot.id] ?? selectedShot.camera : null;
  const selectedModels = selectedShot ? selectedShot.models.map((placement) => data.catalog.models.find((m) => m.id === placement.modelId) ?? null) : [];

  return (
    <div className="space-y-6">
      <section className="rounded border border-slate-200 p-4">
        <h2 className="text-lg font-semibold">1. Upload your design</h2>
        <p className="mt-1 text-sm text-slate-600">One image per page: PNG, JPG or WebP. The design is shown as it is. It is never stretched, recoloured, or cropped.</p>
        <input className="mt-3 block text-sm" type="file" accept={data.config.upload.designContentTypes.join(",")} multiple onChange={(event) => void onFiles(event.target.files)} data-testid="design-input" />
        {uploadError ? <p className="mt-2 text-sm text-red-700" role="alert">{uploadError}</p> : null}
        {pages.length > 0 ? (
          <ul className="mt-2 text-sm text-slate-700" data-testid="page-list">
            {pages.map((page, index) => (
              <li key={page.id}>Page {index + 1}: {page.name}, {page.widthPx} x {page.heightPx} px</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="rounded border border-slate-200 p-4">
        <h2 className="text-lg font-semibold">2. Style kit</h2>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <select className="rounded border border-slate-300 px-2 py-1" value={kitId} onChange={(event) => setKitId(event.target.value)} data-testid="kit-select">
            {data.catalog.kits.map((option) => (
              <option key={option.id} value={option.id}>{option.name} (version {option.version}, {option.status})</option>
            ))}
          </select>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={useDesignColours} disabled={designColours.length === 0} onChange={(event) => setUseDesignColours(event.target.checked)} data-testid="design-colours-toggle" />
            Use a variant built from the colours of my design
          </label>
        </div>
        {designColours.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600" data-testid="design-colours">
            <span>Colours found in page 1:</span>
            {designColours.map((colour) => (
              <span key={colour.hex} className="flex items-center gap-1">
                <span className="inline-block h-5 w-5 rounded border border-slate-300" style={{ background: colour.hex }} />
                {colour.hex}
              </span>
            ))}
            <span>These only change the background and accents. The design keeps its own colours.</span>
          </div>
        ) : null}
        {baseKit?.isPlaceholder ? <p className="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{baseKit.placeholderNote}</p> : null}
      </section>

      {plan ? (
        <section className="rounded border border-slate-200 p-4" data-testid="plan">
          <h2 className="text-lg font-semibold">3. Your image set</h2>
          {plan.errors.map((error) => <p key={error} className="mt-2 text-sm text-red-700" role="alert">{error}</p>)}
          {plan.warnings.map((warning) => <p key={warning} className="mt-2 rounded border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900">{warning}</p>)}
          {plan.skipped.length > 0 ? (
            <ul className="mt-2 text-sm text-slate-600">
              {plan.skipped.map((skip) => <li key={skip.shotId}>Left out: {skip.shotId}. {skip.reason}</li>)}
            </ul>
          ) : null}
          {plan.items.length > 0 ? (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button type="button" className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50 disabled:opacity-50" onClick={() => void renderGrid()} disabled={gridBusy} data-testid="grid-button">
                  {gridBusy ? "Rendering previews..." : "Preview this design in every shot"}
                </button>
                <button type="button" className="rounded bg-brand-gold px-4 py-1 text-sm font-medium text-brand-navy hover:opacity-90 disabled:opacity-50" onClick={() => void runExport()} disabled={exportState.busy || !plan.canExport} data-testid="export-button">
                  {exportState.busy ? "Exporting..." : `Export ${plan.items.length} images as a zip`}
                </button>
                <span className="text-sm text-slate-600" data-testid="export-status">{exportState.message}</span>
              </div>
              {exportState.error ? <p className="mt-2 text-sm text-red-700" role="alert" data-testid="export-error">{exportState.error}</p> : null}
              <p className="mt-2 text-xs text-slate-500">
                Each image is exported at {data.exportSettings.shortestSidePx} px on the shortest side as {data.exportSettings.format.toUpperCase()} in {data.exportSettings.colourProfile}, from the {data.exportSettings.platformId} pack, version {data.exportSettings.packVersion}. Nothing is published for you.
              </p>
              <ol className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5" data-testid="shot-grid">
                {plan.items.map((item) => (
                  <li key={item.shotId}>
                    <button type="button" onClick={() => { setSelectedShotId(item.shotId); setViewportWarnings([]); }} className={`block w-full rounded border p-1 text-left text-xs ${selectedItem?.shotId === item.shotId ? "border-brand-navy ring-2 ring-brand-gold" : "border-slate-200"}`}>
                      {thumbnails[item.shotId] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbnails[item.shotId]} alt={`Preview of image ${item.position}`} className="w-full rounded" />
                      ) : (
                        <span className="flex w-full items-center justify-center rounded bg-slate-100 text-slate-400" style={{ aspectRatio: `${item.widthPx} / ${item.heightPx}` }}>No preview yet</span>
                      )}
                      <span className="mt-1 block font-medium">{item.position}. {item.fileName}</span>
                      <span className="block text-slate-500">{item.widthPx} x {item.heightPx} px{item.warnings.length > 0 ? `, ${item.warnings.length} note${item.warnings.length === 1 ? "" : "s"}` : ""}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </>
          ) : null}
        </section>
      ) : null}

      {selectedItem && selectedShot && selectedLighting && camera && kit ? (
        <section className="rounded border border-slate-200 p-4">
          <h2 className="text-lg font-semibold">4. Look closer: {selectedShot.name}</h2>
          <p className="mt-1 text-sm text-slate-600">Drag to orbit, scroll to zoom, right drag to pan. The view you set here is the view that is exported.</p>
          <div className="mt-3 grid gap-4 lg:grid-cols-[2fr_1fr]">
            <ShotViewport
              shot={selectedShot}
              background={selectedItem.background}
              text={selectedItem.text}
              kit={kit}
              models={data.catalog.models}
              lighting={selectedLighting}
              textures={data.catalog.textures}
              pages={pages}
              camera={camera}
              colourOverrides={colourOverrides[selectedShot.id]}
              onCameraChange={(next) => setCameraOverrides((all) => ({ ...all, [selectedShot.id]: next }))}
              onWarnings={setViewportWarnings}
            />
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-medium">Camera</h3>
                <div className="mt-1 flex flex-wrap gap-2">
                  <button type="button" className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50" onClick={() => setCameraOverrides((all) => { const next = { ...all }; delete next[selectedShot.id]; return next; })}>Shot default</button>
                  {(selectedModels[0]?.cameraPresets ?? []).map((preset) => {
                    // Model presets are in the model own space. Shift them by where the shot places the model.
                    const offset = selectedShot.models[0].position;
                    return (
                      <button key={preset.id} type="button" className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50" onClick={() => setCameraOverrides((all) => ({ ...all, [selectedShot.id]: { position: [preset.position[0] + offset[0], preset.position[1] + offset[1], preset.position[2] + offset[2]], target: [preset.target[0] + offset[0], preset.target[1] + offset[1], preset.target[2] + offset[2]], fovDeg: preset.fovDeg } }))}>
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {selectedModels.map((model, modelIndex) =>
                model && model.colourOptions.length > 0 ? (
                  <div key={`${model.id}-${modelIndex}`}>
                    <h3 className="font-medium">{model.name} colour</h3>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {model.colourOptions.map((option) => {
                        const active = (colourOverrides[selectedShot.id]?.[modelIndex] ?? selectedShot.models[modelIndex].colourOptionId ?? model.defaultColourOptionId) === option.id;
                        return (
                          <button key={option.id} type="button" title={option.label} aria-label={option.label} aria-pressed={active} className={`flex items-center gap-1 rounded border px-2 py-1 ${active ? "border-brand-navy" : "border-slate-300"}`} onClick={() => setColourOverrides((all) => ({ ...all, [selectedShot.id]: { ...(all[selectedShot.id] ?? {}), [modelIndex]: option.id } }))}>
                            <span className="inline-block h-4 w-4 rounded-full border border-slate-300" style={{ background: option.colour }} />
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null,
              )}
              <div>
                <h3 className="font-medium">Background</h3>
                <select className="mt-1 rounded border border-slate-300 px-2 py-1" value={backgroundChoices[selectedShot.id] ?? "kit"} onChange={(event) => setBackgroundChoices((all) => ({ ...all, [selectedShot.id]: event.target.value as BackgroundChoice }))} data-testid="background-select">
                  <option value="kit">From the style kit</option>
                  <option value="solid">Solid, kit colour</option>
                  <option value="gradient">Gradient, kit colours</option>
                  {data.catalog.textures.length > 0 ? <option value="desk-texture">Desk texture</option> : null}
                </select>
              </div>
              {selectedItem.sellerNote ? <p className="rounded border border-amber-300 bg-amber-50 p-2 text-amber-900">{selectedItem.sellerNote}</p> : null}
              {[...selectedItem.warnings, ...viewportWarnings].filter((w, i, all) => all.indexOf(w) === i).map((warning) => (
                <p key={warning} className="rounded border border-amber-300 bg-amber-50 p-2 text-amber-900" data-testid="fit-warning">{warning}</p>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
