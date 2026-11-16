// Studio catalog: what the mockup studio may use right now. Read only.

import { getStudioServer, jsonError } from "@/lib/studio-server";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const studio = getStudioServer();
    const catalog = await studio.registry.catalog(studio.config.catalog.includePreviewItems);
    return Response.json({
      ok: true,
      catalog,
      exportSettings: studio.exportSettings,
      config: studio.config,
      storageProvider: studio.storage.providerName,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "The studio catalog could not be loaded.", 503);
  }
}
