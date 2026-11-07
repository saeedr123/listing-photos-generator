// Admin client interactions. All state here is held in the browser for
// this session; nothing here writes to a live database yet. Each action
// runs the same pure admin logic the server will run (versioning,
// licence gate, feature flags, entitlement validation), so the rules
// are tested in one place. A published item must not change without a
// version note, and a frame with no licence record must not be enabled.

"use client";

import { useState } from "react";
import { nextVersion, publishVersion, rollbackVersion } from "@listing-photos-generator/admin/browser";
import type { VersionedItem } from "@listing-photos-generator/admin/browser";
import { checkLicence, validateMockupAddFlow } from "@listing-photos-generator/admin/browser";
import { setFlag } from "@listing-photos-generator/admin/browser";
import type { FeatureFlag } from "@listing-photos-generator/admin/browser";
import { validatePlanChange, validateTrialChange } from "@listing-photos-generator/admin/browser";

export function VersionManager({ item }: { item: VersionedItem }) {
  const [current, setCurrent] = useState(item);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  return (
    <div className="mt-2 rounded border border-slate-200 p-3">
      <p className="text-sm">Version {current.version}, status {current.status}. {current.changeNote}</p>
      <label className="mt-2 block text-sm">
        Version note (required for any change)
        <input className="mt-1 block w-full rounded border border-slate-300 px-2 py-1" value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <div className="mt-2 flex gap-2">
        <button className="rounded bg-brand-gold px-3 py-1 text-sm font-medium text-brand-navy" onClick={() => { try { setCurrent(nextVersion(current, note, "admin")); setMessage("New draft version created."); } catch (e) { setMessage(e instanceof Error ? e.message : "Change failed."); } }}>New version</button>
        <button className="rounded border border-slate-300 px-3 py-1 text-sm" onClick={() => { try { setCurrent(publishVersion(current, "admin")); setMessage("Published."); } catch (e) { setMessage(e instanceof Error ? e.message : "Publish failed."); } }}>Publish</button>
        <button className="rounded border border-slate-300 px-3 py-1 text-sm" onClick={() => { try { setCurrent(rollbackVersion(current, item, "Rolled back from the admin panel.", "admin")); setMessage("Rolled back to a preview of the earlier version."); } catch (e) { setMessage(e instanceof Error ? e.message : "Rollback failed."); } }}>Rollback</button>
      </div>
      {message ? <p className="mt-2 text-sm text-slate-600">{message}</p> : null}
      <p className="mt-1 text-xs text-slate-500">Changes in this build are held in this session only. Database persistence needs a live database connection.</p>
    </div>
  );
}

export function MockupAddFlow() {
  const [frame, setFrame] = useState(false);
  const [screen, setScreen] = useState(false);
  const [orientations, setOrientations] = useState(false);
  const [niches, setNiches] = useState(false);
  const [preview, setPreview] = useState(false);
  const [licenceSource, setLicenceSource] = useState("");
  const [licenceType, setLicenceType] = useState("");
  const [licenceDate, setLicenceDate] = useState("");
  const [licenceLocation, setLicenceLocation] = useState("");
  const [crisp, setCrisp] = useState(false);
  const result = validateMockupAddFlow({
    frameUploaded: frame,
    screenAreaMarked: screen,
    orientationsSet: orientations,
    nichePacksSet: niches,
    previewedWithRealRender: preview,
    licence: licenceSource ? { source: licenceSource, licenceType: licenceType || null, licenceDate: licenceDate || null, licenceStorageLocation: licenceLocation || null } : null,
    qualityLabel: "basic",
    crispTestStatus: crisp ? "pass" : "not_tested",
  });
  const check = (label: string, value: boolean, onChange: (v: boolean) => void) => (
    <label className="block text-sm"><input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} /> {label}</label>
  );
  return (
    <div className="rounded border border-slate-200 p-4">
      <h2 className="text-lg font-semibold">Add a mockup, no code change and no deploy</h2>
      <div className="mt-2 space-y-1">
        {check("1. Upload a frame.", frame, setFrame)}
        {check("2. Mark the screen area.", screen, setScreen)}
        {check("3. Set allowed orientations.", orientations, setOrientations)}
        {check("4. Set niche packs.", niches, setNiches)}
        {check("5. Preview it with a real product render.", preview, setPreview)}
        {check("Crisp render test passed (contain fit, centred, no stretch, no colour change).", crisp, setCrisp)}
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <label className="text-sm">Licence source<input className="mt-1 block w-full rounded border border-slate-300 px-2 py-1" value={licenceSource} onChange={(e) => setLicenceSource(e.target.value)} /></label>
        <label className="text-sm">Licence type<input className="mt-1 block w-full rounded border border-slate-300 px-2 py-1" value={licenceType} onChange={(e) => setLicenceType(e.target.value)} /></label>
        <label className="text-sm">Licence date<input className="mt-1 block w-full rounded border border-slate-300 px-2 py-1" value={licenceDate} onChange={(e) => setLicenceDate(e.target.value)} placeholder="2026-11-07" /></label>
        <label className="text-sm">Where the licence is stored<input className="mt-1 block w-full rounded border border-slate-300 px-2 py-1" value={licenceLocation} onChange={(e) => setLicenceLocation(e.target.value)} /></label>
      </div>
      <p className="mt-3 text-sm font-medium">{result.readyToEnable ? "Ready to enable." : "Not ready to enable yet."}</p>
      <ul className="mt-1 list-disc pl-5 text-sm text-slate-600">{result.missingSteps.map((s) => <li key={s}>{s}</li>)}</ul>
      <p className="mt-2 text-sm text-slate-600">{checkLicence(result.licence.canEnable ? { source: licenceSource, licenceType: licenceType || null, licenceDate: licenceDate || null, licenceStorageLocation: licenceLocation || null } : null, "basic", crisp ? "pass" : "not_tested").message}</p>
    </div>
  );
}

export function FlagToggle({ initial }: { initial: FeatureFlag[] }) {
  const [flags, setFlags] = useState(initial);
  return (
    <div className="space-y-2">
      {flags.map((flag) => (
        <div key={flag.id} className="flex items-center justify-between rounded border border-slate-200 p-3 text-sm">
          <span>{flag.targetKind} {flag.targetId} ({flag.scope})</span>
          <button className="rounded border border-slate-300 px-3 py-1" onClick={() => setFlags(setFlag(flags, { targetKind: flag.targetKind, targetId: flag.targetId, scope: flag.scope, enabled: !flag.enabled, updatedBy: "admin" }))}>{flag.enabled ? "Enabled, turn off" : "Disabled, turn on"}</button>
        </div>
      ))}
      {flags.length === 0 ? <p className="text-sm text-slate-600">No flags set yet. Everything is enabled by default. Set a flag to turn an item off per plan or globally, without a deployment.</p> : null}
    </div>
  );
}

export function PlanEditor({ trialDays, trialCard, freePacks }: { trialDays: number; trialCard: boolean; freePacks: number | null }) {
  const [days, setDays] = useState(trialDays);
  const [card, setCard] = useState(trialCard);
  const [packs, setPacks] = useState(freePacks ?? 1);
  const [message, setMessage] = useState("");
  const trialIssues = validateTrialChange({ duration_days: days, requires_card: card, one_per_account: true, ai_credit_allowance: null, export_allowance: null, listing_pack_allowance: null });
  const planIssues = validatePlanChange({ slug: "free", name: "Free", price_amount_minor: null, price_currency: null, billing_interval: null, entitlements: { ai_credits_per_month: null, export_formats: ["jpg"], max_listing_packs: packs, max_storage_packs: null, mockup_access: "basic", template_access: "selected" } });
  return (
    <div className="rounded border border-slate-200 p-4">
      <label className="block text-sm">Trial duration in days<input type="number" className="mt-1 block w-32 rounded border border-slate-300 px-2 py-1" value={days} onChange={(e) => setDays(Number(e.target.value))} /></label>
      <label className="mt-2 block text-sm"><input type="checkbox" checked={card} onChange={(e) => setCard(e.target.checked)} /> Trial requires a card</label>
      <label className="mt-2 block text-sm">Free listing packs<input type="number" className="mt-1 block w-32 rounded border border-slate-300 px-2 py-1" value={packs} onChange={(e) => setPacks(Number(e.target.value))} /></label>
      <button className="mt-3 rounded bg-brand-gold px-3 py-1 text-sm font-medium text-brand-navy" onClick={() => { const issues = [...trialIssues, ...planIssues]; setMessage(issues.length === 0 ? "Valid. Save needs a live database connection; this build holds the change in this session only." : "Not valid: " + issues.join(" ")); }}>Check and save</button>
      {message ? <p className="mt-2 text-sm text-slate-600">{message}</p> : null}
      <p className="mt-2 text-sm text-slate-600">Price is not set here. Premium price is decided by the owner and is not set yet.</p>
    </div>
  );
}
