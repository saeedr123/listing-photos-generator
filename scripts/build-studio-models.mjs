// Build the in house 3D models for the mockup studio.
//
// Every model here is generated from plain geometry written in this
// file. Nothing is traced, copied or converted from Adobe Stock,
// ls.graphics, or any other seller or vendor. The devices are generic
// and unbranded: no logo, no trademark, no vendor specific shape detail.
//
// Usage: node scripts/build-studio-models.mjs
// Output: packages/mockup-engine/assets/models/*.glb and manifest.json.
// The script also refreshes bytes and sha256 in the matching registry
// entries under packages/mockup-engine/registry/models/, when present.
//
// Conventions the scene engine relies on:
// - Units are metres. Y is up. A model stands or lies on y = 0.
// - A surface mesh (screen or page) has UVs covering the full 0 to 1
//   square, origin at the top left of the visible area (glTF convention).

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// GLTFExporter writes binary output through FileReader, which Node does
// not have. This is the smallest stand in that does the same job.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      if (this.onloadend) this.onloadend();
    });
  }
};

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const OUT_DIR = join(ROOT, "packages", "mockup-engine", "assets", "models");
const REGISTRY_DIR = join(ROOT, "packages", "mockup-engine", "registry", "models");

const DEG = Math.PI / 180;

// ---- Materials --------------------------------------------------------------

function standard(name, colour, metalness, roughness, extra = {}) {
  const material = new THREE.MeshStandardMaterial({ color: colour, metalness, roughness, ...extra });
  material.name = name;
  return material;
}

function surfaceMaterial() {
  // Placeholder only. The scene engine replaces it with the seller design.
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  material.name = "surface";
  return material;
}

// ---- Geometry helpers -------------------------------------------------------

/** A slab with rounded corners and a small bevel. Lies in XY, thickness along Z, back face at z = 0. */
function roundedSlab(width, height, thickness, radius, bevel) {
  const w = width / 2 - bevel;
  const h = height / 2 - bevel;
  const r = Math.max(0.0001, Math.min(radius - bevel, w, h));
  const shape = new THREE.Shape();
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.absarc(w - r, -h + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(w, h - r);
  shape.absarc(w - r, h - r, r, 0, Math.PI / 2, false);
  shape.lineTo(-w + r, h);
  shape.absarc(-w + r, h - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(-w, -h + r);
  shape.absarc(-w + r, -h + r, r, Math.PI, Math.PI * 1.5, false);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.00001, thickness - bevel * 2),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 12,
  });
  geometry.translate(0, 0, bevel);
  geometry.deleteAttribute("uv");
  return geometry;
}

/** A flat rectangle facing +Z with glTF style UVs: (0,0) at the top left. */
function surfacePlane(width, height) {
  const geometry = new THREE.PlaneGeometry(width, height);
  const uv = geometry.getAttribute("uv");
  for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  return geometry;
}

function mesh(name, geometry, material) {
  const m = new THREE.Mesh(geometry, material);
  m.name = name;
  return m;
}

// ---- Devices ----------------------------------------------------------------

/**
 * A slate device (phone or tablet): rounded body, dark bezel plate, and a
 * rectangular screen. The screen is a plain rectangle so no corner of the
 * design is ever cut off by a rounded mask.
 */
function buildSlate({ name, bodyWidth, bodyHeight, thickness, cornerRadius, screenWidth, screenHeight, bodyColour }) {
  const group = new THREE.Group();
  group.name = name;
  const body = standard("body", bodyColour, 0.55, 0.38);
  const bezel = standard("bezel", 0x0b0b0d, 0.0, 0.25);

  const bodyMesh = mesh("body", roundedSlab(bodyWidth, bodyHeight, thickness, cornerRadius, 0.0012), body);
  group.add(bodyMesh);

  const inset = Math.min(0.0022, (bodyWidth - screenWidth) / 4);
  const bezelGeometry = roundedSlab(bodyWidth - inset * 2, bodyHeight - inset * 2, 0.0004, cornerRadius - inset, 0);
  const bezelMesh = mesh("bezel", bezelGeometry, bezel);
  bezelMesh.position.z = thickness - 0.0002;
  group.add(bezelMesh);

  const screen = mesh("screen", surfacePlane(screenWidth, screenHeight), surfaceMaterial());
  screen.position.z = thickness + 0.00035;
  group.add(screen);

  // Stand the device on the ground, facing +Z.
  group.position.y = bodyHeight / 2;
  const root = new THREE.Group();
  root.name = `${name}_root`;
  root.add(group);
  return root;
}

function buildLaptop() {
  const root = new THREE.Group();
  root.name = "laptop_root";
  const body = standard("body", 0xc9ccd1, 0.55, 0.38);
  const bezel = standard("bezel", 0x0b0b0d, 0.0, 0.25);
  const keys = standard("keys", 0x1e1f22, 0.0, 0.6);

  const width = 0.32;
  const depth = 0.22;
  const baseThickness = 0.013;
  const lidHeight = 0.215;
  const lidThickness = 0.0055;

  // Base: a slab lying flat. Build in XY then lay it down.
  const baseGeometry = roundedSlab(width, depth, baseThickness, 0.012, 0.0015);
  baseGeometry.rotateX(-90 * DEG);
  root.add(mesh("base", baseGeometry, body));

  // Keyboard: one merged mesh of key caps in a shallow well.
  const keyWidth = 0.0172;
  const keyDepth = 0.0165;
  const gap = 0.0022;
  const columns = 14;
  const rows = 5;
  const keyboardWidth = columns * keyWidth + (columns - 1) * gap;
  const keyGeometries = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      // The bottom row has one long key in the middle, like any keyboard.
      if (row === rows - 1 && column >= 4 && column <= 8) {
        if (column !== 4) continue;
        const long = new THREE.BoxGeometry(keyWidth * 5 + gap * 4, 0.0012, keyDepth);
        long.translate(-keyboardWidth / 2 + 4 * (keyWidth + gap) + (keyWidth * 5 + gap * 4) / 2, 0, row * (keyDepth + gap));
        keyGeometries.push(long);
        continue;
      }
      const key = new THREE.BoxGeometry(keyWidth, 0.0012, keyDepth);
      key.translate(-keyboardWidth / 2 + column * (keyWidth + gap) + keyWidth / 2, 0, row * (keyDepth + gap));
      keyGeometries.push(key);
    }
  }
  const keyboard = mergeGeometries(keyGeometries);
  keyboard.deleteAttribute("uv");
  const keyboardMesh = mesh("keyboard", keyboard, keys);
  keyboardMesh.position.set(0, baseThickness + 0.0004, -depth / 2 + 0.03);
  root.add(keyboardMesh);

  // Trackpad: a thin dark outline with a body coloured pad inside it.
  const padWidth = 0.105;
  const padDepth = 0.066;
  const outline = new THREE.BoxGeometry(padWidth + 0.0012, 0.0003, padDepth + 0.0012);
  outline.deleteAttribute("uv");
  const outlineMesh = mesh("trackpad_outline", outline, keys);
  outlineMesh.position.set(0, baseThickness + 0.00005, depth / 2 - 0.012 - padDepth / 2);
  root.add(outlineMesh);
  const pad = new THREE.BoxGeometry(padWidth, 0.0003, padDepth);
  pad.deleteAttribute("uv");
  const padMesh = mesh("trackpad", pad, body);
  padMesh.position.set(0, baseThickness + 0.00015, depth / 2 - 0.012 - padDepth / 2);
  root.add(padMesh);

  // Lid: built upright, front face toward +Z, then tilted back at the hinge.
  const lid = new THREE.Group();
  lid.name = "lid";
  const lidGeometry = roundedSlab(width, lidHeight, lidThickness, 0.012, 0.0012);
  lidGeometry.translate(0, lidHeight / 2, -lidThickness);
  lid.add(mesh("lid_shell", lidGeometry, body));

  const bezelGeometry = roundedSlab(width - 0.004, lidHeight - 0.004, 0.0004, 0.010, 0);
  bezelGeometry.translate(0, lidHeight / 2, -0.0002);
  lid.add(mesh("bezel", bezelGeometry, bezel));

  const screenWidth = 0.304;
  const screenHeight = screenWidth / 1.6;
  const screen = mesh("screen", surfacePlane(screenWidth, screenHeight), surfaceMaterial());
  // 8 mm of bezel above the screen, the rest below it.
  screen.position.set(0, lidHeight - 0.008 - screenHeight / 2, 0.00035);
  lid.add(screen);

  lid.position.set(0, baseThickness, -depth / 2 + 0.004);
  lid.rotation.x = -15 * DEG;
  root.add(lid);
  return root;
}

// ---- Paper ------------------------------------------------------------------

/**
 * A sheet of paper lying on the ground, face up, top edge away from the
 * viewer (toward -Z). The curl is a subtle lift toward one top corner
 * plus a slight bow, so the sheet reads as real paper, not a flat card.
 */
function paperGeometry(width, height, curl) {
  const segmentsX = 36;
  const segmentsY = 50;
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let iy = 0; iy <= segmentsY; iy++) {
    const v = iy / segmentsY; // 0 at the top edge of the page
    for (let ix = 0; ix <= segmentsX; ix++) {
      const u = ix / segmentsX; // 0 at the left edge
      const x = (u - 0.5) * width;
      const z = (v - 0.5) * height;
      // Corner lift: 0 over most of the sheet, rising smoothly to about
      // 7 mm at the top right corner. Small enough that the sheet keeps
      // its paper aspect, so the design on it is not stretched.
      const corner = (Math.max(0, u - 0.45) / 0.55) * (Math.max(0, 0.75 - v) / 0.75);
      const lift = curl * 0.007 * corner * corner;
      const bow = curl * 0.0015 * Math.sin(Math.PI * v) * (0.6 + 0.4 * u);
      positions.push(x, lift + bow, z);
      uvs.push(u, v);
    }
  }
  const row = segmentsX + 1;
  for (let iy = 0; iy < segmentsY; iy++) {
    for (let ix = 0; ix < segmentsX; ix++) {
      const a = iy * row + ix;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      // Wound so the face points up (+Y).
      indices.push(a, c, b, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** One sheet: the textured top face plus a plain paper body just under it, so the underside is never the design. */
function buildSheet(pageName, width, height, curl) {
  const group = new THREE.Group();
  group.name = `${pageName}_sheet`;
  const paper = standard("paper", 0xfbfaf7, 0.0, 0.92, { side: THREE.DoubleSide });
  const top = paperGeometry(width, height, curl);
  const page = mesh(pageName, top, surfaceMaterial());
  page.position.y = 0.0005;
  group.add(page);
  const under = top.clone();
  under.deleteAttribute("uv");
  const bodyMesh = mesh(`${pageName}_paper`, under, paper);
  bodyMesh.position.y = 0.0002;
  group.add(bodyMesh);
  return group;
}

function buildSingleSheet(width, height) {
  const root = new THREE.Group();
  root.name = "sheet_root";
  root.add(buildSheet("page", width, height, 1));
  return root;
}

/** Three sheets fanned around a point near the bottom left corner. Page 1 is on top. */
function buildFan(width, height) {
  const root = new THREE.Group();
  root.name = "fan_root";
  const layout = [
    { name: "page_3", angle: 17, lift: 0.0, curl: 0.25 },
    { name: "page_2", angle: 6, lift: 0.0009, curl: 0.4 },
    { name: "page_1", angle: -6, lift: 0.0018, curl: 1 },
  ];
  for (const item of layout) {
    const pivot = new THREE.Group();
    pivot.name = `${item.name}_pivot`;
    // Pivot sits near the bottom left corner of the sheet.
    pivot.position.set(-width * 0.42, item.lift, height * 0.42);
    pivot.rotation.y = item.angle * DEG;
    const sheet = buildSheet(item.name, width, height, item.curl);
    sheet.position.set(width * 0.42, 0, -height * 0.42);
    pivot.add(sheet);
    root.add(pivot);
  }
  return root;
}

function buildClipboard(width, height) {
  const root = new THREE.Group();
  root.name = "clipboard_root";
  const board = standard("board", 0x8a6f52, 0.0, 0.7);
  const clip = standard("clip", 0xb9bcc2, 0.85, 0.3);
  const boardWidth = width + 0.026;
  const boardHeight = height + 0.036;
  const boardThickness = 0.004;
  const boardGeometry = roundedSlab(boardWidth, boardHeight, boardThickness, 0.008, 0.0008);
  boardGeometry.rotateX(-90 * DEG);
  root.add(mesh("board", boardGeometry, board));

  const sheet = buildSheet("page", width, height, 0.15);
  sheet.position.set(0, boardThickness, 0.006);
  root.add(sheet);

  const clipBase = new THREE.BoxGeometry(0.11, 0.0035, 0.03);
  clipBase.deleteAttribute("uv");
  const clipBaseMesh = mesh("clip_base", clipBase, clip);
  clipBaseMesh.position.set(0, boardThickness + 0.0028, -boardHeight / 2 + 0.022);
  root.add(clipBaseMesh);
  const clipBar = new THREE.CylinderGeometry(0.0045, 0.0045, 0.075, 20);
  clipBar.deleteAttribute("uv");
  clipBar.rotateZ(90 * DEG);
  const clipBarMesh = mesh("clip_bar", clipBar, clip);
  clipBarMesh.position.set(0, boardThickness + 0.0075, -boardHeight / 2 + 0.014);
  root.add(clipBarMesh);
  return root;
}

// ---- Model list ---------------------------------------------------------------

const A4 = { width: 0.21, height: 0.297 };
const LETTER = { width: 0.2159, height: 0.2794 };

const MODELS = [
  { file: "laptop-generic.glb", build: () => buildLaptop() },
  {
    file: "phone-generic.glb",
    build: () =>
      buildSlate({ name: "phone", bodyWidth: 0.072, bodyHeight: 0.152, thickness: 0.008, cornerRadius: 0.0105, screenWidth: 0.066, screenHeight: 0.143, bodyColour: 0x2a2b2e }),
  },
  {
    file: "tablet-generic-landscape.glb",
    build: () =>
      buildSlate({ name: "tablet", bodyWidth: 0.25, bodyHeight: 0.19, thickness: 0.0065, cornerRadius: 0.012, screenWidth: 0.228, screenHeight: 0.171, bodyColour: 0xc9ccd1 }),
  },
  {
    file: "tablet-generic-portrait.glb",
    build: () =>
      buildSlate({ name: "tablet", bodyWidth: 0.19, bodyHeight: 0.25, thickness: 0.0065, cornerRadius: 0.012, screenWidth: 0.171, screenHeight: 0.228, bodyColour: 0xc9ccd1 }),
  },
  { file: "paper-a4.glb", build: () => buildSingleSheet(A4.width, A4.height) },
  { file: "paper-us-letter.glb", build: () => buildSingleSheet(LETTER.width, LETTER.height) },
  { file: "paper-fan-a4.glb", build: () => buildFan(A4.width, A4.height) },
  { file: "paper-fan-us-letter.glb", build: () => buildFan(LETTER.width, LETTER.height) },
  { file: "clipboard-a4.glb", build: () => buildClipboard(A4.width, A4.height) },
];

function exportGlb(object) {
  const scene = new THREE.Scene();
  scene.add(object);
  scene.updateMatrixWorld(true);
  return new Promise((resolve, reject) => {
    new GLTFExporter().parse(scene, (result) => resolve(Buffer.from(result)), reject, { binary: true, onlyVisible: true });
  });
}

function readGlbJson(buffer) {
  const length = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + length).toString("utf8"));
}

mkdirSync(OUT_DIR, { recursive: true });
const manifest = [];
for (const model of MODELS) {
  const buffer = await exportGlb(model.build());
  writeFileSync(join(OUT_DIR, model.file), buffer);
  const json = readGlbJson(buffer);
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const meshNodeNames = (json.nodes || []).filter((n) => typeof n.mesh === "number").map((n) => n.name).sort();
  const materialNames = (json.materials || []).map((m) => m.name).sort();
  manifest.push({ file: model.file, bytes: buffer.length, sha256, meshNodeNames, materialNames, imageCount: (json.images || []).length });
  console.log(`built ${model.file} ${buffer.length} bytes, meshes: ${meshNodeNames.join(", ")}`);

  const registryPath = join(REGISTRY_DIR, model.file.replace(/\.glb$/, ".json"));
  if (existsSync(registryPath)) {
    const entry = JSON.parse(readFileSync(registryPath, "utf8"));
    if (entry.modelFile && (entry.modelFile.bytes !== buffer.length || entry.modelFile.sha256 !== sha256)) {
      entry.modelFile.bytes = buffer.length;
      entry.modelFile.sha256 = sha256;
      writeFileSync(registryPath, JSON.stringify(entry, null, 2) + "\n");
      console.log(`  refreshed bytes and sha256 in ${registryPath}`);
    }
  }
}
writeFileSync(join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
