import UploadCheckForm from "@/components/UploadCheckForm";
import {
  getEtsyPack,
  getNichePacks,
  getPlans,
  getSiteCopy,
} from "@/lib/config";

export default function HomePage() {
  const copy = getSiteCopy();
  const plans = getPlans();
  const niches = getNichePacks();
  const etsyPack = getEtsyPack();
  const freePlan = plans.plans.find((plan) => plan.slug === "free");
  const premiumPlan = plans.plans.find((plan) => plan.slug === "premium");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <section className="grid gap-8 md:grid-cols-2">
        <div>
          <h1 className="text-3xl font-bold leading-tight text-brand-navy">
            {copy.landing.heading}
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            {copy.landing.subheading}
          </p>
          <p className="mt-4 text-sm text-slate-600">
            Etsy export in version 1: {etsyPack.export.shortest_side_px}px on
            the shortest side, {etsyPack.export.format.toUpperCase()},{" "}
            {etsyPack.export.colour_profile}, up to {etsyPack.image.max_images}{" "}
            photos, title up to {etsyPack.title.max_chars} characters, up to{" "}
            {etsyPack.tags.max_count} tags.
          </p>
          <a
            href="/dashboard"
            className="mt-6 inline-block rounded bg-brand-gold px-5 py-2 font-medium text-brand-navy hover:opacity-90"
          >
            {copy.nav.dashboard}
          </a>
        </div>
        <div className="rounded border border-slate-200 p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            {copy.landing.uploadTitle}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {copy.landing.uploadHelp}
          </p>
          <div className="mt-6">
            <UploadCheckForm
              title={copy.landing.uploadTitle}
              help={copy.landing.uploadHelp}
              buttonLabel={copy.landing.uploadButton}
              note={copy.landing.uploadNote}
              labels={{
                name: copy.landing.nameLabel,
                namePlaceholder: copy.landing.namePlaceholder,
                format: copy.landing.formatLabel,
                price: copy.landing.priceLabel,
                pricePlaceholder: copy.landing.pricePlaceholder,
                currency: copy.landing.currencyLabel,
                features: copy.landing.featuresLabel,
                file: copy.landing.fileLabel,
              }}
              checklistTitle={copy.landing.checklistTitle}
              checklistNote={copy.landing.checklistNote}
            />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mt-16">
        <h2 className="text-2xl font-bold text-brand-navy">
          {copy.landing.stepsTitle}
        </h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-2">
          {copy.landing.steps.map((step, index) => (
            <li
              key={step.title}
              className="rounded border border-slate-200 p-5"
            >
              <p className="text-sm font-semibold text-brand-navy">
                Step {index + 1}: {step.title}
              </p>
              <p className="mt-2 text-slate-600">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="plans" className="mt-16">
        <h2 className="text-2xl font-bold text-brand-navy">
          {copy.landing.plansTitle}
        </h2>
        <p className="mt-2 text-slate-600">{copy.landing.plansNote}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {freePlan && (
            <div className="rounded border border-slate-200 p-5">
              <h3 className="text-lg font-semibold">{freePlan.name}</h3>
              <p className="mt-2 text-slate-600">
                {freePlan.entitlements.max_listing_packs} complete pack free,
                no watermark. Templates:{" "}
                {freePlan.entitlements.template_access}. Mockups:{" "}
                {freePlan.entitlements.mockup_access}. Exports:{" "}
                {freePlan.entitlements.export_formats.join(", ")}.
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Trial: {plans.trial.duration_days} days,{" "}
                {plans.trial.requires_card ? "card required" : "no card required"}
                , {plans.trial.one_per_account ? "one per account" : ""}.
              </p>
            </div>
          )}
          {premiumPlan && (
            <div className="rounded border border-slate-200 p-5">
              <h3 className="text-lg font-semibold">{premiumPlan.name}</h3>
              <p className="mt-2 text-slate-600">
                Price: not set yet. Templates:{" "}
                {premiumPlan.entitlements.template_access}. Mockups:{" "}
                {premiumPlan.entitlements.mockup_access}.
              </p>
              <p className="mt-2 text-sm text-slate-500">
                The premium price is decided by the owner. No price is shown
                until he sets one.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-bold text-brand-navy">
          {copy.landing.nichesTitle}
        </h2>
        <p className="mt-2 text-slate-600">{copy.landing.nichesNote}</p>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {niches.packs.map((pack) => (
            <li
              key={pack.slug}
              className="rounded border border-slate-200 p-5"
            >
              <h3 className="font-semibold">{pack.name}</h3>
              <p className="mt-2 text-sm text-slate-600">
                Last verified: {pack.last_verified_date}. Status: {pack.status}.
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Needs real product testing before AI use.
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
