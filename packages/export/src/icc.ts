// Read an sRGB ICC profile back out of exported JPG bytes.
//
// The export pipeline embeds the profile (see srgb_icc.py) as a JPEG
// APP2 ICC segment. This reader proves the profile is really in the
// file by parsing the JPEG markers, reassembling the ICC chunks, and
// checking the profile header and description tag. It never trusts a
// config flag: only bytes in the file count.

export const ICC_PROFILE_NAME = "sRGB IEC61966-2.1";

export interface IccProfileCheck {
  present: boolean;
  chunkCount: number;
  profileBytes: number;
  profileDescription: string | null;
  headerValid: boolean;
  detail: string;
}

const ICC_HEADER = Buffer.from("ICC_PROFILE\0", "ascii");

function readU32(buffer: Buffer, offset: number): number {
  return buffer.readUInt32BE(offset);
}

function parseProfileDescription(profile: Buffer): string | null {
  // Tag table starts at byte 128: count, then 12 byte entries
  // (signature, offset, size). The "desc" tag holds the ASCII name.
  if (profile.length < 132) return null;
  const tagCount = readU32(profile, 128);
  for (let i = 0; i < tagCount; i++) {
    const entry = 132 + i * 12;
    if (entry + 12 > profile.length) return null;
    const signature = profile.subarray(entry, entry + 4).toString("ascii");
    if (signature !== "desc") continue;
    const offset = readU32(profile, entry + 4);
    const size = readU32(profile, entry + 8);
    if (offset + size > profile.length || size < 16) return null;
    const tag = profile.subarray(offset, offset + size);
    if (tag.subarray(0, 4).toString("ascii") !== "desc") return null;
    const asciiCount = readU32(tag, 8);
    if (asciiCount === 0 || 12 + asciiCount > tag.length) return null;
    const raw = tag.subarray(12, 12 + asciiCount).toString("ascii");
    return raw.replace(/\0+$/, "");
  }
  return null;
}

/**
 * Parse JPEG bytes and return what the embedded ICC profile says.
 * A file with no APP2 ICC segment, or a profile whose header or
 * description does not say sRGB, comes back as not present or not
 * valid, and the caller must block the export.
 */
export function readIccProfile(jpgBytes: Buffer): IccProfileCheck {
  const empty: IccProfileCheck = {
    present: false,
    chunkCount: 0,
    profileBytes: 0,
    profileDescription: null,
    headerValid: false,
    detail: "No ICC_PROFILE APP2 segment found in the JPG bytes.",
  };
  if (jpgBytes.length < 4 || jpgBytes[0] !== 0xff || jpgBytes[1] !== 0xd8) {
    return { ...empty, detail: "Not a JPEG file: missing SOI marker." };
  }
  const chunks = new Map<number, Buffer>();
  let chunkTotal = 0;
  let offset = 2;
  while (offset + 4 <= jpgBytes.length) {
    if (jpgBytes[offset] !== 0xff) break;
    const marker = jpgBytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) break; // SOS or EOI
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const length = jpgBytes.readUInt16BE(offset + 2);
    if (length < 2 || offset + 2 + length > jpgBytes.length) break;
    const data = jpgBytes.subarray(offset + 4, offset + 2 + length);
    if (marker === 0xe2 && data.length > 14 && data.subarray(0, 12).equals(ICC_HEADER)) {
      const chunkNumber = data[12];
      const chunkCount = data[13];
      if (chunkCount > 0 && chunkNumber >= 1 && chunkNumber <= chunkCount) {
        chunks.set(chunkNumber, Buffer.from(data.subarray(14)));
        chunkTotal = chunkCount;
      }
    }
    offset += 2 + length;
  }
  if (chunks.size === 0) return empty;
  const ordered: Buffer[] = [];
  for (let i = 1; i <= chunkTotal; i++) {
    const chunk = chunks.get(i);
    if (!chunk) {
      return {
        ...empty,
        chunkCount: chunks.size,
        detail: `ICC_PROFILE APP2 segments are incomplete: chunk ${i} of ${chunkTotal} is missing.`,
      };
    }
    ordered.push(chunk);
  }
  const profile = Buffer.concat(ordered);
  const sizeMatches = profile.length >= 128 && readU32(profile, 0) === profile.length;
  const headerValid =
    sizeMatches &&
    profile.subarray(36, 40).toString("ascii") === "acsp" &&
    profile.subarray(12, 16).toString("ascii") === "mntr" &&
    profile.subarray(16, 20).toString("ascii") === "RGB " &&
    profile.subarray(20, 24).toString("ascii") === "XYZ ";
  const description = parseProfileDescription(profile);
  const isSrgb = description !== null && description.includes("sRGB");
  const detail =
    `APP2 ICC segment present, ${chunkTotal} chunk` +
    `${chunkTotal === 1 ? "" : "s"}, ${profile.length} profile bytes, ` +
    `header ${headerValid ? "valid (acsp, mntr, RGB, XYZ)" : "invalid"}, ` +
    `description ${description === null ? "not found" : `"${description}"`}.`;
  return {
    present: isSrgb && headerValid,
    chunkCount: chunkTotal,
    profileBytes: profile.length,
    profileDescription: description,
    headerValid,
    detail,
  };
}
