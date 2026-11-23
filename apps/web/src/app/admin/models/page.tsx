import { ModelRegistryAdminLoader } from "@/studio/components/AdminStudioLoader";
import { getStudioServer } from "@/lib/studio-server";

export const dynamic = "force-dynamic";

export default async function AdminModels() {
  let lighting = null;
  let error: string | null = null;
  try {
    const studio = getStudioServer();
    lighting = (await studio.registry.lighting.listLatest()).find((preset) => preset.status === "published") ?? null;
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "The studio is not available.";
  }
  return (
    <div>
      <h2 className="text-xl font-semibold">3D model registry</h2>
      <p className="mt-2 text-sm text-slate-600">
        Add a model with no code change and no deploy: upload a GLB, name the screen mesh, set presets, preview it with a real product render, then enable it. Every asset carries a licence record. A model with no complete licence record cannot be enabled. No model is called premium without a recorded human visual review sign-off.
      </p>
      <div className="mt-4">
        {error ? <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p> : null}
        {!error && !lighting ? <p className="text-sm text-red-700">No published lighting preset is available, so the preview cannot be shown.</p> : null}
        {lighting ? <ModelRegistryAdminLoader lighting={lighting} /> : null}
      </div>
    </div>
  );
}
