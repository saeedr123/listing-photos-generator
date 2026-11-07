import { getEtsyPack } from "@/lib/config";
import { checkPackGovernance } from "@listing-photos-generator/admin";
import { VersionManager } from "@/components/admin/AdminClient";

export default function AdminPlatform() {
  const etsy = getEtsyPack();
  const check = checkPackGovernance({ id: "etsy", slug: etsy.slug, name: etsy.name, kind: "platform-pack", source: "docs/platform-rules.md", sourceNotes: "Checked 2026-11-05.", lastVerifiedDate: etsy.verification.check_date, reviewer: null, status: etsy.status }, 180, "2026-11-07");
  return (
    <div>
      <h2 className="text-xl font-semibold">Platform pack management</h2>
      <p className="mt-2 text-sm text-slate-600">Each platform is a versioned pack, not a code branch. Adding a platform is adding a pack, with preview, enable, disable, and rollback, without changing core or existing packs. Version 1 is Etsy only. eBay is second and Amazon is third, in later phases, not version 1.</p>
      <div className="mt-4 rounded border border-slate-200 p-4">
        <strong>{etsy.name}</strong> <span className="text-sm text-slate-600">(version {etsy.version}, {etsy.status}, last verified {etsy.verification.check_date})</span>
        <p className="text-sm text-slate-600">2000px shortest side, title up to {etsy.title.max_chars} characters, up to {etsy.tags.max_count} tags each up to {etsy.tags.max_chars_each} characters, {etsy.export.format.toUpperCase()}, {etsy.export.colour_profile}, up to {etsy.image.max_images} photos.</p>
        <p className="text-sm text-slate-600">Unverified items are marked unverified with no invented value: {etsy.unverified.join("; ")}.</p>
        <p className="text-sm text-slate-600">{check.needsReview ? "Flagged for review: " + check.reasons.join(" ") : "Governance check passed for the review interval used here."}</p>
        <VersionManager item={{ id: "etsy", kind: "platform-pack", slug: etsy.slug, name: etsy.name, version: etsy.version, status: etsy.status === "draft" ? "draft" : "published", changeNote: "Etsy digital v1, verified rules only, check date 2026-11-05.", previousVersion: null, createdBy: "admin", createdAt: "2026-11-07", publishedAt: null, publishedBy: null }} />
      </div>
      <p className="mt-4 text-sm text-slate-600">eBay and Amazon packs do not exist yet. They are added only after their rules are rechecked on official sources and recorded with a new check date.</p>
    </div>
  );
}
