import { getPlans } from "@/lib/config";
import { PlanEditor } from "@/components/admin/AdminClient";

export default function AdminPlans() {
  const plans = getPlans();
  return (
    <div>
      <h2 className="text-xl font-semibold">Free and premium entitlements and trial configuration</h2>
      <p className="mt-2 text-sm text-slate-600">Plan limits and trial rules live in config, not in code. Change them here without rewriting the application. Price is not decided: premium price is null in config until the owner sets it.</p>
      <ul className="mt-4 space-y-3">
        {plans.plans.map((p) => (
          <li key={p.slug} className="rounded border border-slate-200 p-4">
            <strong>{p.name}</strong>
            <p className="text-sm text-slate-600">Price: {p.price_amount_minor === null ? "not set" : String(p.price_amount_minor)} {p.price_currency ?? ""}. Maximum listing packs: {p.entitlements.max_listing_packs ?? "no limit set"}. Templates: {p.entitlements.template_access}. Mockups: {p.entitlements.mockup_access}. AI credits per month: {p.entitlements.ai_credits_per_month ?? "not set"}. Export formats: {p.entitlements.export_formats.join(", ")}.</p>
          </li>
        ))}
      </ul>
      <div className="mt-4"><PlanEditor trialDays={plans.trial.duration_days} trialCard={plans.trial.requires_card} freePacks={plans.plans.find((p) => p.slug === "free")?.entitlements.max_listing_packs ?? null} /></div>
      <p className="mt-2 text-sm text-slate-600">Trial: {plans.trial.duration_days} days, {plans.trial.requires_card ? "card required" : "no card required"}, {plans.trial.one_per_account ? "one per account" : "trial limit not set to one per account"}. AI credit, export, and listing pack allowances are not set yet.</p>
    </div>
  );
}
