// Upload validation. File type, size, and content checks for product PDFs,
// screenshots, and mockup frames. Rejection messages are plain language and
// do not leak system details. No file content is logged.

import { uploadConfig } from "./config.ts";

export interface UploadCandidate {
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  // First bytes of the file, for magic byte checks. Empty when unavailable.
  magicBytes: Uint8Array;
}

export interface UploadValidation {
  ok: boolean;
  errors: string[];
  detectedType: string | null;
}

function extensionOf(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? (parts[parts.length - 1] as string) : "";
}

function startsWith(bytes: Uint8Array, prefix: number[]): boolean {
  if (bytes.length < prefix.length) {
    return false;
  }
  for (let i = 0; i < prefix.length; i++) {
    if (bytes[i] !== prefix[i]) {
      return false;
    }
  }
  return true;
}

// Magic bytes: PDF starts with %PDF, PNG with its 8 byte signature,
// JPEG with FF D8 FF. A file whose content does not match its extension is
// rejected, whatever the extension claims.
export function detectTypeByMagic(magicBytes: Uint8Array): string | null {
  if (startsWith(magicBytes, [0x25, 0x50, 0x44, 0x46])) {
    return "pdf";
  }
  if (startsWith(magicBytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "png";
  }
  if (startsWith(magicBytes, [0xff, 0xd8, 0xff])) {
    return "jpg";
  }
  // ZIP container, which includes .xlsx and .docx. Those are not accepted
  // as product sources here: a Sheets product must never be described as
  // Excel, and no .xlsx claim is generated for it.
  if (startsWith(magicBytes, [0x50, 0x4b, 0x03, 0x04])) {
    return "zip";
  }
  return null;
}

export function validateUpload(candidate: UploadCandidate): UploadValidation {
  const errors: string[] = [];
  const ext = extensionOf(candidate.fileName);

  if (candidate.sizeBytes <= 0) {
    errors.push("That file is empty. Upload a file with content.");
  }
  if (candidate.sizeBytes > uploadConfig.maxFileBytes) {
    errors.push("That file is too large. Upload a smaller file.");
  }
  if (!uploadConfig.allowedExtensions.includes(ext)) {
    if (ext === "xlsx" || ext === "xls") {
      errors.push("Spreadsheet files are not accepted as uploads. Upload a PDF or an image of the real product instead. A Sheets product is never described as Excel.");
    } else {
      errors.push("That file type is not accepted. Upload a PDF, JPG, or PNG of the real product.");
    }
  }
  if (candidate.mimeType && !uploadConfig.allowedMimeTypes.includes(candidate.mimeType)) {
    errors.push("That file type is not accepted. Upload a PDF, JPG, or PNG of the real product.");
  }
  if (candidate.fileName.length > uploadConfig.etsyFileNameMaxChars) {
    errors.push("That file name is too long for Etsy. Shorten it to 70 characters or fewer before export.");
  }

  let detected: string | null = null;
  if (candidate.magicBytes.length > 0) {
    detected = detectTypeByMagic(candidate.magicBytes);
    if (detected === "zip") {
      errors.push("That file is a compressed or spreadsheet file, not a PDF or image. Upload a PDF, JPG, or PNG of the real product.");
    } else if (detected !== null) {
      const expected = ext === "jpeg" ? "jpg" : ext;
      if (expected !== detected) {
        errors.push("That file does not match its file type. Upload a PDF, JPG, or PNG of the real product.");
      }
    } else {
      errors.push("That file could not be read as a PDF, JPG, or PNG. Upload a PDF, JPG, or PNG of the real product.");
    }
  }

  return { ok: errors.length === 0, errors, detectedType: detected };
}
