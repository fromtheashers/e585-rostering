import { test } from "node:test";
import assert from "node:assert/strict";
import { autofill, type AutofillInput } from "./autofill.ts";

const PRAISE = 1;
const WORSHIP = 2;
const GUITAR = 3;
const GAMES = 5;

function base(overrides: Partial<AutofillInput> = {}): AutofillInput {
  return {
    meetings: [{ id: 10, date: "2026-11-06" }],
    roles: [
      { id: PRAISE, required: true, sortOrder: 1 },
      { id: WORSHIP, required: true, sortOrder: 2 },
      { id: GUITAR, required: true, sortOrder: 3 },
      { id: GAMES, required: false, sortOrder: 5 },
    ],
    people: [1, 2, 3, 4].map((id) => ({ id, maxPerMonth: null, defaultAvailability: "yes" as const })),
    availability: new Map(),
    preferences: new Map(),
    existing: [],
    recentCounts: new Map(),
    allowedPairs: [],
    ...overrides,
  };
}

test("fills every role with a different person", () => {
  const out = autofill(base());
  assert.equal(out.length, 4);
  assert.equal(new Set(out.map((s) => s.personId)).size, 4);
});

test("never picks someone who said rather not", () => {
  const preferences = new Map([
    ["1:1", "rather_not" as const],
    ["2:1", "rather_not" as const],
    ["3:1", "rather_not" as const],
  ]);
  const out = autofill(base({ preferences }));
  assert.equal(out.find((s) => s.roleId === PRAISE)?.personId, 4);
});

test("prefers whoever served least, with love as a one-time head start", () => {
  const preferences = new Map([["3:1", "love" as const]]);
  const keen = autofill(base({ preferences, recentCounts: new Map([[1, 1], [2, 1], [3, 1], [4, 1]]) }));
  assert.equal(keen.find((s) => s.roleId === PRAISE)?.personId, 3);
  const tired = autofill(base({ preferences, recentCounts: new Map([[3, 4]]) }));
  assert.notEqual(tired.find((s) => s.roleId === PRAISE)?.personId, 3);

  const fair = autofill(base({ recentCounts: new Map([[1, 4], [2, 1], [3, 3], [4, 2]]) }));
  assert.equal(fair.find((s) => s.roleId === PRAISE)?.personId, 2);
});

test("uses maybe only when nobody marked yes fits", () => {
  const availability = new Map([
    ["1:10", "no" as const],
    ["2:10", "maybe" as const],
    ["3:10", "no" as const],
    ["4:10", "no" as const],
  ]);
  const out = autofill(base({ availability }));
  assert.deepEqual(out, [{ meetingId: 10, roleId: PRAISE, personId: 2 }]);
});

test("optional roles come last and stay empty when nobody is left", () => {
  const people = [1, 2, 3].map((id) => ({ id, maxPerMonth: null, defaultAvailability: "yes" as const }));
  const out = autofill(base({ people }));
  assert.equal(out.length, 3);
  assert.ok(!out.some((s) => s.roleId === GAMES));
});

test("allowed pairs let one person hold two roles", () => {
  const people = [{ id: 1, maxPerMonth: null, defaultAvailability: "yes" as const }];
  const roles = [
    { id: WORSHIP, required: true, sortOrder: 2 },
    { id: GUITAR, required: true, sortOrder: 3 },
  ];
  assert.equal(autofill(base({ people, roles })).length, 1);
  assert.equal(autofill(base({ people, roles, allowedPairs: [[GUITAR, WORSHIP]] })).length, 2);
});

test("respects the monthly cap and keeps existing assignments", () => {
  const meetings = [
    { id: 10, date: "2026-11-06" },
    { id: 11, date: "2026-11-20" },
  ];
  const roles = [{ id: PRAISE, required: true, sortOrder: 1 }];
  const people = [
    { id: 1, maxPerMonth: 1, defaultAvailability: "yes" as const },
    { id: 2, maxPerMonth: null, defaultAvailability: "no" as const },
  ];
  const existing = [{ meetingId: 10, roleId: PRAISE, personId: 1, date: "2026-11-06" }];
  const out = autofill(base({ meetings, roles, people, existing }));
  assert.deepEqual(out, []);
});

test("spreads one keen person across Fridays instead of every week", () => {
  const meetings = ["2026-11-06", "2026-11-13", "2026-11-20", "2026-11-27"].map((date, i) => ({ id: 10 + i, date }));
  const roles = [{ id: PRAISE, required: true, sortOrder: 1 }];
  const preferences = new Map([["1:1", "love" as const]]);
  const out = autofill(base({ meetings, roles, preferences }));
  const byOne = out.filter((s) => s.personId === 1).length;
  assert.ok(byOne < 4, `person 1 got ${byOne} of 4`);
});
