// Build a minimal valid sRGB ICC profile in TypeScript, no dependency.
//
// This is a byte for byte port of srgb_icc.py in this folder, so the 3D
// studio export (Node, no Python) embeds exactly the same profile as the
// template export (Python). tests/srgb-icc.test.mjs compares the two.
//
// Profile: ICC v2, display class ("mntr"), RGB input, XYZ PCS, D50
// illuminant, sRGB primaries, and the sRGB tone response as a 1024 entry
// curve. Description tag: "sRGB IEC61966-2.1". Deterministic: every number
// is a constant here.

export const SRGB_PROFILE_DESCRIPTION = "sRGB IEC61966-2.1";

// sRGB primaries in the D50 PCS, from IEC 61966-2-1, as (X, Y, Z).
const SRGB_R_XYZ = [0.4360657, 0.2224884, 0.013916];
const SRGB_G_XYZ = [0.3851471, 0.7168731, 0.0970767];
const SRGB_B_XYZ = [0.143066, 0.0606072, 0.7140963];
const D50_XYZ = [0.9642, 1.0, 0.8249];

function concat(parts: Buffer[]): Buffer {
  return Buffer.concat(parts);
}

function u16(value: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16BE(value);
  return b;
}

function u32(value: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(value);
  return b;
}

// Python's round() rounds halves to even. Match it exactly.
function roundHalfEven(value: number): number {
  const floor = Math.floor(value);
  const diff = value - floor;
  if (diff > 0.5) return floor + 1;
  if (diff < 0.5) return floor;
  return floor % 2 === 0 ? floor : floor + 1;
}

function s15Fixed16(value: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeInt32BE(roundHalfEven(value * 65536));
  return b;
}

function pad4(tag: Buffer): Buffer {
  const extra = (4 - (tag.length % 4)) % 4;
  return extra === 0 ? tag : concat([tag, Buffer.alloc(extra)]);
}

function xyzTag(xyz: number[]): Buffer {
  return concat([Buffer.from("XYZ ", "ascii"), Buffer.alloc(4), ...xyz.map(s15Fixed16)]);
}

function textTag(text: string): Buffer {
  const body = Buffer.from(text + "\0", "ascii");
  return pad4(concat([Buffer.from("text", "ascii"), Buffer.alloc(4), body]));
}

function descTag(text: string): Buffer {
  const body = Buffer.from(text + "\0", "ascii");
  return pad4(
    concat([
      Buffer.from("desc", "ascii"),
      Buffer.alloc(4),
      u32(body.length),
      body,
      u16(0x656e), // "en"
      u32(0),
      u16(0),
      Buffer.alloc(1),
    ]),
  );
}

function curveTag(entries = 1024): Buffer {
  const table: Buffer[] = [];
  for (let i = 0; i < entries; i++) {
    const v = i / (entries - 1);
    const linear = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    table.push(u16(roundHalfEven(linear * 65535)));
  }
  return concat([Buffer.from("curv", "ascii"), Buffer.alloc(4), u32(entries), ...table]);
}

let cached: Buffer | null = null;

/** The bytes of a minimal valid sRGB ICC profile, identical to srgb_icc.py. */
export function srgbIccProfileBytes(): Buffer {
  if (cached) return cached;
  const tags: Array<[string, Buffer]> = [
    ["desc", descTag(SRGB_PROFILE_DESCRIPTION)],
    ["cprt", textTag(SRGB_PROFILE_DESCRIPTION)],
    ["wtpt", xyzTag(D50_XYZ)],
    ["bkpt", xyzTag([0, 0, 0])],
    ["rXYZ", xyzTag(SRGB_R_XYZ)],
    ["gXYZ", xyzTag(SRGB_G_XYZ)],
    ["bXYZ", xyzTag(SRGB_B_XYZ)],
    ["rTRC", curveTag()],
    ["gTRC", curveTag()],
    ["bTRC", curveTag()],
  ];
  const headerSize = 128;
  let offset = headerSize + 4 + 12 * tags.length;
  const entries: Buffer[] = [];
  for (const [signature, blob] of tags) {
    entries.push(concat([Buffer.from(signature, "ascii"), u32(offset), u32(blob.length)]));
    offset += blob.length;
  }
  const header = Buffer.alloc(128);
  header.writeUInt32BE(offset, 0);
  header.write("lcms", 4, "ascii");
  header.writeUInt32BE(0x02100000, 8); // ICC version 2.1.0
  header.write("mntr", 12, "ascii");
  header.write("RGB ", 16, "ascii");
  header.write("XYZ ", 20, "ascii");
  [2026, 11, 10, 0, 0, 0].forEach((value, i) => header.writeUInt16BE(value, 24 + i * 2));
  header.write("acsp", 36, "ascii");
  // Platform, flags, manufacturer, model, attributes, intent: zero.
  D50_XYZ.forEach((value, i) => s15Fixed16(value).copy(header, 68 + i * 4));
  cached = concat([header, u32(tags.length), ...entries, ...tags.map(([, blob]) => blob)]);
  return cached;
}

/**
 * Insert an ICC profile into JPEG bytes as APP2 ICC_PROFILE segments,
 * after SOI and any APP0 (JFIF) segment. The image data is not touched.
 * Throws if the bytes are not a JPEG. The caller passes a JPEG with no
 * ICC segment (sharp writes none unless asked).
 */
export function embedIccProfile(jpg: Buffer, profile: Buffer): Buffer {
  if (jpg.length < 4 || jpg[0] !== 0xff || jpg[1] !== 0xd8) {
    throw new Error("Not a JPEG file: missing SOI marker.");
  }
  let insertAt = 2;
  if (jpg[2] === 0xff && jpg[3] === 0xe0) {
    insertAt = 4 + jpg.readUInt16BE(4);
  }
  const header = Buffer.from("ICC_PROFILE\0", "ascii");
  // Each segment holds at most 65535 - 2 (length) - 12 (header) - 2 (seq) bytes.
  const maxChunk = 65519;
  const count = Math.ceil(profile.length / maxChunk);
  if (count > 255) throw new Error("ICC profile too large for APP2 segments.");
  const segments: Buffer[] = [];
  for (let i = 0; i < count; i++) {
    const chunk = profile.subarray(i * maxChunk, (i + 1) * maxChunk);
    const length = 2 + header.length + 2 + chunk.length;
    segments.push(Buffer.from([0xff, 0xe2]), u16(length), header, Buffer.from([i + 1, count]), chunk);
  }
  return concat([jpg.subarray(0, insertAt), ...segments, jpg.subarray(insertAt)]);
}
