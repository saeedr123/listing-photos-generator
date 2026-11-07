import { adminOverview } from "@/lib/admin-data";
import { checkPackGovernance } from "@listing-photos-generator/admin";

export default function AdminOverview() {
  const data = adminOverview();
  const free = data.plans.plans.find((p: { slug: string }) => p.slug === "free");
  const premium = data.plans.plans.find((p: { slug: string }) => p.slug === "premium");
  const etsyGov = checkPackGovernance({ id: "etsy", slug: "etsy_digital_v1", name: "Etsy digital v1", kind: "platform-pack", source: "docs/platform-rules.md", sourceNotes: "Checked 2026-11-05.", lastVerifiedDate: "2026-11-05", reviewer: null, status: data.etsy.status }, 180, "2026-11-07");
  return (
    <div>
      <h2 className="text-xl font-semibold">Overview</h2>
      <ul className="mt-4 grid gap-3 md:grid-cols-3">
        <li className="rounded border border-slate-200 p-4"><strong>{data.templates.length} templates</strong><p className="text-sm text-slate-600">Version 1 set of 10, from the template engine definitions.</p></li>
        <li className="rounded border border-slate-200 p-4"><strong>{data.mockups.length} mockups</strong><p className="text-sm text-slate-600">Starter set of 5, from the mockup library definitions.</p></li>
        <li className="rounded border border-slate-200 p-4"><strong>{data.niches.packs.length} niche packs</strong><p className="text-sm text-slate-600">Wedding and events, personal finance, small business planners.</p></li>
        <li className="rounded border border-slate-200 p-4"><strong>Free: {free ? String((free as { entitlements: { max_listing_packs: number } }).entitlements.max_listing_packs) : "not set"} pack</strong><p className="text-sm text-slate-600">One complete, watermark free pack free. Premium price is not set yet.</p></li>
        <li className="rounded border border-slate-200 p-4"><strong>Trial: {data.plans.trial.duration_days} days, no card</strong><p className="text-sm text-slate-600">One trial per account. Change the rules in Plans and trial.</p></li>
        <li className="rounded border border-slate-200 p-4"><strong>Etsy pack: {data.etsy.status}</strong><p className="text-sm text-slate-600">2000px shortest side, JPG, sRGB. {etsyGov.needsReview ? "Flagged for review: " + etsyGov.reasons.join(" ") : "Governance check passed for the review interval used here."}</p></li>
      </ul>
      <p className="mt-4 text-sm text-slate-600">Users, subscriptions, AI usage, exports, and logs show honest empty states until a live database is connected. No counts are invented.</p>
      <p className="mt-2 text-sm text-slate-600">Premium price is {premium && (premium as { price_amount_minor: number | null }).price_amount_minor === null ? "not set. It is decided by the owner." : "set in config."}</p>
    </div>
  );
}
