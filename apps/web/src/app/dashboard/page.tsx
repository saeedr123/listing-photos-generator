// Dashboard. Seller profile, saved listing packs, pack history, templates,
// mockups, downloads, AI credits, subscription, and account settings.
// Data comes from the demo store in this build; production wiring replaces
// it with server reads against the database. Empty states stay honest:
// no counts are shown until real data exists.

"use client";

import { getPlans, getSiteCopy } from "@/lib/config";
import {
  getDemoSession,
  listDemoExports,
  listDemoPacks,
} from "@/lib/demo-store";
import { planConfig } from "@listing-photos-generator/builder/browser";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/packs", label: "Listing packs" },
  { href: "/dashboard/profile", label: "Seller profile" },
  { href: "/dashboard/settings", label: "Settings" },
  { href: "/builder?new=1", label: "New pack" },
];

export default function DashboardPage() {
  const copy = getSiteCopy();
  const plans = getPlans();
  const session = getDemoSession();
  const packs = session ? listDemoPacks(session.id) : [];
  const exports = packs.flatMap((pack) => listDemoExports(pack.id));
  const freePlan = plans.plans.find((plan) => plan.slug === "free");

  if (!session) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-bold text-brand-navy">{copy.dashboard.title}</h1>
        <p className="mt-2 text-slate-600">Sign in to see your dashboard.</p>
        <a href="/auth/login" className="mt-4 inline-block rounded bg-brand-gold px-4 py-2 text-sm font-medium text-brand-navy hover:opacity-90">
          Sign in
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold text-brand-navy">{copy.dashboard.title}</h1>
      <p className="mt-2 text-slate-600">
        {copy.dashboard.welcome} Signed in as {session.email}.
      </p>
      <div className="mt-8 grid gap-8 md:grid-cols-[200px_1fr]">
        <nav className="space-y-2">
          {NAV.map((item) => (
            <a key={item.label} href={item.href} className="block rounded px-3 py-2 text-sm hover:bg-slate-100">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="space-y-4">
          <section className="rounded border border-slate-200 p-5">
            <h2 className="font-semibold">{copy.dashboard.sections.listingPacks}</h2>
            {packs.length === 0 ? (
              <p className="mt-2 text-slate-600">{copy.dashboard.emptyPacks}</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {packs.map((pack) => (
                  <li key={pack.id} className="text-sm">
                    <a href={"/builder/" + pack.id} className="font-medium text-brand-navy underline">
                      {pack.productFacts.productName === "" ? "(Untitled pack)" : pack.productFacts.productName}
                    </a>{" "}
                    {pack.status}
                    {pack.hasSampleContent ? " Sample content" : ""}
                  </li>
                ))}
              </ul>
            )}
            <a href="/builder?new=1" className="mt-4 inline-block rounded bg-brand-gold px-4 py-2 text-sm font-medium text-brand-navy hover:opacity-90">
              Start a listing pack
            </a>
          </section>
          <section className="rounded border border-slate-200 p-5">
            <h2 className="font-semibold">{copy.dashboard.sections.exports}</h2>
            {exports.length === 0 ? (
              <p className="mt-2 text-slate-600">{copy.dashboard.emptyExports}</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {exports.map((record) => (
                  <li key={record.id} className="text-sm">
                    {record.exportKind} {record.fileFormat.toUpperCase()} {record.shortestSidePx}px {record.status} {record.createdAt}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="rounded border border-slate-200 p-5">
            <h2 className="font-semibold">{copy.dashboard.sections.credits}</h2>
            <p className="mt-2 text-slate-600">
              {freePlan?.entitlements.ai_credits_per_month === null
                ? "AI credit limit not set in admin yet."
                : "AI credits per month: " + String(freePlan?.entitlements.ai_credits_per_month)}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Free plan: {String(freePlan?.entitlements.max_listing_packs)} complete pack free, no watermark. Templates:{" "}
              {String(freePlan?.entitlements.template_access)}. Mockups: {String(freePlan?.entitlements.mockup_access)}.
            </p>
          </section>
          <section className="rounded border border-slate-200 p-5">
            <h2 className="font-semibold">{copy.dashboard.sections.subscription}</h2>
            <p className="mt-2 text-slate-600">
              Trial: {plans.trial.duration_days} days, {plans.trial.requires_card ? "card required" : "no card required"}, one per account.
              Price not set. No price is shown until the owner sets one.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Plan config in this build mirrors config/plans.json. Trial defaults: {planConfig.trial.durationDays} days, no card, one per account.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
