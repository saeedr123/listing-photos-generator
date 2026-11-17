// Admin style kit API. A style kit is edited as a whole document and
// stored as a new version. Roll back stores an older snapshot as a new
// version, so history is never overwritten.

import { RegistryValidationError, validateStyleKit, type StyleKit } from "@listing-photos-generator/mockup-engine/studio-server";
import { requireAdminApi } from "@/lib/admin-api";
import { getStudioServer, jsonError } from "@/lib/studio-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const admin = await requireAdminApi();
  if (!admin.ok) return admin.response;
  try {
    const studio = getStudioServer();
    const shots = await studio.registry.shots.listLatest();
    const textures = await studio.registry.textures.listLatest();
    const rows = [];
    for (const kit of await studio.registry.kits.listLatest()) {
      const history = await studio.registry.kits.history(kit.id);
      rows.push({
        kit,
        versions: history.map((h) => ({ version: h.version, status: h.status, changeNote: h.changeNote, updatedAt: h.updatedAt, updatedBy: h.updatedBy })),
        issues: validateStyleKit(kit, { shots, textures }),
      });
    }
    return Response.json({ ok: true, rows, shotIds: shots.map((s) => s.id), textureIds: textures.map((t) => t.id) });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "The style kits could not be read.", 503);
  }
}

interface KitAction {
  action: "save" | "rollback";
  kit?: StyleKit;
  changeNote?: string;
  id?: string;
  toVersion?: number;
}

export async function POST(request: Request): Promise<Response> {
  const admin = await requireAdminApi();
  if (!admin.ok) return admin.response;
  let body: KitAction;
  try {
    body = (await request.json()) as KitAction;
  } catch {
    return jsonError("The request is not valid JSON.", 400);
  }
  try {
    const studio = getStudioServer();
    const now = new Date().toISOString();
    if (body.action === "save") {
      if (!body.kit || !body.kit.id) return jsonError("Send the style kit.", 400);
      if (!body.changeNote || !body.changeNote.trim()) return jsonError("A new version needs a change note.", 400);
      const current = await studio.registry.kits.latest(body.kit.id);
      const kit = await studio.registry.saveKit({
        ...body.kit,
        version: current ? current.version + 1 : 1,
        previousVersion: current ? current.version : null,
        changeNote: body.changeNote.trim(),
        createdAt: current ? current.createdAt : now,
        updatedAt: now,
        updatedBy: admin.actor,
      });
      return Response.json({ ok: true, kit });
    }
    if (body.action === "rollback") {
      if (!body.id || typeof body.toVersion !== "number") return jsonError("Send the kit id and the version to go back to.", 400);
      const kit = await studio.registry.rollbackKit(body.id, body.toVersion, body.changeNote ?? "", { actor: admin.actor, now });
      return Response.json({ ok: true, kit });
    }
    return jsonError("Unknown action.", 400);
  } catch (error) {
    if (error instanceof RegistryValidationError) return jsonError(error.message, 422, { issues: error.issues });
    return jsonError(error instanceof Error ? error.message : "The change could not be saved.", 400);
  }
}
