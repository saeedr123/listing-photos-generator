// Read the names inside a GLB file without a 3D library.
// The admin add flow uses this to list the meshes of an uploaded model,
// so the admin can name the screen mesh, and to check that a named mesh
// and material really exist in the file. Pure: works in Node and in the
// browser.

export interface GlbInfo {
  valid: boolean;
  error: string | null;
  gltfVersion: string | null;
  generator: string | null;
  /** Names of nodes that carry a mesh. This is the name the scene engine looks up. */
  meshNodeNames: string[];
  materialNames: string[];
  /** Embedded or external images. A device model with a logo texture would show up here. */
  imageCount: number;
  byteLength: number;
}

const GLB_MAGIC = 0x46546c67; // "glTF"
const CHUNK_JSON = 0x4e4f534a; // "JSON"

function fail(error: string, byteLength: number): GlbInfo {
  return {
    valid: false,
    error,
    gltfVersion: null,
    generator: null,
    meshNodeNames: [],
    materialNames: [],
    imageCount: 0,
    byteLength,
  };
}

export function inspectGlb(bytes: Uint8Array): GlbInfo {
  if (bytes.byteLength < 20) return fail("File is too small to be a GLB.", bytes.byteLength);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== GLB_MAGIC) {
    return fail("File does not start with the GLB signature. Upload a binary glTF (.glb) file.", bytes.byteLength);
  }
  const containerVersion = view.getUint32(4, true);
  if (containerVersion !== 2) {
    return fail(`GLB container version ${containerVersion} is not supported. Use glTF 2.0.`, bytes.byteLength);
  }
  const declaredLength = view.getUint32(8, true);
  if (declaredLength > bytes.byteLength) {
    return fail("GLB header declares more bytes than the file holds. The upload may be cut short.", bytes.byteLength);
  }
  const chunkLength = view.getUint32(12, true);
  const chunkType = view.getUint32(16, true);
  if (chunkType !== CHUNK_JSON || 20 + chunkLength > bytes.byteLength) {
    return fail("GLB has no readable JSON chunk.", bytes.byteLength);
  }
  let json: Record<string, unknown>;
  try {
    const text = new TextDecoder("utf-8").decode(bytes.subarray(20, 20 + chunkLength));
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return fail("GLB JSON chunk is not valid JSON.", bytes.byteLength);
  }
  const asset = (json["asset"] ?? {}) as Record<string, unknown>;
  const nodes = Array.isArray(json["nodes"]) ? (json["nodes"] as Record<string, unknown>[]) : [];
  const materials = Array.isArray(json["materials"]) ? (json["materials"] as Record<string, unknown>[]) : [];
  const images = Array.isArray(json["images"]) ? json["images"] : [];
  const meshNodeNames = nodes
    .filter((node) => typeof node["mesh"] === "number" && typeof node["name"] === "string")
    .map((node) => String(node["name"]));
  const materialNames = materials
    .filter((material) => typeof material["name"] === "string")
    .map((material) => String(material["name"]));
  return {
    valid: true,
    error: null,
    gltfVersion: typeof asset["version"] === "string" ? (asset["version"] as string) : null,
    generator: typeof asset["generator"] === "string" ? (asset["generator"] as string) : null,
    meshNodeNames: [...new Set(meshNodeNames)].sort(),
    materialNames: [...new Set(materialNames)].sort(),
    imageCount: images.length,
    byteLength: bytes.byteLength,
  };
}
