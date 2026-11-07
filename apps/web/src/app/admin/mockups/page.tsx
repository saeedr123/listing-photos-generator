import { listAdminMockups } from "@/lib/admin-data";
import { MockupAddFlow, VersionManager } from "@/components/admin/AdminClient";

export default function AdminMockups() {
  const mockups = listAdminMockups();
  return (
    <div>
      <h2 className="text-xl font-semibold">Mockup management</h2>
      <p className="mt-2 text-sm text-slate-600">A frame with no licence record must not be enabled. Each licensed frame shows source, licence type, licence date, and where the licence is stored.</p>
      <div className="mt-4"><MockupAddFlow /></div>
      <ul className="mt-4 space-y-3">
        {mockups.map((m) => (
          <li key={m.id} className="rounded border border-slate-200 p-4">
            <strong>{m.name}</strong> <span className="text-sm text-slate-600">({m.kind}, version {m.version}, {m.status}, {m.qualityLabel}, crisp test {m.crispTestStatus})</span>
            <p className="text-sm text-slate-600">Licence: source {m.licenceSource ?? "not recorded"}, type {m.licenceType ?? "not recorded"}, date {m.licenceDate ?? "not recorded"}, stored at {m.licenceStorageLocation ?? "not recorded"}.</p>
            <p className="text-sm text-slate-600">Niche packs: {m.nichePacks.join(", ") || "none recorded"}.</p>
            <VersionManager item={{ id: m.id, kind: "mockup", slug: m.slug, name: m.name, version: m.version, status: m.status as "draft" | "preview" | "published" | "retired", changeNote: "Starter mockup v1.", previousVersion: null, createdBy: "admin", createdAt: "2026-11-07", publishedAt: null, publishedBy: null }} />
          </li>
        ))}
      </ul>
    </div>
  );
}
