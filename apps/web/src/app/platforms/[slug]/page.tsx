import { notFound } from "next/navigation";
import { platformSeo } from "@/lib/seo-data";

export function generateStaticParams() {
  return [{ slug: "etsy" }];
}

export default function PlatformPage({ params }: { params: { slug: string } }) {
  const pack = platformSeo(params.slug);
  if (!pack) notFound();
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold text-brand-navy">Etsy listing photos for digital products</h1>
      <p className="mt-4 text-lg text-slate-600">Listing Photos Generator turns your real digital product into a complete Etsy listing pack: images, title, description, tags, and a pre publish checklist, without inventing anything about your product. Version 1 is Etsy only, digital products only.</p>
      <h2 className="mt-8 text-xl font-semibold">Etsy rules used in this pack</h2>
      <ul className="mt-2 list-disc pl-5 text-slate-600">
        <li>Listing photos at least {pack.image.recommended_shortest_side_px}px on the shortest side; export at {pack.export.shortest_side_px}px, {pack.export.format.toUpperCase()}, {pack.export.colour_profile}.</li>
        <li>First photo at least {pack.first_photo.min_px}px, horizontal or square, with no text overlays or collages on the first thumbnail.</li>
        <li>Up to {pack.image.max_images} photos and {pack.image.max_videos} videos per listing.</li>
        <li>Title up to {pack.title.max_chars} characters. Up to {pack.tags.max_count} tags, each up to {pack.tags.max_chars_each} characters.</li>
        <li>Digital files: up to {pack.digital.max_files} files, {pack.digital.max_file_size_mb_each} MB each, file names up to {pack.digital.file_name_max_chars} characters. No variations for digital items.</li>
      </ul>
      <p className="mt-4 text-slate-600">Pack version {pack.version}, status {pack.status}, checked {pack.verification.check_date} against the sources in docs/platform-rules.md. Unverified items are not used as generator limits: {pack.unverified.join("; ")}.</p>
      <h2 className="mt-8 text-xl font-semibold">Next step</h2>
      <p className="mt-2 text-slate-600">Upload your real product on the home page and export the Etsy pack yourself. There is no auto publishing.</p>
      <a href="/builder" className="mt-4 inline-block rounded bg-brand-gold px-5 py-2 font-medium text-brand-navy">Start a listing pack</a>
    </div>
  );
}
