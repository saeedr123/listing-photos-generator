// Scene builder for one shot. Plain three.js, no React, so the live
// preview and the export render build exactly the same scene.
//
// A shot is model(s) plus camera plus lighting plus background. The
// builder loads each GLB, places it, applies the device colour, and puts
// the seller design on each named surface mesh. The design is shown with
// an unlit material that skips tone mapping, so its colours reach the
// output unchanged.

import * as THREE from "three";
import {
  computeSurfaceTextureLayout,
  measureUvAspect,
  surfaceAspectMismatch,
  uvBounds,
  type BackgroundSpec,
  type ModelRegistryEntry,
  type ModelSurface,
  type RenderedSurfaceReport,
  type ShotCamera,
  type ShotDefinition,
  type SurfaceTextureLayout,
  type TextureAsset,
} from "@listing-photos-generator/mockup-engine/studio";
import { ContactShadow } from "./contact-shadow";
import { loadGlb, loadImage, studioAssetUrl, type DesignPageImage } from "./loaders";

export interface GpuLimits {
  maxTextureSizePx: number;
  maxAnisotropy: number;
}

export interface ShotSceneInput {
  shot: ShotDefinition;
  background: BackgroundSpec;
  models: ModelRegistryEntry[];
  textures: TextureAsset[];
  pages: DesignPageImage[];
  /** Device colour per model index. Missing entries use the shot, then the model default. */
  colourOverrides?: Record<number, string | null>;
  limits: GpuLimits;
  shadowResolution: number;
}

export interface BuiltSurface {
  modelIndex: number;
  modelId: string;
  surface: ModelSurface;
  meshes: THREE.Mesh[];
  page: DesignPageImage | null;
  layout: SurfaceTextureLayout | null;
  measuredAspect: number | null;
  warnings: string[];
}

export interface BuiltShot {
  /** Everything in the shot: models, ground and shadow plane. Add it to a scene. */
  content: THREE.Group;
  ground: THREE.Mesh | null;
  contactShadow: ContactShadow;
  surfaces: BuiltSurface[];
  warnings: string[];
  /** Draw the contact shadow. Call after content is in the scene. */
  prepare(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void;
  dispose(): void;
}

const DEG = Math.PI / 180;
const GROUND_SIZE_METRES = 8;

export function makeShotCamera(camera: ShotCamera, aspect: number): THREE.PerspectiveCamera {
  const result = new THREE.PerspectiveCamera(camera.fovDeg, aspect, 0.01, 50);
  result.position.set(camera.position[0], camera.position[1], camera.position[2]);
  result.lookAt(camera.target[0], camera.target[1], camera.target[2]);
  result.updateProjectionMatrix();
  result.updateMatrixWorld(true);
  return result;
}

/** GLTFLoader cleans node names. Look a mesh up by its name as written, then by the cleaned name. */
function findSurfaceMeshes(root: THREE.Object3D, meshName: string): THREE.Mesh[] {
  const node = root.getObjectByName(meshName) ?? root.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(meshName));
  if (!node) return [];
  const meshes: THREE.Mesh[] = [];
  node.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh) meshes.push(mesh);
  });
  return meshes;
}

function drawSurfaceCanvas(page: DesignPageImage, surface: ModelSurface, layout: SurfaceTextureLayout): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = layout.canvasWidthPx;
  canvas.height = layout.canvasHeightPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser could not create a 2D canvas for the design texture.");
  // The band left by contain fit takes the surface letterbox colour.
  ctx.fillStyle = surface.letterboxColour;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // At scale 1 the design is copied pixel for pixel. Smoothing is only
  // used when the design has to shrink to fit the GPU texture limit.
  ctx.imageSmoothingEnabled = layout.scale < 1;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(page.source, layout.drawX, layout.drawY, layout.drawWidthPx, layout.drawHeightPx);
  return canvas;
}

function worldPositions(mesh: THREE.Mesh): Float32Array {
  const position = mesh.geometry.getAttribute("position");
  const out = new Float32Array(position.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
    out[i * 3] = v.x;
    out[i * 3 + 1] = v.y;
    out[i * 3 + 2] = v.z;
  }
  return out;
}

function measureSurface(meshes: THREE.Mesh[], surface: ModelSurface): { measuredAspect: number | null; warnings: string[] } {
  const warnings: string[] = [];
  const mesh = meshes[0];
  const uv = mesh ? mesh.geometry.getAttribute("uv") : null;
  if (!mesh || !uv) {
    return { measuredAspect: null, warnings: [`Surface ${surface.id}: the mesh has no UVs, so the design cannot be placed on it.`] };
  }
  const index = mesh.geometry.getIndex();
  const measuredAspect = measureUvAspect(worldPositions(mesh), uv.array as ArrayLike<number>, index ? (index.array as ArrayLike<number>) : null);
  const mismatch = surfaceAspectMismatch(surface.aspect, measuredAspect);
  if (mismatch) warnings.push(`Surface ${surface.id}: ${mismatch}`);
  const bounds = uvBounds(uv.array as ArrayLike<number>);
  const tolerance = 0.01;
  if (bounds.minU < -tolerance || bounds.minV < -tolerance || bounds.maxU > 1 + tolerance || bounds.maxV > 1 + tolerance) {
    warnings.push(`Surface ${surface.id}: the mesh UVs run outside the 0 to 1 square, so part of the design would repeat or be cut.`);
  } else if (bounds.minU > tolerance || bounds.minV > tolerance || bounds.maxU < 1 - tolerance || bounds.maxV < 1 - tolerance) {
    warnings.push(`Surface ${surface.id}: the mesh UVs do not cover the full 0 to 1 square, so part of the design would be cut off.`);
  }
  return { measuredAspect, warnings };
}

export async function buildShotContent(input: ShotSceneInput): Promise<BuiltShot> {
  const { shot, models, pages, limits } = input;
  const content = new THREE.Group();
  content.name = `shot_${shot.id}`;
  const surfaces: BuiltSurface[] = [];
  const warnings: string[] = [];
  const disposables: { dispose(): void }[] = [];

  for (const [modelIndex, placement] of shot.models.entries()) {
    const model = models.find((m) => m.id === placement.modelId);
    if (!model || !model.modelFile) {
      warnings.push(`Model ${placement.modelId} is not available, so it is left out of this shot.`);
      continue;
    }
    const source = await loadGlb(model.modelFile.storageKey);
    const object = source.clone(true);
    // Materials are cloned per placement, so a colour choice on one
    // model never leaks to another copy of the same model.
    const materialClones = new Map<THREE.Material, THREE.Material>();
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const original = mesh.material as THREE.Material;
      let clone = materialClones.get(original);
      if (!clone) {
        clone = original.clone();
        materialClones.set(original, clone);
        disposables.push(clone);
      }
      mesh.material = clone;
    });

    const holder = new THREE.Group();
    holder.name = `placement_${modelIndex}_${model.id}`;
    holder.position.set(placement.position[0], placement.position[1], placement.position[2]);
    holder.rotation.set(placement.rotationDeg[0] * DEG, placement.rotationDeg[1] * DEG, placement.rotationDeg[2] * DEG, "YXZ");
    holder.scale.setScalar(placement.scale);
    holder.add(object);
    content.add(holder);

    const override = input.colourOverrides ? input.colourOverrides[modelIndex] : undefined;
    const colourId = override !== undefined ? override : placement.colourOptionId ?? model.defaultColourOptionId;
    const colour = model.colourOptions.find((option) => option.id === colourId);
    if (colour) {
      for (const material of materialClones.values()) {
        if (material.name === colour.materialName && (material as THREE.MeshStandardMaterial).color) {
          (material as THREE.MeshStandardMaterial).color.set(colour.colour);
        }
      }
    }

    holder.updateMatrixWorld(true);
    for (const surface of model.surfaces) {
      const meshes = findSurfaceMeshes(object, surface.meshName);
      const built: BuiltSurface = { modelIndex, modelId: model.id, surface, meshes, page: null, layout: null, measuredAspect: null, warnings: [] };
      surfaces.push(built);
      if (meshes.length === 0) {
        built.warnings.push(`Surface ${surface.id}: mesh ${surface.meshName} was not found in the model file.`);
        continue;
      }
      const measured = measureSurface(meshes, surface);
      built.measuredAspect = measured.measuredAspect;
      built.warnings.push(...measured.warnings);

      const pageIndex = placement.surfacePages[surface.id] ?? surface.pageSlot;
      const page = pages[pageIndex] ?? null;
      let material: THREE.MeshBasicMaterial;
      if (page) {
        const layout = computeSurfaceTextureLayout({
          designWidthPx: page.widthPx,
          designHeightPx: page.heightPx,
          surfaceAspect: surface.aspect,
          maxTextureSizePx: limits.maxTextureSizePx,
        });
        built.page = page;
        built.layout = layout;
        built.warnings.push(...layout.warnings);
        const texture = new THREE.CanvasTexture(drawSurfaceCanvas(page, surface, layout));
        texture.colorSpace = THREE.SRGBColorSpace;
        // glTF UVs have their origin at the top left.
        texture.flipY = false;
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = limits.maxAnisotropy;
        texture.needsUpdate = true;
        disposables.push(texture);
        // Unlit and not tone mapped: the design colours pass through unchanged.
        material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
      } else {
        material = new THREE.MeshBasicMaterial({ color: new THREE.Color(surface.letterboxColour), toneMapped: false });
      }
      material.name = `surface_${surface.id}`;
      disposables.push(material);
      for (const mesh of meshes) mesh.material = material;
    }
  }

  let ground: THREE.Mesh | null = null;
  if (input.background.type === "desk-texture") {
    const textureId = input.background.textureId;
    const asset = input.textures.find((t) => t.id === textureId);
    if (!asset) {
      warnings.push(`Desk texture ${textureId} is not available, so the plain backdrop colour is used.`);
    } else {
      const image = await loadImage(studioAssetUrl(asset.storageKey));
      const map = new THREE.Texture(image);
      map.colorSpace = THREE.SRGBColorSpace;
      map.wrapS = THREE.RepeatWrapping;
      map.wrapT = THREE.RepeatWrapping;
      map.repeat.setScalar(GROUND_SIZE_METRES / asset.tileSizeMetres);
      map.anisotropy = limits.maxAnisotropy;
      map.needsUpdate = true;
      const geometry = new THREE.PlaneGeometry(GROUND_SIZE_METRES, GROUND_SIZE_METRES).rotateX(-Math.PI / 2);
      const material = new THREE.MeshStandardMaterial({ map, roughness: 0.82, metalness: 0 });
      ground = new THREE.Mesh(geometry, material);
      ground.name = "desk";
      ground.position.y = -0.0002;
      content.add(ground);
      disposables.push(map, geometry, material);
    }
  }

  const contactShadow = new ContactShadow(shot.contactShadow, input.shadowResolution);
  content.add(contactShadow.group);
  disposables.push(contactShadow);

  return {
    content,
    ground,
    contactShadow,
    surfaces,
    warnings,
    prepare(renderer, scene) {
      contactShadow.render(renderer, scene, ground ? [ground] : []);
    },
    dispose() {
      for (const item of disposables) item.dispose();
      content.removeFromParent();
    },
  };
}

function uvCornerWorld(meshes: THREE.Mesh[], u: number, v: number): THREE.Vector3 | null {
  let best: THREE.Vector3 | null = null;
  let bestDistance = Infinity;
  const point = new THREE.Vector3();
  for (const mesh of meshes) {
    const uv = mesh.geometry.getAttribute("uv");
    const position = mesh.geometry.getAttribute("position");
    if (!uv || !position) continue;
    for (let i = 0; i < uv.count; i++) {
      const distance = Math.hypot(uv.getX(i) - u, uv.getY(i) - v);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).clone();
      }
    }
  }
  return best;
}

/**
 * Where each surface lands in the output image: its four corners in
 * pixels and its edge lengths. Used for the crisp check (is the design
 * large enough for this placement) and for the framing record.
 */
export function reportSurfaces(built: BuiltShot, camera: THREE.PerspectiveCamera, widthPx: number, heightPx: number): RenderedSurfaceReport[] {
  const reports: RenderedSurfaceReport[] = [];
  built.content.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  for (const surface of built.surfaces) {
    if (!surface.page || !surface.layout || surface.meshes.length === 0) continue;
    const corners = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ].map(([u, v]) => {
      const world = uvCornerWorld(surface.meshes, u, v);
      if (!world) return [0, 0] as [number, number];
      const ndc = world.project(camera);
      return [((ndc.x + 1) / 2) * widthPx, ((1 - ndc.y) / 2) * heightPx] as [number, number];
    });
    const edge = (a: number, b: number) => Math.hypot(corners[a][0] - corners[b][0], corners[a][1] - corners[b][1]);
    reports.push({
      modelIndex: surface.modelIndex,
      modelId: surface.modelId,
      surfaceId: surface.surface.id,
      designPageId: surface.page.id,
      designWidthPx: surface.page.widthPx,
      designHeightPx: surface.page.heightPx,
      layout: surface.layout,
      cornersPx: corners,
      // The longer of each pair of opposite edges, so the check is on the
      // most demanding side of a surface seen in perspective.
      projectedWidthPx: Math.max(edge(0, 1), edge(3, 2)),
      projectedHeightPx: Math.max(edge(0, 3), edge(1, 2)),
      measuredAspect: surface.measuredAspect,
      warnings: surface.warnings,
    });
  }
  return reports;
}
