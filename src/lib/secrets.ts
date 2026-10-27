import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// PBKDF2 runs natively in WebCrypto on both Node and Workers. 100,000 rounds is the most
// Workers allows.
const ITERATIONS = 100_000;
const PREFIX = `pbkdf2$${ITERATIONS}$`;

async function pbkdf2(pin: string, salt: Uint8Array, iterations: number): Promise<Buffer> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new Uint8Array(salt), iterations }, key, 256);
  return Buffer.from(bits);
}

/** Stored as `pbkdf2$<iterations>$<salt hex>$<hash hex>`. */
export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await pbkdf2(pin, salt, ITERATIONS);
  return `${PREFIX}${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  let attempt: Buffer;
  let expected: Buffer;
  if (stored.startsWith("pbkdf2$")) {
    const [, rounds, salt, hash] = stored.split("$");
    const iterations = Number(rounds);
    if (!Number.isInteger(iterations) || iterations < 1 || !salt || !hash) return false;
    attempt = await pbkdf2(pin, Buffer.from(salt, "hex"), iterations);
    expected = Buffer.from(hash, "hex");
  } else {
    // Hashes made before the move to Workers: `<salt hex>:<scrypt hex>`, salted with the hex text itself.
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    attempt = scryptSync(pin, salt, 32);
    expected = Buffer.from(hash, "hex");
  }
  return attempt.length === expected.length && timingSafeEqual(attempt, expected);
}

/** True for an older hash that should be replaced the next time its PIN is entered correctly. */
export function needsRehash(stored: string): boolean {
  return !stored.startsWith(PREFIX);
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
