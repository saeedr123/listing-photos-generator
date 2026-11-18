// Studio catalog: what the mockup studio may use right now. Read only.

import { mayUsePremiumMockups } from "@/lib/plan-access";
import { requireSellerApi } from "@/lib/studio-api-auth";
import { getStudioServer, jsonError } from "@/lib/studio-server";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const access = await requireSellerApi("studio.catalog");
  if (!access.ok) return access.response;
  try {
    const studio = getStudioServer();
    const full = await studio.registry.catalog(studio.config.catalog.includePreviewItems);
    // Premium labelled models are for plans with full mockup access.
    // Shots that use one are left out with them.
    const premiumAccess = await mayUsePremiumMockups(access.user);
    const models = premiumAccess.allowed ? full.models : full.models.filter((model) => model.qualityLabel !== "premium");
    const shots = full.shots.filter((shot) => shot.models.every((placement) => models.some((model) => model.id === placement.modelId)));
    const catalog = { ...full, models, shots };
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
