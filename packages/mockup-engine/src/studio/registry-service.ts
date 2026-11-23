// Studio registry service: models, shots, style kits, lighting presets
// and textures as versioned documents in object storage, with the
// repository JSON files as read only seeds. Every write is a new
// version. The service validates before it stores, so a broken or
// unlicensed record can never go live.

import type { ObjectStorage } from "../../../storage/src/types.ts";
import { VersionedDocStore } from "../../../storage/src/versioned-docs.ts";
import type { GlbInfo } from "./glb-inspect.ts";
import {
  duplicateModel,
  editModel,
  hideModel,
  isUsableInShots,
  publishModel,
  rollbackModel,
  validateEntryAgainstGlb,
  validateModelEntry,
  type VersionContext,
} from "./model-registry.ts";
import { shotStatusUsable, validateShot } from "./shots.ts";
import { validateStyleKit } from "./style-kit.ts";
import type {
  LightingPreset,
  ModelRegistryEntry,
  ShotDefinition,
  StudioIssue,
  StyleKit,
  TextureAsset,
} from "./types.ts";
import { missingLicenceFields } from "./validate-common.ts";

export interface StudioSeeds {
  models: ModelRegistryEntry[];
  shots: ShotDefinition[];
  kits: StyleKit[];
  lighting: LightingPreset[];
  textures: TextureAsset[];
}

export interface StudioCatalog {
  models: ModelRegistryEntry[];
  shots: ShotDefinition[];
  kits: StyleKit[];
  lighting: LightingPreset[];
  textures: TextureAsset[];
}

export class RegistryValidationError extends Error {
  readonly issues: StudioIssue[];
  constructor(message: string, issues: StudioIssue[]) {
    super(message);
    this.name = "RegistryValidationError";
    this.issues = issues;
  }
}

export interface StudioRegistryOptions {
  storage: ObjectStorage;
  seeds: StudioSeeds;
  /** Reads the names inside a stored GLB, so enabling a model can check its mesh names. */
  inspectModelFile: (storageKey: string) => Promise<GlbInfo | null>;
}

export class StudioRegistry {
  readonly models: VersionedDocStore<ModelRegistryEntry>;
  readonly shots: VersionedDocStore<ShotDefinition>;
  readonly kits: VersionedDocStore<StyleKit>;
  readonly lighting: VersionedDocStore<LightingPreset>;
  readonly textures: VersionedDocStore<TextureAsset>;
  private readonly inspectModelFile: (storageKey: string) => Promise<GlbInfo | null>;

  constructor(options: StudioRegistryOptions) {
    const { storage, seeds } = options;
    this.models = new VersionedDocStore({ storage, collection: "registry/models", seeds: seeds.models });
    this.shots = new VersionedDocStore({ storage, collection: "registry/shots", seeds: seeds.shots });
    this.kits = new VersionedDocStore({ storage, collection: "registry/style-kits", seeds: seeds.kits });
    this.lighting = new VersionedDocStore({ storage, collection: "registry/lighting", seeds: seeds.lighting });
    this.textures = new VersionedDocStore({ storage, collection: "registry/textures", seeds: seeds.textures });
    this.inspectModelFile = options.inspectModelFile;
  }

  private async requireModel(id: string): Promise<ModelRegistryEntry> {
    const current = await this.models.latest(id);
    if (!current) throw new Error(`Model ${id} is not in the registry.`);
    return current;
  }

  /** Issues for one model, including the check against the real GLB file. */
  async modelIssues(entry: ModelRegistryEntry): Promise<StudioIssue[]> {
    const issues = validateModelEntry(entry);
    if (entry.renderer === "glb-3d" && entry.modelFile) {
      const glb = await this.inspectModelFile(entry.modelFile.storageKey);
      if (!glb) {
        issues.push({ code: "model-file-missing", message: `Model ${entry.id}: the model file is not in storage.` });
      } else {
        issues.push(...validateEntryAgainstGlb(entry, glb));
      }
    }
    return issues;
  }

  /**
   * Store a model version. A draft may be incomplete, because the add
   * flow saves it step by step. Any other status must be free of issues.
   */
  private async storeModel(next: ModelRegistryEntry): Promise<ModelRegistryEntry> {
    if (next.status !== "draft") {
      const issues = await this.modelIssues(next);
      if (issues.length > 0) {
        throw new RegistryValidationError(`Model ${next.id} cannot be saved as ${next.status}: ${issues.map((i) => i.message).join(" ")}`, issues);
      }
    } else if (next.qualityLabel === "premium") {
      const issues = validateModelEntry(next).filter((i) => i.code.startsWith("premium"));
      if (issues.length > 0) throw new RegistryValidationError(issues.map((i) => i.message).join(" "), issues);
    }
    return this.models.saveNewVersion(next);
  }

  async createModel(draft: ModelRegistryEntry, context: VersionContext): Promise<ModelRegistryEntry> {
    if (await this.models.latest(draft.id)) throw new Error(`Model id ${draft.id} is already used.`);
    return this.storeModel({
      ...draft,
      version: 1,
      previousVersion: null,
      status: "draft",
      createdAt: context.now,
      updatedAt: context.now,
      updatedBy: context.actor,
    });
  }

  async editModel(
    id: string,
    changes: Parameters<typeof editModel>[1],
    changeNote: string,
    context: VersionContext,
  ): Promise<ModelRegistryEntry> {
    return this.storeModel(editModel(await this.requireModel(id), changes, changeNote, context));
  }

  async duplicateModel(id: string, newId: string, newName: string, context: VersionContext): Promise<ModelRegistryEntry> {
    if (await this.models.latest(newId)) throw new Error(`Model id ${newId} is already used.`);
    return this.storeModel(duplicateModel(await this.requireModel(id), newId, newName, context));
  }

  async hideModel(id: string, reason: string, context: VersionContext): Promise<ModelRegistryEntry> {
    // Hiding must always work, even for a record with issues, so it is stored directly.
    return this.models.saveNewVersion(hideModel(await this.requireModel(id), reason, context));
  }

  async publishModel(id: string, changeNote: string, context: VersionContext): Promise<ModelRegistryEntry> {
    return this.storeModel(publishModel(await this.requireModel(id), changeNote, context));
  }

  async rollbackModel(id: string, toVersion: number, reason: string, context: VersionContext): Promise<ModelRegistryEntry> {
    const current = await this.requireModel(id);
    const older = await this.models.getVersion(id, toVersion);
    if (!older) throw new Error(`Model ${id} has no version ${toVersion}.`);
    return this.storeModel(rollbackModel(current, older, reason, context));
  }

  async saveShot(next: ShotDefinition): Promise<ShotDefinition> {
    const issues = validateShot(next, { models: await this.models.listLatest(), lighting: await this.lighting.listLatest() });
    if (issues.length > 0) throw new RegistryValidationError(issues.map((i) => i.message).join(" "), issues);
    return this.shots.saveNewVersion(next);
  }

  async saveKit(next: StyleKit): Promise<StyleKit> {
    const issues = validateStyleKit(next, { shots: await this.shots.listLatest(), textures: await this.textures.listLatest() });
    if (issues.length > 0) throw new RegistryValidationError(issues.map((i) => i.message).join(" "), issues);
    return this.kits.saveNewVersion(next);
  }

  /** Roll a style kit back by storing an older snapshot as a new version. */
  async rollbackKit(id: string, toVersion: number, reason: string, context: VersionContext): Promise<StyleKit> {
    if (!reason.trim()) throw new Error("A rollback needs a note that says why.");
    const current = await this.kits.latest(id);
    const older = await this.kits.getVersion(id, toVersion);
    if (!current || !older) throw new Error(`Style kit ${id} has no version ${toVersion}.`);
    if (older.version >= current.version) throw new Error("Rollback must go to an older version.");
    return this.saveKit({
      ...older,
      version: current.version + 1,
      previousVersion: current.version,
      status: older.status === "published" ? "preview" : older.status,
      changeNote: `Rollback to version ${older.version}: ${reason.trim()}`,
      updatedAt: context.now,
      updatedBy: context.actor,
    });
  }

  /**
   * What the studio may use: enabled 3D models, published shots that
   * validate, lighting and textures with a complete licence record, and
   * every style kit that is not hidden or retired. With includePreview,
   * models and shots in preview status are listed too. The batch plan
   * marks any set that uses one as a proof only.
   */
  async catalog(includePreview = false): Promise<StudioCatalog> {
    const allModels = await this.models.listLatest();
    const lighting = (await this.lighting.listLatest()).filter(
      (l) => l.status === "published" && missingLicenceFields(l.licence).length === 0,
    );
    const textures = (await this.textures.listLatest()).filter(
      (t) => t.status === "published" && missingLicenceFields(t.licence).length === 0,
    );
    const models: ModelRegistryEntry[] = [];
    for (const model of allModels) {
      if (!isUsableInShots(model, includePreview)) continue;
      if ((await this.modelIssues(model)).length > 0) continue;
      models.push(model);
    }
    const shots = (await this.shots.listLatest()).filter(
      (shot) => shotStatusUsable(shot, includePreview) && validateShot(shot, { models, lighting }).length === 0,
    );
    const allShots = await this.shots.listLatest();
    const kits = (await this.kits.listLatest()).filter(
      (kit) => kit.status !== "hidden" && kit.status !== "retired" && validateStyleKit(kit, { shots: allShots, textures }).length === 0,
    );
    return { models, shots, kits, lighting, textures };
  }
}
