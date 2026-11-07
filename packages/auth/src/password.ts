// Password hashing, server only. Uses Node scrypt, no external dependency,
// no secret stored in code. The parameters are configuration, not security
// claims. This file must never run in the browser.

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
// Stored format: scrypt$<salt hex>$<key hex>. The version marker lets the
// parameters change later without breaking existing hashes.
const PREFIX = "scrypt$v1$";

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return PREFIX + salt.toString("hex") + "$" + key.toString("hex");
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    if (!storedHash.startsWith(PREFIX)) {
      return false;
    }
    const parts = storedHash.slice(PREFIX.length).split("$");
    if (parts.length !== 2) {
      return false;
    }
    const salt = Buffer.from(parts[0], "hex");
    const expected = Buffer.from(parts[1], "hex");
    const key = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
    if (key.length !== expected.length) {
      return false;
    }
    return timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

export function isValidEmail(email: string): boolean {
  // Plain, permissive check. Full deliverability is not claimed here.
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
