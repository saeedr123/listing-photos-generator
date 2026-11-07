import Link from "next/link";

const links = [
  ["Overview", "/admin"],
  ["Users", "/admin/users"],
  ["Templates", "/admin/templates"],
  ["Mockups", "/admin/mockups"],
  ["AI prompts", "/admin/prompts"],
  ["Niche packs", "/admin/niche"],
  ["Platform packs", "/admin/platform"],
  ["Plans and trial", "/admin/plans"],
  ["Subscriptions", "/admin/subscriptions"],
  ["Analytics", "/admin/analytics"],
  ["Exports", "/admin/exports"],
  ["Feature flags", "/admin/flags"],
  ["System logs", "/admin/logs"],
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold text-brand-navy">Admin panel</h1>
      <p className="mt-2 text-sm text-slate-600">Admin only. This build uses an in memory store for local development; no live database is connected yet, and no change here writes to a live database. Every admin change is logged with time, actor, and action, without product content and without secrets.</p>
      <nav className="mt-4 flex flex-wrap gap-2 text-sm">
        {links.map(([label, href]) => (
          <Link key={href} href={href} className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-50">{label}</Link>
        ))}
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
