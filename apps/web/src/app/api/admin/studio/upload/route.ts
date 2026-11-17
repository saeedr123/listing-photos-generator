// Admin upload of a studio asset: a GLB model, a texture, an HDRI or a
// font file. The file goes to object storage through the storage
// interface. For a GLB, the response lists the mesh and material names
// found in the file, so the admin can name the screen mesh.

import { createHash } from "node:crypto";
import { inspectGlb } from "@listing-photos-generator/mockup-engine/studio";
import { requireAdminApi } from "@/lib/admin-api";
import { contentTypeForKey, getStudioServer, jsonError } from "@/lib/studio-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const KINDS: Record<string, { prefix: string; extensions: string[] }> = {
  model: { prefix: "models", extensions: ["glb"] },
  texture: { prefix: "textures", extensions: ["jpg", "jpeg", "png", "webp"] },
  hdri: { prefix: "hdri", extensions: ["hdr"] },
  font: { prefix: "fonts", extensions: ["woff2", "woff", "ttf", "otf"] },
  thumbnail: { prefix: "thumbnails", extensions: ["png", "jpg", "jpeg", "webp"] },
};

export async function POST(request: Request): Promise<Response> {
  const admin = await requireAdminApi();
  if (!admin.ok) return admin.response;
  let studio;
  try {
    studio = getStudioServer();
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "The studio is not available.", 503);
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("The upload could not be read.", 400);
  }
  const file = form.get("file");
  const kindName = String(form.get("kind") ?? "");
  const kind = KINDS[kindName];
  if (!kind) return jsonError("Choose what kind of file this is: model, texture, hdri, font or thumbnail.", 400);
  if (!(file instanceof File)) return jsonError("Choose a file to upload.", 400);
  const extension = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!kind.extensions.includes(extension)) {
    return jsonError(`This file type is not accepted here. Accepted: ${kind.extensions.join(", ")}.`, 415);
  }
  if (file.size === 0) return jsonError("The file is empty.", 400);
  if (file.size > studio.config.upload.maxModelBytes) {
    return jsonError("The file is larger than the upload limit.", 413);
  }
  const data = new Uint8Array(await file.arrayBuffer());
  let glb = null;
  if (kindName === "model") {
    // Content check, not just the file name: the bytes must be a real GLB.
    glb = inspectGlb(data);
    if (!glb.valid) return jsonError(glb.error ?? "The model file could not be read.", 422);
  }
  const sha256 = createHash("sha256").update(data).digest("hex");
  const baseName = file.name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "file";
  const key = `${kind.prefix}/${sha256.slice(0, 16)}-${baseName}.${extension}`;
  try {
    const info = await studio.storage.put(key, data, { contentType: contentTypeForKey(key) });
    return Response.json({ ok: true, storageKey: info.key, bytes: info.bytes, sha256: info.sha256, glb, uploadedBy: admin.actor });
  } catch {
    return jsonError("The file could not be stored.", 500);
  }
}
