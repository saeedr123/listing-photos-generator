import { getNichePacks } from "@/lib/config";
import { checkPackGovernance } from "@listing-photos-generator/admin";
import { VersionManager } from "@/components/admin/AdminClient";

export default function AdminNiche() {
  const niches = getNichePacks();
  return (
    <div>
      <h2 className="text-xl font-semibold">Niche pack management</h2>
      <p className="mt-2 text-sm text-slate-600">Each pack shows source, last verified date, and reviewer. Out of date packs are flagged for review, never silently shown as current. A new niche is added only after its pack is researched, sourced, and tested with a real product in that niche.</p>
      <ul className="mt-4 space-y-3">
        {niches.packs.map((p) => {
          const check = checkPackGovernance({ id: p.slug, slug: p.slug, name: p.name, kind: "niche-pack", source: null, sourceNotes: p.source_notes, lastVerifiedDate: p.last_verified_date, reviewer: null, status: p.status }, 180, "2026-11-07");
          return (
            <li key={p.slug} className="rounded border border-slate-200 p-4">
              <strong>{p.name}</strong> <span className="text-sm text-slate-600">({p.status}, last verified {p.last_verified_date}, AI generation ready: {p.ai_generation_ready ? "yes" : "no"})</span>
              <p className="text-sm text-slate-600">Source notes: {p.source_notes}</p>
              <p className="text-sm text-slate-600">{check.needsReview ? "Flagged for review: " + check.reasons.join(" ") : "Governance check passed for the review interval used here."}</p>
              <VersionManager item={{ id: p.slug, kind: "niche-pack", slug: p.slug, name: p.name, version: 1, status: p.status === "active" ? "published" : "draft", changeNote: p.source_notes, previousVersion: null, createdBy: "admin", createdAt: "2026-11-07", publishedAt: null, publishedBy: null }} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
