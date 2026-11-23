import { StyleKitAdminLoader } from "@/studio/components/AdminStudioLoader";

export default function AdminStyleKits() {
  return (
    <div>
      <h2 className="text-xl font-semibold">Style kits</h2>
      <p className="mt-2 text-sm text-slate-600">
        A style kit holds the background colours, accent colour, fonts, badge, text slots and the ordered shot list for one shop. Every image reads from the kit. Each save is a new version, and an older version can be restored.
      </p>
      <div className="mt-4">
        <StyleKitAdminLoader />
      </div>
    </div>
  );
}
