import { notFound } from "next/navigation";
import { allTemplateSlugs, templateSeo } from "@/lib/seo-data";
import { getEtsyPack } from "@/lib/config";

export function generateStaticParams() {
  return allTemplateSlugs().map((slug) => ({ slug }));
}

export default function TemplatePage({ params }: { params: { slug: string } }) {
  const template = templateSeo(params.slug);
  if (!template) notFound();
  const etsy = getEtsyPack();
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold text-brand-navy">{template.name} template for Etsy listing photos</h1>
      <p className="mt-4 text-lg text-slate-600">Listing Photos Generator turns your real digital product into a complete Etsy listing pack with the {template.name} template: images, title, description, tags, and a pre publish checklist, without inventing anything about your product.</p>
      <h2 className="mt-8 text-xl font-semibold">What this template is for</h2>
      <p className="mt-2 text-slate-600">{template.bestUse}. It suits these niche packs: {template.nichePacks.join(", ")}.</p>
      <h2 className="mt-8 text-xl font-semibold">How it is built</h2>
      <p className="mt-2 text-slate-600">Version {template.version}, status {template.status}. Change note: {template.changeNote || "No change note recorded."} A template counts as distinct only when it differs in layout structure, section order, and typography system, not only in colour.</p>
      <h2 className="mt-8 text-xl font-semibold">Export with this template</h2>
      <p className="mt-2 text-slate-600">Etsy export in version 1: {etsy.export.shortest_side_px}px on the shortest side, {etsy.export.format.toUpperCase()}, {etsy.export.colour_profile}, title up to {etsy.title.max_chars} characters, up to {etsy.tags.max_count} tags. The reconciliation check runs before export: tab count, price, format, and claims must match the real product, or export is blocked.</p>
      <h2 className="mt-8 text-xl font-semibold">Next step</h2>
      <p className="mt-2 text-slate-600">Upload your real product on the home page, pick this template in the builder, and export the pack yourself. There is no auto publishing.</p>
      <a href="/builder" className="mt-4 inline-block rounded bg-brand-gold px-5 py-2 font-medium text-brand-navy">Start a listing pack</a>
    </div>
  );
}
