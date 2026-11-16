// Serves model, texture, HDRI and font files to the studio. Files come
// from the repository (builtin/ keys) or from object storage. Only asset
// prefixes are served. Registry documents and anything else are refused.

import { assertValidStorageKey } from "@listing-photos-generator/storage";
import { PUBLIC_ASSET_PREFIXES, getStudioServer, jsonError } from "@/lib/studio-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const key = new URL(request.url).searchParams.get("key") ?? "";
  try {
    assertValidStorageKey(key);
  } catch {
    return jsonError("That file key is not valid.", 400);
  }
  if (!PUBLIC_ASSET_PREFIXES.some((prefix) => key.startsWith(prefix))) {
    return jsonError("That file is not a studio asset.", 404);
  }
  try {
    const asset = await getStudioServer().readAsset(key);
    if (!asset) return jsonError("File not found.", 404);
    return new Response(asset.data as unknown as BodyInit, {
      headers: { "Content-Type": asset.contentType, "Content-Length": String(asset.data.byteLength), "Cache-Control": "no-cache" },
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "The file could not be read.", 503);
  }
}
