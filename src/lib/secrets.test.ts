import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPin, personSignature, signatureMatches, verifyPin } from "./secrets.ts";

test("a sign-in is tied to that person and their current PIN", () => {
  const hash = hashPin("2468");
  const sig = personSignature(1, 7, hash);
  assert.ok(sig.startsWith("7."));
  assert.ok(signatureMatches(sig, personSignature(1, 7, hash)));
  assert.ok(!signatureMatches(sig, personSignature(1, 8, hash)));
  // A reset or changed PIN gets a new hash, which signs every old device out.
  assert.ok(!signatureMatches(sig, personSignature(1, 7, hashPin("2468"))));
});

test("PINs verify only against their own hash", () => {
  const hash = hashPin("1234");
  assert.ok(verifyPin("1234", hash));
  assert.ok(!verifyPin("4321", hash));
});
