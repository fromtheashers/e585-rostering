import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const attempt = scryptSync(pin, salt, 32);
  const expected = Buffer.from(hash, "hex");
  return attempt.length === expected.length && timingSafeEqual(attempt, expected);
}

/** A link code like "k7pq-2xvn-9trb": easy to read aloud, about 60 bits of randomness. */
export function newLinkToken(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(12);
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]);
  return [chars.slice(0, 4), chars.slice(4, 8), chars.slice(8, 12)].map((c) => c.join("")).join("-");
}

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is not set. Add a long random string to the environment.");
  }
  return "development-only-secret";
}

/** Signs the organiser unlock. Changing the PIN changes pinHash, which logs every device out. */
export function organiserSignature(groupId: number, pinHash: string): string {
  return createHmac("sha256", secret()).update(`organiser:${groupId}:${pinHash}`).digest("base64url");
}

/** Signs an admin's unlock. Changing or removing their PIN logs out only their devices. */
export function adminSignature(groupId: number, personId: number, adminPinHash: string): string {
  const mac = createHmac("sha256", secret()).update(`admin:${groupId}:${personId}:${adminPinHash}`).digest("base64url");
  return `a.${personId}.${mac}`;
}

export function signatureMatches(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
