// Environment lighting for the 3D studio.
// A lighting preset is either a procedural studio (soft light panels in
// a plain room, described as numbers in the preset) or an HDRI file. In
// both cases the result is a prefiltered environment map used for image
// based lighting on PBR materials.

import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import type { LightingPreset } from "@listing-photos-generator/mockup-engine/studio";

function buildStudioScene(preset: Extract<LightingPreset["environment"], { type: "procedural-studio" }>): THREE.Scene {
  const scene = new THREE.Scene();
  const room = new THREE.Mesh(
    new THREE.BoxGeometry(12, 8, 12),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(preset.roomColour).multiplyScalar(preset.roomIntensity), side: THREE.BackSide }),
  );
  room.position.y = 3;
  scene.add(room);
  for (const box of preset.softboxes) {
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(box.size[0], box.size[1]),
      // Values above 1 are kept: the environment map is HDR.
      new THREE.MeshBasicMaterial({ color: new THREE.Color(box.colour).multiplyScalar(box.intensity), side: THREE.DoubleSide }),
    );
    panel.position.set(box.position[0], box.position[1], box.position[2]);
    panel.lookAt(0, 0.1, 0);
    scene.add(panel);
  }
  return scene;
}

const cache = new WeakMap<THREE.WebGLRenderer, Map<string, THREE.Texture>>();

export async function loadEnvironment(
  renderer: THREE.WebGLRenderer,
  preset: LightingPreset,
  assetUrl: (storageKey: string) => string,
): Promise<THREE.Texture> {
  let perRenderer = cache.get(renderer);
  if (!perRenderer) {
    perRenderer = new Map();
    cache.set(renderer, perRenderer);
  }
  const cacheKey = `${preset.id}@${preset.version}`;
  const cached = perRenderer.get(cacheKey);
  if (cached) return cached;

  const pmrem = new THREE.PMREMGenerator(renderer);
  let texture: THREE.Texture;
  if (preset.environment.type === "procedural-studio") {
    const scene = buildStudioScene(preset.environment);
    texture = pmrem.fromScene(scene, 0.03).texture;
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
    });
  } else {
    const equirect = await new RGBELoader().loadAsync(assetUrl(preset.environment.storageKey));
    texture = pmrem.fromEquirectangular(equirect).texture;
    equirect.dispose();
  }
  pmrem.dispose();
  perRenderer.set(cacheKey, texture);
  return texture;
}
