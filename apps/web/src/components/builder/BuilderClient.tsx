// Builder client: the six step guided flow. Cold start is step 1: upload
// the real product and confirm the facts, with guided prompts and a live
// preview. Autosave writes a new version on every save, so history is never
// overwritten. Export is gated on the reconciliation check, and the check
// is flag only: a mismatch shows the fix, the tool never fixes it itself.

"use client";

import { useEffect, useRef, useState } from "react";
import type { ListingPack, ReconciliationResult } from "@listing-photos-generator/builder/browser";
import {
  clearSampleContent,
  etsyPack,
  maidOfHonorFacts,
  mockupKinds,
  nichePacks,
  templateRoles,
  validateUpload,
} from "@listing-photos-generator/builder/browser";
import { isTitleWithinLimit, validateTags } from "@listing-photos-generator/shared";
import { siteCopy } from "../../config/site-copy";
import {
  createDemoShareLink,
  listDemoVersions,
  requestDemoExport,
  restoreDemoVersion,
  runDemoReconciliation,
  saveDemoPack,
} from "../../lib/demo-store";
import { Alert, Badge, Button, Card, Field, inputStyle, Stepper } from "../ui";
import { AiSuggestions } from "../ai/AiSuggestions";
import { LivePreview } from "./LivePreview";

const copy = siteCopy.builder;

export function BuilderClient(props: { pack: ListingPack; userId: string }) {
  const [pack, setPack] = useState<ListingPack>(props.pack);
  const [step, setStep] = useState(0);
  const [saveState, setSaveState] = useState("Saved");
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationResult | null>(null);
  const [sharePath, setSharePath] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [versions, setVersions] = useState(() => listDemoVersions(props.pack.id));
  const firstRender = useRef(true);

  // Autosave, debounced. Every save appends a new version.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSaveState(copy.autosaveSaving);
    const timer = setTimeout(() => {
      saveDemoPack(pack, props.userId, "Autosave, step " + (step + 1));
      setSaveState(copy.autosaveSaved);
      setVersions(listDemoVersions(pack.id));
    }, 800);
    return () => clearTimeout(timer);
  }, [pack, step, props.userId]);

  function updateFacts(patch: Partial<ListingPack["productFacts"]>) {
    setPack((prev) => ({ ...prev, productFacts: { ...prev.productFacts, ...patch } }));
  }

  function updateCopy(patch: Partial<ListingPack["copy"]>) {
    setPack((prev) => ({ ...prev, copy: { ...prev.copy, ...patch } }));
  }

  async function handleFiles(files: FileList | null) {
    if (!files) {
      return;
    }
    const errors: string[] = [];
    const nextFiles = [...pack.files];
    for (const file of Array.from(files)) {
      const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
      const result = validateUpload({ fileName: file.name, sizeBytes: file.size, mimeType: file.type, magicBytes: head });
      if (!result.ok) {
        errors.push(file.name + ": " + result.errors.join(" "));
        continue;
      }
      nextFiles.push({
        id: "demo-file-" + nextFiles.length + "-" + Date.now(),
        productId: pack.productId,
        storageKey: "demo:" + file.name,
        fileName: file.name,
        fileType: result.detectedType ?? "unknown",
        fileSizeBytes: file.size,
        widthPx: null,
        heightPx: null,
        pageCount: null,
        sourceKind: result.detectedType === "pdf" ? "sheet_pdf" : "screenshot",
        uploadedByUserId: props.userId,
        createdAt: new Date().toISOString(),
      });
    }
    setUploadErrors(errors);
    if (nextFiles.length !== pack.files.length) {
      setPack((prev) => ({ ...prev, files: nextFiles }));
    }
  }

  function toggleTemplate(roleId: string) {
    setPack((prev) => {
      const has = prev.templateIds.includes(roleId);
      const templateIds = has ? prev.templateIds.filter((id) => id !== roleId) : [...prev.templateIds, roleId];
      const images = templateIds.map((id, i) => ({
        id: "img-" + id,
        position: i + 1,
        imageRole: id,
        templateVersionId: id,
        mockupVersionId: prev.mockupIds[0] ?? null,
        productRenderId: null,
        orientation: "landscape" as const,
        fitWarning: null,
        qualityGateStatus: "not_checked" as const,
        qualityGateReason: null,
      }));
      return { ...prev, templateIds, images };
    });
  }

  function toggleMockup(kindId: string) {
    setPack((prev) => {
      const has = prev.mockupIds.includes(kindId);
      const mockupIds = has ? prev.mockupIds.filter((id) => id !== kindId) : [...prev.mockupIds, kindId];
      return { ...prev, mockupIds };
    });
  }

  function runCheck() {
    setReconciliation(runDemoReconciliation(pack));
  }

  function replaceSample() {
    const cleared = clearSampleContent(pack.copy, pack.productFacts);
    setPack((prev) => ({
      ...prev,
      copy: cleared.copy,
      productFacts: { ...cleared.facts, ...maidOfHonorFacts, productName: "", claims: [], features: [] },
      hasSampleContent: false,
    }));
  }

  function loadTestProduct() {
    setPack((prev) => ({
      ...prev,
      productFacts: { ...maidOfHonorFacts, claims: [], features: [] },
      copy: {
        ...prev.copy,
        title: "Maid of Honor Planner, 12 tabs, Google Sheets",
        description: "A 12 tab planner in Google Sheets.",
      },
      hasSampleContent: false,
    }));
  }

  function doExport() {
    const result = requestDemoExport(pack, props.userId, "full_pack");
    setReconciliation(result.reconciliation);
    setExportMessage(result.record.status === "queued" ? "Export queued. Download history is in the dashboard." : result.record.errorMessage ?? "Export failed.");
  }

  async function doShare() {
    const created = await createDemoShareLink(pack.id, props.userId, "review");
    setSharePath(created.path);
  }

  function restore(versionNumber: number) {
    const restored = restoreDemoVersion(pack.id, versionNumber, props.userId);
    if (restored) {
      setPack(restored);
      setVersions(listDemoVersions(pack.id));
    }
  }

  const facts = pack.productFacts;

  return (
    <div>
      <Stepper steps={copy.steps} current={step} />
      <p>
        {saveState} {pack.hasSampleContent ? <Badge tone="warning">{copy.sampleBadge}</Badge> : null}
      </p>

      {step === 0 ? (
        <Card title={copy.step1Heading}>
          <p>{copy.step1Task}</p>
          {pack.hasSampleContent ? (
            <Alert tone="warning">
              {copy.sampleBadge}: this pack uses sample content. <Button onClick={replaceSample}>{copy.replaceSampleButton}</Button>
            </Alert>
          ) : null}
          <Field label={copy.uploadLabel} help={copy.uploadHelp}>
            <input style={inputStyle} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => void handleFiles(e.target.files)} />
          </Field>
          {uploadErrors.map((error) => (
            <Alert key={error} tone="danger">
              {error}
            </Alert>
          ))}
          {pack.files.length > 0 ? (
            <ul>
              {pack.files.map((file) => (
                <li key={file.id}>
                  {file.fileName} ({file.fileType}, {file.fileSizeBytes} bytes)
                </li>
              ))}
            </ul>
          ) : null}
          <h3>{copy.factsHeading}</h3>
          <Field label="Product name">
            <input style={inputStyle} value={facts.productName} onChange={(e) => updateFacts({ productName: e.target.value })} />
          </Field>
          <Field label={copy.tabCountLabel}>
            <input
              style={inputStyle}
              type="number"
              value={facts.tabCount ?? ""}
              onChange={(e) => updateFacts({ tabCount: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
            />
          </Field>
          <Field label={copy.priceListLabel}>
            <input
              style={inputStyle}
              type="number"
              value={facts.priceListMinor ?? ""}
              onChange={(e) => updateFacts({ priceListMinor: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
            />
          </Field>
          <Field label={copy.priceLaunchLabel}>
            <input
              style={inputStyle}
              type="number"
              value={facts.priceLaunchMinor ?? ""}
              onChange={(e) => updateFacts({ priceLaunchMinor: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
            />
          </Field>
          <Field label={copy.currencyLabel}>
            <select style={inputStyle} value={facts.currency ?? ""} onChange={(e) => updateFacts({ currency: e.target.value === "" ? null : e.target.value })}>
              <option value="">Select</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </Field>
          <Field label={copy.formatLabel}>
            <select style={inputStyle} value={facts.format} onChange={(e) => updateFacts({ format: e.target.value as "Sheets" | "PDF" | "ZIP" | "Other", formatDetail: e.target.value })}>
              <option value="Sheets">Google Sheets</option>
              <option value="PDF">PDF</option>
              <option value="ZIP">ZIP</option>
              <option value="Other">Other</option>
            </select>
          </Field>
          <p>
            <Button onClick={loadTestProduct} variant="secondary">
              Load the Maid of Honor test product facts
            </Button>
          </p>
          <p style={{ fontSize: 13, color: "#6B7280" }}>Test product facts are task supplied, not independently rechecked against a live Etsy listing.</p>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card title={copy.step2Heading}>
          <p>Version 1 ships 3 niche packs only.</p>
          {nichePacks.map((niche) => (
            <div key={niche.id} style={{ border: "1px solid #E5E0DC", borderRadius: 10, padding: 12, marginBottom: 8 }}>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <input type="radio" name="niche" checked={pack.nichePackId === niche.id} onChange={() => setPack((prev) => ({ ...prev, nichePackId: niche.id }))} />
                <span>
                  <strong>{niche.name}</strong> {niche.needsRealProductTesting ? <Badge tone="warning">Needs real product testing</Badge> : null}
                  <br />
                  {niche.description}
                  <br />
                  <span style={{ fontSize: 13, color: "#6B7280" }}>{niche.toneGuidance}</span>
                </span>
              </label>
            </div>
          ))}
        </Card>
      ) : null}

      {step === 2 ? (
        <Card title={copy.step3Heading}>
          <h3>Templates</h3>
          {templateRoles.map((template) => (
            <label key={template.id} style={{ display: "block", marginBottom: 6 }}>
              <input type="checkbox" checked={pack.templateIds.includes(template.id)} onChange={() => toggleTemplate(template.id)} /> <strong>{template.name}</strong> {template.bestUse} ({template.allowedOrientations.join(", ")})
            </label>
          ))}
          <h3>Mockups</h3>
          <p style={{ fontSize: 13, color: "#6B7280" }}>Mockups are presentation frames. The screen inside is always your real product. Basic frames are labelled basic, never premium.</p>
          {mockupKinds.map((mockup) => (
            <label key={mockup.id} style={{ display: "block", marginBottom: 6 }}>
              <input type="checkbox" checked={pack.mockupIds.includes(mockup.id)} onChange={() => toggleMockup(mockup.id)} /> <strong>{mockup.name}</strong> {mockup.note}
            </label>
          ))}
        </Card>
      ) : null}

      {step === 3 ? (
        <Card title={copy.step4Heading}>
          <p>{copy.step4Help}</p>
          <Field label="Title (up to 140 characters)">
            <input style={inputStyle} value={pack.copy.title} maxLength={140} onChange={(e) => updateCopy({ title: e.target.value })} />
          </Field>
          <p style={{ fontSize: 13 }}>
            {pack.copy.title.length} / 140 characters
            {!isTitleWithinLimit(pack.copy.title, 140) ? " Title is over the Etsy limit." : ""}
          </p>
          {(() => {
            const tagCheck = validateTags(pack.copy.tags, 13, 20);
            return tagCheck.valid ? null : (
              <Alert tone="warning">{tagCheck.errors.join(" ")}</Alert>
            );
          })()}
          <Field label="Description">
            <textarea style={inputStyle} rows={5} value={pack.copy.description} onChange={(e) => updateCopy({ description: e.target.value })} />
          </Field>
          <Field label="Tags (up to 13, each up to 20 characters, comma separated)">
            <input style={inputStyle} value={pack.copy.tags.join(", ")} onChange={(e) => updateCopy({ tags: e.target.value.split(",").map((t) => t.trim()).filter((t) => t !== "") })} />
          </Field>
          <Field label="Claims shown on images (one per line, each must be a verified product fact)">
            <textarea
              style={inputStyle}
              rows={3}
              value={pack.copy.claimsShown.join("\n")}
              onChange={(e) => updateCopy({ claimsShown: e.target.value.split("\n").map((t) => t.trim()).filter((t) => t !== "") })}
            />
          </Field>
          <AiSuggestions
            facts={pack.productFacts}
            limits={{ titleMaxChars: etsyPack.titleMaxChars, tagMaxCount: etsyPack.tagMaxCount, tagMaxChars: etsyPack.tagMaxChars }}
            nichePack={(() => {
              const niche = nichePacks.find((entry) => entry.id === pack.nichePackId);
              return niche
                ? {
                    slug: niche.slug,
                    name: niche.name,
                    toneGuidance: niche.toneGuidance,
                    aiGenerationReady: niche.aiGenerationReady,
                    needsRealProductTesting: niche.needsRealProductTesting,
                  }
                : null;
            })()}
            onAccept={(patch) => updateCopy(patch)}
          />
        </Card>
      ) : null}

      {step === 4 ? (
        <div>
          <Button onClick={runCheck}>Run the product check</Button>
          <div style={{ marginTop: 16 }}>
            <LivePreview pack={pack} reconciliation={reconciliation} />
          </div>
        </div>
      ) : null}

      {step === 5 ? (
        <Card title={copy.step6Heading}>
          <p>{copy.shareHelp}</p>
          <p>
            <Button onClick={() => void doShare()}>{copy.shareButton}</Button>
          </p>
          {sharePath ? (
            <Alert tone="success">
              Share link created: {sharePath}. The plain link is shown once. The reviewer can view and comment, not edit.
            </Alert>
          ) : null}
          <p>
            <Button onClick={doExport} disabled={reconciliation !== null && !reconciliation.canExport}>
              {copy.exportButton}
            </Button>
          </p>
          {reconciliation !== null && !reconciliation.canExport ? <Alert tone="danger">{copy.exportBlocked}</Alert> : null}
          {exportMessage ? <Alert tone={exportMessage.includes("queued") ? "success" : "danger"}>{exportMessage}</Alert> : null}
          <h3>Version history</h3>
          {versions.length === 0 ? (
            <p>No versions yet.</p>
          ) : (
            <ol>
              {versions.map((version) => (
                <li key={version.id}>
                  Version {version.versionNumber}: {version.note} ({version.createdAt}){" "}
                  <Button variant="secondary" onClick={() => restore(version.versionNumber)}>
                    Restore
                  </Button>
                </li>
              ))}
            </ol>
          )}
        </Card>
      ) : null}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        {step > 0 ? (
          <Button variant="secondary" onClick={() => setStep(step - 1)}>
            {copy.backButton}
          </Button>
        ) : null}
        {step < 5 ? (
          <Button onClick={() => setStep(step + 1)}>{copy.nextButton}</Button>
        ) : null}
      </div>

      <div style={{ marginTop: 24 }}>
        <LivePreview pack={pack} reconciliation={reconciliation} />
      </div>
    </div>
  );
}
