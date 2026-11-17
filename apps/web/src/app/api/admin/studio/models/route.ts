// Admin model registry API. Every write is a new version in object
// storage. Nothing here needs a code change or a deploy: upload a GLB,
// name the screen mesh, set presets, preview, enable. Plus duplicate,
// edit, hide and roll back.

import {
  RegistryValidationError,
  inspectGlb,
  validateModelAddFlow,
  type ModelRegistryEntry,
  type StudioIssue,
} from "@listing-photos-generator/mockup-engine/studio-server";
import { requireAdminApi } from "@/lib/admin-api";
import { getStudioServer, jsonError } from "@/lib/studio-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const admin = await requireAdminApi();
  if (!admin.ok) return admin.response;
  try {
    const studio = getStudioServer();
    const models = await studio.registry.models.listLatest();
    const rows = [];
    for (const model of models) {
      const history = await studio.registry.models.history(model.id);
      const issues: StudioIssue[] = await studio.registry.modelIssues(model);
      const file = model.modelFile ? await studio.readAsset(model.modelFile.storageKey) : null;
      rows.push({ model, glb: file ? inspectGlb(file.data) : null, versions: history.map((h) => ({ version: h.version, status: h.status, changeNote: h.changeNote, updatedAt: h.updatedAt, updatedBy: h.updatedBy })), issues });
    }
    return Response.json({ ok: true, rows, storageProvider: studio.storage.providerName });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "The registry could not be read.", 503);
  }
}

interface ModelAction {
  action: "create" | "edit" | "duplicate" | "hide" | "publish" | "rollback" | "check";
  id?: string;
  entry?: ModelRegistryEntry;
  changes?: Partial<ModelRegistryEntry>;
  changeNote?: string;
  newId?: string;
  newName?: string;
  toVersion?: number;
}

export async function POST(request: Request): Promise<Response> {
  const admin = await requireAdminApi();
  if (!admin.ok) return admin.response;
  let body: ModelAction;
  try {
    body = (await request.json()) as ModelAction;
  } catch {
    return jsonError("The request is not valid JSON.", 400);
  }
  let studio;
  try {
    studio = getStudioServer();
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "The studio is not available.", 503);
  }
  const context = { actor: admin.actor, now: new Date().toISOString() };
  const registry = studio.registry;
  try {
    let model: ModelRegistryEntry;
    switch (body.action) {
      case "check": {
        if (!body.entry) return jsonError("Send the entry to check.", 400);
        const glb = body.entry.modelFile ? await studio.readAsset(body.entry.modelFile.storageKey) : null;
        const flow = validateModelAddFlow(body.entry, glb ? inspectGlb(glb.data) : null);
        return Response.json({ ok: true, flow });
      }
      case "create":
        if (!body.entry) return jsonError("Send the new entry.", 400);
        model = await registry.createModel(body.entry, context);
        break;
      case "edit":
        if (!body.id || !body.changes) return jsonError("Send the model id and the changes.", 400);
        model = await registry.editModel(body.id, body.changes, body.changeNote ?? "", context);
        break;
      case "duplicate":
        if (!body.id || !body.newId) return jsonError("Send the model id and an id for the copy.", 400);
        model = await registry.duplicateModel(body.id, body.newId, body.newName ?? "", context);
        break;
      case "hide":
        if (!body.id) return jsonError("Send the model id.", 400);
        model = await registry.hideModel(body.id, body.changeNote ?? "", context);
        break;
      case "publish":
        if (!body.id) return jsonError("Send the model id.", 400);
        model = await registry.publishModel(body.id, body.changeNote ?? "", context);
        break;
      case "rollback":
        if (!body.id || typeof body.toVersion !== "number") return jsonError("Send the model id and the version to go back to.", 400);
        model = await registry.rollbackModel(body.id, body.toVersion, body.changeNote ?? "", context);
        break;
      default:
        return jsonError("Unknown action.", 400);
    }
    return Response.json({ ok: true, model });
  } catch (error) {
    if (error instanceof RegistryValidationError) {
      return jsonError(error.message, 422, { issues: error.issues });
    }
    return jsonError(error instanceof Error ? error.message : "The change could not be saved.", 400);
  }
}
