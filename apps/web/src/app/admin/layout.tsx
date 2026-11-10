import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminLoginUrl, decideAdminAccess, getCurrentAdminUser } from "@/lib/admin-gate";

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

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Server side gate. No resolver is passed yet: there is no server
  // login action setting the lpg_session cookie, and no generated
  // PrismaClient in this repo yet, so getCurrentAdminUser returns null
  // and the gate fails closed. When server login lands, pass an
  // AuthService built on PrismaAuthProvider here as the resolver; the
  // decision below does not change. Do not pass the demo store here:
  // it keeps its session in browser storage, which server code cannot
  // read and must not trust.
  const user = await getCurrentAdminUser(cookies(), null);
  const access = decideAdminAccess(user);
  if (!access.allowed && access.reason === "signed_out") {
    redirect(adminLoginUrl("/admin"));
  }
  if (!access.allowed) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-3xl font-bold text-brand-navy">Admin only</h1>
        <p className="mt-2 text-sm text-slate-600">This area is for administrators. You are signed in as {access.user?.email ?? "an unknown account"}, which does not have the admin role.</p>
        <p className="mt-2 text-sm text-slate-600">If you are an administrator, sign in with your admin account.</p>
        <div className="mt-4 flex gap-2">
          <Link href="/auth/login" className="rounded bg-brand-gold px-4 py-2 text-sm font-medium text-brand-navy hover:opacity-90">Sign in</Link>
          <Link href="/" className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">Back to home</Link>
        </div>
      </div>
    );
  }
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
