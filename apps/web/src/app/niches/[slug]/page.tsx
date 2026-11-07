import { notFound } from "next/navigation";
import { allNicheSlugs, mockupsForNiche, nicheSeo } from "@/lib/seo-data";
import { getEtsyPack } from "@/lib/config";

export function generateStaticParams() {
  return allNicheSlugs().map((slug) => ({ slug }));
}

export default function NichePage({ params }: { params: { slug: string } }) {
  const niche = nicheSeo(params.slug);
  if (!niche) notFound();
  const etsy = getEtsyPack();
  const mockups = mockupsForNiche(params.slug);
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold text-brand-navy">{niche.name} listing photos for Etsy</h1>
      <p className="mt-4 text-lg text-slate-600">Listing Photos Generator turns a real {niche.name.toLowerCase()} product into a complete Etsy listing pack: images, title, description, tags, and a pre publish checklist, without inventing anything about your product.</p>
      <h2 className="mt-8 text-xl font-semibold">What this niche pack covers</h2>
      <p className="mt-2 text-slate-600">Source notes: {niche.source_notes} Last verified {niche.last_verified_date}. Status: {niche.status}. AI generation ready: {niche.ai_generation_ready ? "yes" : "no, this pack still needs testing with a real product in this niche before it is used for AI generation."}</p>
      <h2 className="mt-8 text-xl font-semibold">Mockups that suit this niche</h2>
      <ul className="mt-2 list-disc pl-5 text-slate-600">
        {mockups.map((m) => <li key={m.id}>{m.name} ({m.kind}, {m.qualityLabel}, crisp test {m.crispTestStatus}).</li>)}
      </ul>
      <h2 className="mt-8 text-xl font-semibold">Export</h2>
      <p className="mt-2 text-slate-600">Etsy export in version 1: {etsy.export.shortest_side_px}px on the shortest side, {etsy.export.format.toUpperCase()}, {etsy.export.colour_profile}, title up to {etsy.title.max_chars} characters, up to {etsy.tags.max_count} tags. Copy is generated only from your confirmed product facts.</p>
      <h2 className="mt-8 text-xl font-semibold">Next step</h2>
      <p className="mt-2 text-slate-600">Upload your real product on the home page, choose the {niche.name} niche pack, and build the pack in the builder.</p>
      <a href="/builder" className="mt-4 inline-block rounded bg-brand-gold px-5 py-2 font-medium text-brand-navy">Start a listing pack</a>
    </div>
  );
}
