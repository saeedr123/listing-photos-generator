// Asset loading for the 3D studio: GLB models, image textures, design
// pages and font files. Models and textures come from object storage
// through the studio asset route. Design pages stay in the browser.

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export function studioAssetUrl(storageKey: string): string {
  return `/api/studio/asset?key=${encodeURIComponent(storageKey)}`;
}

const glbCache = new Map<string, Promise<THREE.Group>>();

/** Load a GLB once per storage key. Callers clone the result, they never edit it. */
export function loadGlb(storageKey: string): Promise<THREE.Group> {
  let pending = glbCache.get(storageKey);
  if (!pending) {
    pending = new GLTFLoader().loadAsync(studioAssetUrl(storageKey)).then((gltf) => gltf.scene);
    pending.catch(() => glbCache.delete(storageKey));
    glbCache.set(storageKey, pending);
  }
  return pending;
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(url: string): Promise<HTMLImageElement> {
  let pending = imageCache.get(url);
  if (!pending) {
    pending = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Image could not be loaded: ${url}`));
      image.src = url;
    });
    pending.catch(() => imageCache.delete(url));
    imageCache.set(url, pending);
  }
  return pending;
}

/** One page of the seller design, decoded in the browser. Pixels are only ever read. */
export interface DesignPageImage {
  id: string;
  name: string;
  widthPx: number;
  heightPx: number;
  source: ImageBitmap | HTMLImageElement | HTMLCanvasElement;
}

export async function decodeDesignFile(file: Blob, id: string, name: string): Promise<DesignPageImage> {
  // colorSpaceConversion default keeps the browser colour management:
  // an image with an embedded profile is shown as its author intended.
  const bitmap = await createImageBitmap(file);
  return { id, name, widthPx: bitmap.width, heightPx: bitmap.height, source: bitmap };
}

const fontCache = new Map<string, Promise<void>>();

/** Load a font file for canvas text. A generic family has no file and needs no load. */
export function ensureFont(family: string, weight: number, fileStorageKey: string | null): Promise<void> {
  if (!fileStorageKey || typeof FontFace === "undefined") return Promise.resolve();
  const key = `${family}|${weight}|${fileStorageKey}`;
  let pending = fontCache.get(key);
  if (!pending) {
    const face = new FontFace(family, `url(${studioAssetUrl(fileStorageKey)})`, { weight: String(weight) });
    pending = face.load().then((loaded) => {
      document.fonts.add(loaded);
    });
    fontCache.set(key, pending);
  }
  return pending;
}
