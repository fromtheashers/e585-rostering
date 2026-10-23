import { test } from "node:test";
import assert from "node:assert/strict";
import { adminSignature, hashPin, organiserSignature, signatureMatches, verifyPin } from "./secrets.ts";

test("an admin's unlock is tied to that person and their current PIN", () => {
  const hash = hashPin("2468");
  const sig = adminSignature(1, 7, hash);
  assert.ok(sig.startsWith("a.7."));
  assert.ok(signatureMatches(sig, adminSignature(1, 7, hash)));
  assert.ok(!signatureMatches(sig, adminSignature(1, 8, hash)));
  assert.ok(!signatureMatches(sig, adminSignature(1, 7, hashPin("2468"))));
  assert.ok(!signatureMatches(sig, organiserSignature(1, hash)));
});

test("PINs verify only against their own hash", () => {
  const hash = hashPin("1234");
  assert.ok(verifyPin("1234", hash));
  assert.ok(!verifyPin("4321", hash));
});
