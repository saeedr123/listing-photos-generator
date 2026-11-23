"use client";

// Admin style kits. A kit is edited as one document and saved as a new
// version with a change note. Roll back stores an older version again as
// a new version.

import { useCallback, useEffect, useState } from "react";
import type { StudioIssue, StyleKit } from "@listing-photos-generator/mockup-engine/studio";

interface Row {
  kit: StyleKit;
  versions: { version: number; status: string; changeNote: string; updatedAt: string; updatedBy: string }[];
  issues: StudioIssue[];
}

const button = "rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50 disabled:opacity-50";

export function StyleKitAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [shotIds, setShotIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [changeNote, setChangeNote] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const reload = useCallback(async () => {
    const response = await fetch("/api/admin/studio/kits");
    const body = (await response.json()) as { ok: boolean; error?: string; rows: Row[]; shotIds: string[] };
    if (!body.ok) {
      setMessage({ tone: "error", text: body.error ?? "The style kits could not be read." });
      return;
    }
    setRows(body.rows);
    setShotIds(body.shotIds);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const post = async (body: Record<string, unknown>, done: string) => {
    setMessage(null);
    const response = await fetch("/api/admin/studio/kits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = (await response.json()) as { ok: boolean; error?: string };
    if (!result.ok) {
      setMessage({ tone: "error", text: result.error ?? "The change could not be saved." });
      return false;
    }
    setMessage({ tone: "ok", text: done });
    await reload();
    return true;
  };

  const save = async () => {
    if (!editing) return;
    let kit: StyleKit;
    try {
      kit = JSON.parse(editing.text) as StyleKit;
    } catch {
      setMessage({ tone: "error", text: "The kit is not valid JSON. Check for a missing comma or quote." });
      return;
    }
    if (await post({ action: "save", kit, changeNote }, "Saved as a new version.")) {
      setEditing(null);
      setChangeNote("");
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Shots available for the ordered shot list: {shotIds.join(", ") || "none"}.</p>
      {message ? <p className={`rounded border p-3 text-sm ${message.tone === "ok" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-red-300 bg-red-50 text-red-800"}`} role={message.tone === "error" ? "alert" : "status"} data-testid="kit-message">{message.text}</p> : null}
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.kit.id} className="rounded border border-slate-200 p-4 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div><strong>{row.kit.name}</strong> <span className="text-slate-600">({row.kit.id}, version {row.kit.version}, {row.kit.status}{row.kit.isPlaceholder ? ", placeholder values" : ""})</span></div>
              <div className="flex gap-2">
                <button type="button" className={button} onClick={() => { setEditing({ id: row.kit.id, text: JSON.stringify(row.kit, null, 2) }); setChangeNote(""); }} data-testid="edit-kit">Edit</button>
                {row.versions.length > 1 ? (
                  <button type="button" className={button} onClick={() => { const to = window.prompt(`Roll back to which version? Available: ${row.versions.slice(0, -1).map((v) => v.version).join(", ")}`); const reason = to ? window.prompt("Why?") : null; if (to && reason) void post({ action: "rollback", id: row.kit.id, toVersion: Number(to), changeNote: reason }, "Rolled back as a new version."); }}>Roll back</button>
                ) : null}
              </div>
            </div>
            {row.kit.isPlaceholder ? <p className="mt-1 rounded border border-amber-300 bg-amber-50 p-2 text-amber-900">{row.kit.placeholderNote}</p> : null}
            <p className="mt-1 text-slate-600">Latest change: {row.kit.changeNote}</p>
            <p className="mt-1 text-slate-600">Shot order: {row.kit.shots.map((s) => s.shotId).join(", ")}.</p>
            {row.issues.length > 0 ? <ul className="mt-1 list-disc pl-5 text-red-700">{row.issues.map((issue) => <li key={issue.code + issue.message}>{issue.message}</li>)}</ul> : null}
          </li>
        ))}
      </ul>
      {editing ? (
        <section className="rounded border border-brand-navy p-4">
          <h3 className="text-lg font-semibold">Edit {editing.id}</h3>
          <p className="text-xs text-slate-600">Version, change note and dates are set when you save. A kit marked as placeholder cannot be published.</p>
          <textarea className="mt-2 block h-96 w-full rounded border border-slate-300 p-2 font-mono text-xs" value={editing.text} onChange={(event) => setEditing({ id: editing.id, text: event.target.value })} data-testid="kit-json" spellCheck={false} />
          <label className="mt-2 block text-sm">Change note<input className="mt-1 block w-full rounded border border-slate-300 px-2 py-1 text-sm" value={changeNote} onChange={(event) => setChangeNote(event.target.value)} data-testid="kit-change-note" /></label>
          <div className="mt-3 flex gap-2">
            <button type="button" className={button} disabled={!changeNote.trim()} onClick={() => void save()} data-testid="save-kit">Save as a new version</button>
            <button type="button" className={button} onClick={() => setEditing(null)}>Close</button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
