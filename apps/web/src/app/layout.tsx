import type { Metadata } from "next";
import "./globals.css";
import { getSiteCopy } from "@/lib/config";

export const metadata: Metadata = {
  description:
    "Turn a real digital product into a complete Etsy listing pack: images, title, description, tags, and a pre publish checklist.",
  title: "Listing Photos Generator",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const copy = getSiteCopy();
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900">
        <header className="border-b border-slate-200">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <a href="/" className="text-lg font-bold text-brand-navy">
              {copy.brand.name}
            </a>
            <nav className="flex gap-6 text-sm">
              <a href="/#how-it-works">{copy.nav.howItWorks}</a>
              <a href="/#plans">{copy.nav.plans}</a>
              <a href="/dashboard">{copy.nav.dashboard}</a>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t border-slate-200">
          <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-slate-500">
            {copy.landing.footerNote}
          </div>
        </footer>
      </body>
    </html>
  );
}
