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

/**
 * The "this device is signed in as" cookie: person id plus a signature over their PIN hash.
 * Changing or resetting someone's PIN signs out every device they were on.
 */
export function personSignature(groupId: number, personId: number, pinHash: string): string {
  const mac = createHmac("sha256", secret()).update(`person:${groupId}:${personId}:${pinHash}`).digest("base64url");
  return `${personId}.${mac}`;
}

export function signatureMatches(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
