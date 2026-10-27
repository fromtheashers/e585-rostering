import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, scryptSync } from "node:crypto";
import { hashPin, needsRehash, personSignature, signatureMatches, verifyPin } from "./secrets.ts";

// The hashPin used before the move to Workers, kept here to make old-format hashes.
function legacyHashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pin, salt, 32).toString("hex")}`;
}

test("a sign-in is tied to that person and their current PIN", async () => {
  const hash = await hashPin("2468");
  const sig = personSignature(1, 7, hash);
  assert.ok(sig.startsWith("7."));
  assert.ok(signatureMatches(sig, personSignature(1, 7, hash)));
  assert.ok(!signatureMatches(sig, personSignature(1, 8, hash)));
  // A reset or changed PIN gets a new hash, which signs every old device out.
  assert.ok(!signatureMatches(sig, personSignature(1, 7, await hashPin("2468"))));
});

test("new PIN hashes use PBKDF2 and round-trip", async () => {
  const hash = await hashPin("1234");
  assert.match(hash, /^pbkdf2\$100000\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
  assert.ok(await verifyPin("1234", hash));
});

test("a wrong PIN does not verify", async () => {
  const hash = await hashPin("1234");
  assert.ok(!(await verifyPin("4321", hash)));
  assert.ok(!(await verifyPin("1234", "pbkdf2$100000$zz")));
  assert.ok(!(await verifyPin("1234", "")));
});

test("PINs hashed with the old scrypt format still verify", async () => {
  const legacy = legacyHashPin("2580");
  assert.ok(await verifyPin("2580", legacy));
  assert.ok(!(await verifyPin("0852", legacy)));
});

test("only old-format hashes need rehashing", async () => {
  assert.ok(needsRehash(legacyHashPin("2580")));
  assert.ok(needsRehash("pbkdf2$1000$00$00"));
  assert.ok(!needsRehash(await hashPin("2580")));
});
