import { FlagToggle } from "@/components/admin/AdminClient";

export default function AdminFlags() {
  return (
    <div>
      <h2 className="text-xl font-semibold">Feature controls</h2>
      <p className="mt-2 text-sm text-slate-600">Turn a template, mockup, niche pack, platform pack, or AI feature on or off per plan or globally, without a deployment. A disabled item is hidden from sellers but kept in admin with its version history.</p>
      <div className="mt-4"><FlagToggle initial={[]} /></div>
    </div>
  );
}
