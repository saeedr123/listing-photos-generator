import { listAdminTemplates } from "@/lib/admin-data";
import { VersionManager } from "@/components/admin/AdminClient";

export default function AdminTemplates() {
  const templates = listAdminTemplates();
  return (
    <div>
      <h2 className="text-xl font-semibold">Template management</h2>
      <p className="mt-2 text-sm text-slate-600">Templates are admin managed, not hard coded. Every change creates a new version, with preview, publish, and rollback. A published template must not change silently for existing sellers without a version note.</p>
      <ul className="mt-4 space-y-3">
        {templates.map((t) => (
          <li key={t.id} className="rounded border border-slate-200 p-4">
            <strong>{t.name}</strong> <span className="text-sm text-slate-600">({t.role}, version {t.version}, {t.status})</span>
            <p className="text-sm text-slate-600">{t.bestUse} Niche packs: {t.nichePacks.join(", ") || "none recorded"}.</p>
            <VersionManager item={{ id: t.id, kind: "template", slug: t.slug, name: t.name, version: t.version, status: t.status as "draft" | "preview" | "published" | "retired", changeNote: t.changeNote, previousVersion: null, createdBy: "admin", createdAt: "2026-11-07", publishedAt: null, publishedBy: null }} />
          </li>
        ))}
      </ul>
    </div>
  );
}
