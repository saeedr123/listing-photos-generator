"use client";

// Admin model registry. Adding a model needs no code change and no
// deploy: upload a GLB, name the screen mesh, set presets, preview it
// with a real render, enable it. Duplicate, edit, hide and roll back are
// version operations. Every save is a new version.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MODEL_CATEGORIES,
  hasApprovedHumanReview,
  validateModelEntry,
  type GlbInfo,
  type LightingPreset,
  type ModelCategory,
  type ModelRegistryEntry,
  type ModelSurface,
  type Orientation,
  type PremiumCriteria,
  type StyleKit,
  type ShotCamera,
  type ShotDefinition,
  type StudioIssue,
} from "@listing-photos-generator/mockup-engine/studio";
import { decodeDesignFile, studioAssetUrl, type DesignPageImage } from "../engine/loaders";
import { renderShot } from "../engine/render-shot";
import { ShotViewport } from "./ShotViewport";

interface Row {
  model: ModelRegistryEntry;
  glb: GlbInfo | null;
  versions: { version: number; status: string; changeNote: string; updatedAt: string; updatedBy: string }[];
  issues: StudioIssue[];
}

const CRITERIA: [keyof PremiumCriteria, string][] = [
  ["realisticPerspective", "Correct perspective and proportions"],
  ["realisticMaterialsAndEdges", "Realistic materials and edges"],
  ["softRealisticShadows", "Soft realistic shadows"],
  ["depth", "Depth that grounds the device in the scene"],
  ["lifestyleOrDeskScene", "A lifestyle or desk scene"],
  ["screenCrispAtExportSize", "Screen crisp and legible at export size"],
];

// A kit with no text, used only to render a preview thumbnail.
const THUMBNAIL_KIT = {
  fonts: { headline: { family: "serif", weight: 700, fileStorageKey: null, licence: null }, body: { family: "sans-serif", weight: 400, fileStorageKey: null, licence: null } },
  badge: { style: "none", wording: "", backgroundColour: "#000000", textColour: "#FFFFFF" },
  textColour: "#000000",
  accentColour: "#000000",
} as unknown as StyleKit;

const START_CAMERA: ShotCamera = { position: [0.3, 0.32, 0.6], target: [0, 0.08, 0], fovDeg: 30 };
const ORIENTATIONS: Orientation[] = ["landscape", "portrait", "square"];

function blankEntry(): ModelRegistryEntry {
  return {
    id: "",
    slug: "",
    name: "",
    category: "laptop",
    tags: [],
    renderer: "glb-3d",
    modelFile: null,
    legacyFrame: null,
    surfaces: [],
    allowedOrientations: [],
    cameraPresets: [],
    defaultCameraPresetId: null,
    colourOptions: [],
    defaultColourOptionId: null,
    previewThumbnail: null,
    licence: { source: "", licenceType: "", licenceDate: "", licenceStorageLocation: "", creator: "", notes: "" },
    unbrandedConfirmed: false,
    previewedWithRealRender: false,
    qualityLabel: "basic",
    premiumCriteria: { realisticPerspective: false, softRealisticShadows: false, depth: false, lifestyleOrDeskScene: false, realisticMaterialsAndEdges: false, screenCrispAtExportSize: false },
    humanReview: null,
    version: 1,
    status: "draft",
    previousVersion: null,
    changeNote: "",
    createdAt: "",
    updatedAt: "",
    updatedBy: "",
  };
}

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; error?: string; issues?: StudioIssue[]; [key: string]: unknown }> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return (await response.json()) as { ok: boolean; error?: string; issues?: StudioIssue[] };
}

const input = "rounded border border-slate-300 px-2 py-1 text-sm";
const button = "rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50 disabled:opacity-50";

export function ModelRegistryAdmin({ lighting }: { lighting: LightingPreset }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [storageProvider, setStorageProvider] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [draft, setDraft] = useState<ModelRegistryEntry | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [glb, setGlb] = useState<GlbInfo | null>(null);
  const [changeNote, setChangeNote] = useState("");
  const [previewPages, setPreviewPages] = useState<DesignPageImage[]>([]);
  const [camera, setCamera] = useState<ShotCamera>(START_CAMERA);
  const [viewportWarnings, setViewportWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<{ criteria: PremiumCriteria; decision: "approved" | "rejected"; approvedBy: string; note: string }>({
    criteria: { realisticPerspective: false, softRealisticShadows: false, depth: false, lifestyleOrDeskScene: false, realisticMaterialsAndEdges: false, screenCrispAtExportSize: false },
    decision: "approved",
    approvedBy: "",
    note: "",
  });

  const reload = useCallback(async () => {
    const response = await fetch("/api/admin/studio/models");
    const body = (await response.json()) as { ok: boolean; error?: string; rows: Row[]; storageProvider: string };
    if (!body.ok) {
      setMessage({ tone: "error", text: body.error ?? "The registry could not be read." });
      return;
    }
    setRows(body.rows);
    setStorageProvider(body.storageProvider);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const run = useCallback(
    async (body: Record<string, unknown>, done: string) => {
      setBusy(true);
      setMessage(null);
      try {
        const result = await postJson("/api/admin/studio/models", body);
        if (!result.ok) {
          setMessage({ tone: "error", text: result.error ?? "The change could not be saved." });
          return null;
        }
        // Refresh the list first, so the message never appears next to a stale row.
        await reload();
        setMessage({ tone: "ok", text: done });
        return result.model as ModelRegistryEntry;
      } finally {
        setBusy(false);
      }
    },
    [reload],
  );

  const startNew = () => {
    setDraft(blankEntry());
    setIsNew(true);
    setGlb(null);
    setChangeNote("");
    setPreviewPages([]);
    setCamera(START_CAMERA);
    setViewportWarnings([]);
    setMessage(null);
  };

  const startEdit = (row: Row) => {
    setDraft(JSON.parse(JSON.stringify(row.model)) as ModelRegistryEntry);
    setIsNew(false);
    setGlb(row.glb);
    setChangeNote("");
    setPreviewPages([]);
    const preset = row.model.cameraPresets.find((p) => p.id === row.model.defaultCameraPresetId) ?? row.model.cameraPresets[0];
    setCamera(preset ? { position: preset.position, target: preset.target, fovDeg: preset.fovDeg } : START_CAMERA);
    setViewportWarnings([]);
    setMessage(null);
  };

  const uploadModel = async (file: File | null) => {
    if (!file || !draft) return;
    setBusy(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.set("kind", "model");
      form.set("file", file);
      const response = await fetch("/api/admin/studio/upload", { method: "POST", body: form });
      const body = (await response.json()) as { ok: boolean; error?: string; storageKey: string; bytes: number; sha256: string; glb: GlbInfo };
      if (!body.ok) {
        setMessage({ tone: "error", text: body.error ?? "The upload failed." });
        return;
      }
      setGlb(body.glb);
      // A new file means the model must be previewed again.
      setDraft({ ...draft, modelFile: { storageKey: body.storageKey, bytes: body.bytes, sha256: body.sha256 }, previewedWithRealRender: false });
      setMessage({ tone: "ok", text: `Uploaded. Meshes found: ${body.glb.meshNodeNames.join(", ") || "none"}.` });
    } finally {
      setBusy(false);
    }
  };

  const update = (changes: Partial<ModelRegistryEntry>) => setDraft((current) => (current ? { ...current, ...changes } : current));
  const updateSurface = (index: number, changes: Partial<ModelSurface>) =>
    setDraft((current) => (current ? { ...current, surfaces: current.surfaces.map((s, i) => (i === index ? { ...s, ...changes } : s)) } : current));

  const previewEntry = useMemo<ModelRegistryEntry | null>(() => (draft && draft.modelFile ? { ...draft, id: draft.id || "draft-model" } : null), [draft]);
  const previewShot = useMemo<ShotDefinition | null>(() => {
    if (!previewEntry) return null;
    return {
      id: "admin-preview",
      slug: "admin-preview",
      name: "Admin preview",
      role: "custom",
      aspect: { w: 3, h: 2 },
      models: [{ modelId: previewEntry.id, position: [0, 0, 0], rotationDeg: [0, 0, 0], scale: 1, colourOptionId: previewEntry.defaultColourOptionId, surfacePages: Object.fromEntries(previewEntry.surfaces.map((s) => [s.id, 0])) }],
      camera,
      lightingPresetId: lighting.id,
      contactShadow: { enabled: true, opacity: 0.7, blur: 0.012, planeSizeMetres: 1.4, heightMetres: 0.3 },
      textLayout: { headline: null, bullets: null, badge: null },
      sellerNote: "",
      version: 1,
      status: "draft",
      previousVersion: null,
      changeNote: "",
      createdAt: "",
      updatedAt: "",
      updatedBy: "",
    };
  }, [previewEntry, camera, lighting.id]);

  const localIssues = draft ? validateModelEntry(draft) : [];

  const saveDraft = async () => {
    if (!draft) return;
    const entry = { ...draft, slug: draft.slug || draft.id };
    const saved = isNew
      ? await run({ action: "create", entry }, "Draft saved as version 1.")
      : await run({ action: "edit", id: entry.id, changes: { ...entry, status: entry.status === "published" ? "preview" : entry.status }, changeNote }, "Saved as a new version.");
    if (saved) {
      setDraft(saved);
      setIsNew(false);
      setChangeNote("");
    }
  };

  const recordReview = async () => {
    if (!draft) return;
    const saved = await run({ action: "review", id: draft.id, review }, "Review recorded as a new version.");
    if (saved) setDraft(saved);
  };

  const captureThumbnail = async () => {
    if (!draft || !previewShot || !previewEntry) return;
    setBusy(true);
    setMessage(null);
    try {
      const item = {
        position: 1,
        shotId: previewShot.id,
        shotVersion: 1,
        role: "custom",
        fileName: "01-thumbnail.png",
        widthPx: 600,
        heightPx: 400,
        background: { type: "solid" as const, colour: "#ECE8E1" },
        text: { headline: null, bullets: [], badge: null },
        surfaces: [],
        sellerNote: "",
        warnings: [],
      };
      const rendered = await renderShot({ item, shot: previewShot, kit: THUMBNAIL_KIT, models: [previewEntry], lighting, textures: [], pages: previewPages, widthPx: 600, heightPx: 400, supersample: 2 });
      const copy = new ArrayBuffer(rendered.png.byteLength);
      new Uint8Array(copy).set(rendered.png);
      const form = new FormData();
      form.set("kind", "thumbnail");
      form.set("file", new File([copy], `${draft.id || "model"}-thumbnail.png`, { type: "image/png" }));
      const response = await fetch("/api/admin/studio/upload", { method: "POST", body: form });
      const body = (await response.json()) as { ok: boolean; error?: string; storageKey: string };
      if (!body.ok) {
        setMessage({ tone: "error", text: body.error ?? "The thumbnail could not be stored." });
        return;
      }
      setDraft({ ...draft, previewThumbnail: { storageKey: body.storageKey } });
      setMessage({ tone: "ok", text: "Thumbnail captured. Save the model to keep it." });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "The thumbnail could not be rendered." });
    } finally {
      setBusy(false);
    }
  };

  const enable = async () => {
    if (!draft) return;
    const saved = await run({ action: "publish", id: draft.id, changeNote: changeNote || "Enabled." }, "Enabled. The model can now be used in shots and batch export.");
    if (saved) setDraft(saved);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">Storage provider: {storageProvider || "loading"}. Files and registry records go through the object storage interface. The local file provider is for development only.</p>
      {message ? <p className={`rounded border p-3 text-sm ${message.tone === "ok" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-red-300 bg-red-50 text-red-800"}`} role={message.tone === "error" ? "alert" : "status"} data-testid="admin-message">{message.text}</p> : null}

      <div>
        <button type="button" className="rounded bg-brand-gold px-4 py-2 text-sm font-medium text-brand-navy hover:opacity-90" onClick={startNew} data-testid="add-model">Add a model</button>
      </div>

      <ul className="space-y-3" data-testid="model-rows">
        {rows.map((row) => (
          <li key={row.model.id} className="rounded border border-slate-200 p-4 text-sm" data-model-id={row.model.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <strong>{row.model.name}</strong>{" "}
                <span className="text-slate-600">({row.model.id}, {row.model.category}, {row.model.renderer === "glb-3d" ? "3D model" : "2D fallback"}, version {row.model.version}, <span data-testid="row-status">{row.model.status}</span>, {row.model.qualityLabel})</span>
              </div>
              {row.model.renderer === "glb-3d" ? (
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={button} onClick={() => startEdit(row)}>Edit</button>
                  <button type="button" className={button} disabled={busy} onClick={() => { const newId = window.prompt("Id for the copy (lower case letters, digits, hyphens)"); if (newId) void run({ action: "duplicate", id: row.model.id, newId, newName: `${row.model.name} copy` }, "Duplicated as a draft."); }}>Duplicate</button>
                  <button type="button" className={button} disabled={busy} onClick={() => { const reason = window.prompt("Why is this model being hidden?"); if (reason) void run({ action: "hide", id: row.model.id, changeNote: reason }, "Hidden."); }}>Hide</button>
                  {row.versions.length > 1 ? (
                    <button type="button" className={button} disabled={busy} onClick={() => { const to = window.prompt(`Roll back to which version? Available: ${row.versions.slice(0, -1).map((v) => v.version).join(", ")}`); const reason = to ? window.prompt("Why?") : null; if (to && reason) void run({ action: "rollback", id: row.model.id, toVersion: Number(to), changeNote: reason }, "Rolled back as a new version, in preview."); }}>Roll back</button>
                  ) : null}
                </div>
              ) : null}
            </div>
            {row.model.previewThumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={studioAssetUrl(row.model.previewThumbnail.storageKey)} alt={`Preview of ${row.model.name}`} className="mt-2 w-48 rounded border border-slate-200" data-testid="row-thumbnail" />
            ) : null}
            <p className="mt-1 text-slate-600">Licence: source {row.model.licence.source || "not recorded"}, type {row.model.licence.licenceType || "not recorded"}, date {row.model.licence.licenceDate || "not recorded"}, stored at {row.model.licence.licenceStorageLocation || "not recorded"}.</p>
            <p className="mt-1 text-slate-600">Human review sign-off: {hasApprovedHumanReview(row.model.humanReview) ? "recorded" : "none recorded, so this model cannot be labelled premium"}.</p>
            <p className="mt-1 text-slate-600">Latest change: {row.model.changeNote}</p>
            {row.issues.length > 0 ? <ul className="mt-1 list-disc pl-5 text-red-700">{row.issues.map((issue) => <li key={issue.code + issue.message}>{issue.message}</li>)}</ul> : null}
          </li>
        ))}
      </ul>

      {draft ? (
        <section className="rounded border border-brand-navy p-4" data-testid="model-editor">
          <h3 className="text-lg font-semibold">{isNew ? "New model" : `Edit ${draft.name || draft.id}`}</h3>

          <h4 className="mt-4 font-medium">1. Upload a GLB</h4>
          <input className="mt-1 block text-sm" type="file" accept=".glb,model/gltf-binary" onChange={(event) => void uploadModel(event.target.files?.[0] ?? null)} data-testid="glb-input" />
          {draft.modelFile ? <p className="mt-1 text-xs text-slate-600">File: {draft.modelFile.storageKey}, {draft.modelFile.bytes} bytes. {glb && glb.imageCount > 0 ? `This file holds ${glb.imageCount} image texture(s). Check none of them is a logo.` : ""}</p> : null}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm">Id<input className={`${input} mt-1 block w-full`} value={draft.id} disabled={!isNew} onChange={(event) => update({ id: event.target.value, slug: event.target.value })} data-testid="model-id" /></label>
            <label className="text-sm">Name<input className={`${input} mt-1 block w-full`} value={draft.name} onChange={(event) => update({ name: event.target.value })} data-testid="model-name" /></label>
            <label className="text-sm">Category
              <select className={`${input} mt-1 block w-full`} value={draft.category} onChange={(event) => update({ category: event.target.value as ModelCategory })}>
                {MODEL_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label className="text-sm">Tags, comma separated<input className={`${input} mt-1 block w-full`} value={draft.tags.join(", ")} onChange={(event) => update({ tags: event.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} /></label>
          </div>

          <h4 className="mt-4 font-medium">2. Name the screen mesh</h4>
          {draft.surfaces.map((surface, index) => (
            <div key={index} className="mt-2 flex flex-wrap items-end gap-2 text-sm">
              <label>Mesh
                <select className={`${input} ml-1`} value={surface.meshName} onChange={(event) => updateSurface(index, { meshName: event.target.value })} data-testid="surface-mesh">
                  <option value="">Choose</option>
                  {(glb?.meshNodeNames ?? [surface.meshName]).map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </label>
              <label>Kind
                <select className={`${input} ml-1`} value={surface.kind} onChange={(event) => updateSurface(index, { kind: event.target.value as ModelSurface["kind"] })}>
                  <option value="screen">screen</option>
                  <option value="paper">paper</option>
                </select>
              </label>
              <label>Aspect, width divided by height<input className={`${input} ml-1 w-24`} type="number" step="0.0001" value={surface.aspect} onChange={(event) => updateSurface(index, { aspect: Number(event.target.value) })} data-testid="surface-aspect" /></label>
              <label>Page<input className={`${input} ml-1 w-16`} type="number" min={0} value={surface.pageSlot} onChange={(event) => updateSurface(index, { pageSlot: Number(event.target.value) })} /></label>
              <label>Letterbox<input className="ml-1 h-8 w-10 align-middle" type="color" value={surface.letterboxColour} onChange={(event) => updateSurface(index, { letterboxColour: event.target.value.toUpperCase() })} /></label>
              <button type="button" className={button} onClick={() => update({ surfaces: draft.surfaces.filter((_, i) => i !== index) })}>Remove</button>
            </div>
          ))}
          <button type="button" className={`${button} mt-2`} onClick={() => update({ surfaces: [...draft.surfaces, { id: draft.surfaces.length === 0 ? "screen" : `surface-${draft.surfaces.length + 1}`, meshName: "", kind: "screen", aspect: 1.6, pageSlot: draft.surfaces.length, letterboxColour: "#EEF0F2" }] })} data-testid="add-surface">Add a surface</button>

          <h4 className="mt-4 font-medium">3. Orientations, presets and colours</h4>
          <div className="mt-1 flex flex-wrap gap-4 text-sm">
            {ORIENTATIONS.map((orientation) => (
              <label key={orientation} className="flex items-center gap-1">
                <input type="checkbox" checked={draft.allowedOrientations.includes(orientation)} onChange={(event) => update({ allowedOrientations: event.target.checked ? [...draft.allowedOrientations, orientation] : draft.allowedOrientations.filter((o) => o !== orientation) })} data-testid={`orientation-${orientation}`} />
                {orientation}
              </label>
            ))}
          </div>
          <ul className="mt-2 space-y-1 text-sm">
            {draft.cameraPresets.map((preset) => (
              <li key={preset.id} className="flex flex-wrap items-center gap-2">
                <span>{preset.label} ({preset.id}){draft.defaultCameraPresetId === preset.id ? ", default" : ""}</span>
                <button type="button" className={button} onClick={() => setCamera({ position: preset.position, target: preset.target, fovDeg: preset.fovDeg })}>View</button>
                <button type="button" className={button} onClick={() => update({ defaultCameraPresetId: preset.id })}>Make default</button>
                <button type="button" className={button} onClick={() => update({ cameraPresets: draft.cameraPresets.filter((p) => p.id !== preset.id), defaultCameraPresetId: draft.defaultCameraPresetId === preset.id ? null : draft.defaultCameraPresetId })}>Remove</button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className={`${button} mt-2`}
            onClick={() => {
              const number = draft.cameraPresets.length + 1;
              const id = `view-${number}`;
              const round = (v: number) => Math.round(v * 10000) / 10000;
              const preset = { id, label: `View ${number}`, position: camera.position.map(round) as ShotCamera["position"], target: camera.target.map(round) as ShotCamera["target"], fovDeg: camera.fovDeg };
              update({ cameraPresets: [...draft.cameraPresets, preset], defaultCameraPresetId: draft.defaultCameraPresetId ?? id });
            }}
            data-testid="save-preset"
          >
            Save the current view as a preset
          </button>
          <div className="mt-3 text-sm">
            {draft.colourOptions.map((option, index) => (
              <div key={index} className="mt-1 flex flex-wrap items-center gap-2">
                <input className={`${input} w-32`} value={option.label} placeholder="Label" onChange={(event) => update({ colourOptions: draft.colourOptions.map((o, i) => (i === index ? { ...o, label: event.target.value, id: event.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || o.id } : o)) })} />
                <select className={input} value={option.materialName} onChange={(event) => update({ colourOptions: draft.colourOptions.map((o, i) => (i === index ? { ...o, materialName: event.target.value } : o)) })}>
                  <option value="">Material</option>
                  {(glb?.materialNames ?? [option.materialName]).map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
                <input type="color" value={option.colour} onChange={(event) => update({ colourOptions: draft.colourOptions.map((o, i) => (i === index ? { ...o, colour: event.target.value.toUpperCase() } : o)) })} />
                <button type="button" className={button} onClick={() => update({ defaultColourOptionId: option.id })}>{draft.defaultColourOptionId === option.id ? "Default" : "Make default"}</button>
                <button type="button" className={button} onClick={() => update({ colourOptions: draft.colourOptions.filter((_, i) => i !== index), defaultColourOptionId: draft.defaultColourOptionId === option.id ? null : draft.defaultColourOptionId })}>Remove</button>
              </div>
            ))}
            <button type="button" className={`${button} mt-2`} onClick={() => update({ colourOptions: [...draft.colourOptions, { id: `colour-${draft.colourOptions.length + 1}`, label: "", materialName: "", colour: "#C9CCD1" }] })}>Add a device colour</button>
          </div>

          <h4 className="mt-4 font-medium">4. Preview with a real product render</h4>
          <p className="text-xs text-slate-600">Upload a real product render, check the fit and sharpness in the view below, then tick the box. Drag to orbit.</p>
          <input className="mt-1 block text-sm" type="file" accept="image/png,image/jpeg,image/webp" onChange={async (event) => { const file = event.target.files?.[0]; if (file) setPreviewPages([await decodeDesignFile(file, "preview-page", file.name)]); }} data-testid="preview-input" />
          {previewShot && previewEntry ? (
            <div className="mt-2 max-w-2xl">
              <ShotViewport shot={previewShot} background={{ type: "solid", colour: "#ECE8E1" }} text={null} kit={null} models={[previewEntry]} lighting={lighting} textures={[]} pages={previewPages} camera={camera} onCameraChange={setCamera} onWarnings={setViewportWarnings} />
            </div>
          ) : <p className="mt-2 text-sm text-slate-500">Upload a GLB to see the preview.</p>}
          {viewportWarnings.map((warning) => <p key={warning} className="mt-2 rounded border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900" data-testid="preview-warning">{warning}</p>)}
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.previewedWithRealRender} disabled={previewPages.length === 0 && !draft.previewedWithRealRender} onChange={(event) => update({ previewedWithRealRender: event.target.checked })} data-testid="previewed-checkbox" />
            I previewed this model with a real product render and the fit and sharpness are right
          </label>
          <label className="mt-1 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.unbrandedConfirmed} onChange={(event) => update({ unbrandedConfirmed: event.target.checked })} data-testid="unbranded-checkbox" />
            This model shows no brand logo or trademark
          </label>

          <div className="mt-2 flex items-center gap-3">
            <button type="button" className={button} disabled={busy || !previewShot} onClick={() => void captureThumbnail()} data-testid="capture-thumbnail">Save the current view as the preview thumbnail</button>
            {draft.previewThumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={studioAssetUrl(draft.previewThumbnail.storageKey)} alt="Preview thumbnail" className="w-32 rounded border border-slate-200" data-testid="editor-thumbnail" />
            ) : null}
          </div>

          <h4 className="mt-4 font-medium">Licence record</h4>
          <div className="mt-1 grid gap-2 md:grid-cols-2">
            {(["source", "licenceType", "licenceDate", "licenceStorageLocation", "creator", "notes"] as const).map((field) => (
              <label key={field} className="text-sm">{field}<input className={`${input} mt-1 block w-full`} value={draft.licence[field]} onChange={(event) => update({ licence: { ...draft.licence, [field]: event.target.value } })} data-testid={`licence-${field}`} /></label>
            ))}
          </div>

          <h4 className="mt-4 font-medium">Quality label and human visual review</h4>
          <p className="text-xs text-slate-600">
            Label now: <strong data-testid="quality-label">{draft.qualityLabel}</strong>. A model becomes premium only when a person has looked at real renders at export size, every point below is met, and the owner approves. The review is recorded under your account as the reviewer. Save the model first: the review is stored as a new version of the saved model.
          </p>
          {draft.humanReview ? (
            <p className="mt-1 text-xs text-slate-600">Last review: {draft.humanReview.decision} by {draft.humanReview.reviewedBy}, approved by {draft.humanReview.approvedBy}, {draft.humanReview.reviewedAt}. {draft.humanReview.note}</p>
          ) : null}
          <div className="mt-2 grid gap-1 md:grid-cols-2">
            {CRITERIA.map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={review.criteria[key]} onChange={(event) => setReview((r) => ({ ...r, criteria: { ...r.criteria, [key]: event.target.checked } }))} data-testid={`criterion-${key}`} />
                {label}
              </label>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-end gap-3 text-sm">
            <label>Decision
              <select className={`${input} ml-1`} value={review.decision} onChange={(event) => setReview((r) => ({ ...r, decision: event.target.value as "approved" | "rejected" }))} data-testid="review-decision">
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
            <label>Approved by (the owner)
              <input className={`${input} ml-1`} value={review.approvedBy} onChange={(event) => setReview((r) => ({ ...r, approvedBy: event.target.value }))} data-testid="review-approver" />
            </label>
          </div>
          <label className="mt-2 block text-sm">What was reviewed, at what size, and what was seen
            <textarea className={`${input} mt-1 block w-full`} rows={2} value={review.note} onChange={(event) => setReview((r) => ({ ...r, note: event.target.value }))} data-testid="review-note" />
          </label>
          <button type="button" className={`${button} mt-2`} disabled={busy || isNew || !review.approvedBy.trim() || !review.note.trim()} onClick={() => void recordReview()} data-testid="record-review">Record the review</button>

          <h4 className="mt-4 font-medium">5. Save and enable</h4>
          {!isNew ? <label className="mt-1 block text-sm">Change note<input className={`${input} mt-1 block w-full`} value={changeNote} onChange={(event) => setChangeNote(event.target.value)} data-testid="change-note" /></label> : null}
          {localIssues.length > 0 ? <ul className="mt-2 list-disc pl-5 text-sm text-red-700" data-testid="editor-issues">{localIssues.map((issue) => <li key={issue.code + issue.message}>{issue.message}</li>)}</ul> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={button} disabled={busy || (!isNew && !changeNote.trim())} onClick={() => void saveDraft()} data-testid="save-model">{isNew ? "Save draft" : "Save as a new version"}</button>
            <button type="button" className="rounded bg-brand-gold px-4 py-1 text-sm font-medium text-brand-navy hover:opacity-90 disabled:opacity-50" disabled={busy || isNew} onClick={() => void enable()} data-testid="enable-model">Enable</button>
            <button type="button" className={button} onClick={() => setDraft(null)}>Close</button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
