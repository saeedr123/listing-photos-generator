import { VersionManager } from "@/components/admin/AdminClient";

const prompts = [
  { id: "title", slug: "title", name: "Title prompt", purpose: "title", version: 1, status: "draft" as const, note: "No prompt text is set yet. AI copy help is a parallel Wave 2 worker; prompts are managed here once that worker lands." },
  { id: "description", slug: "description", name: "Description prompt", purpose: "description", version: 1, status: "draft" as const, note: "No prompt text is set yet. Prompts must generate copy only from verified product facts." },
  { id: "tags", slug: "tags", name: "Tags prompt", purpose: "tags", version: 1, status: "draft" as const, note: "No prompt text is set yet. Tags must come from the seller's own product words." },
  { id: "checklist", slug: "checklist", name: "Checklist prompt", purpose: "checklist", version: 1, status: "draft" as const, note: "No prompt text is set yet." },
];

export default function AdminPrompts() {
  return (
    <div>
      <h2 className="text-xl font-semibold">AI prompt management</h2>
      <p className="mt-2 text-sm text-slate-600">AI prompts are managed in admin, versioned, and changeable without code changes. Every change creates a new version, with preview, publish, and rollback. No prompt text is invented here, and no AI provider is chosen yet.</p>
      <ul className="mt-4 space-y-3">
        {prompts.map((p) => (
          <li key={p.id} className="rounded border border-slate-200 p-4">
            <strong>{p.name}</strong> <span className="text-sm text-slate-600">({p.purpose}, version {p.version}, {p.status})</span>
            <p className="text-sm text-slate-600">{p.note}</p>
            <VersionManager item={{ id: p.id, kind: "prompt", slug: p.slug, name: p.name, version: p.version, status: p.status, changeNote: p.note, previousVersion: null, createdBy: "admin", createdAt: "2026-11-07", publishedAt: null, publishedBy: null }} />
          </li>
        ))}
      </ul>
    </div>
  );
}
