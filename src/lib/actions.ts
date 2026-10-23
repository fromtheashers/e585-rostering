"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { and, asc, eq, gte, inArray, max } from "drizzle-orm";
import { db, schema } from "@/db";
import type { AvailabilityStatus, Group, Person, PreferenceLevel } from "@/db/schema";
import {
  ORGANISER_COOKIE,
  PERSON_COOKIE,
  activePeople,
  activeRoles,
  availabilityFor,
  currentPerson,
  firstGroup,
  groupByToken,
  isOrganiser,
  preferencesFor,
  recentServingCounts,
} from "./data";
import { hashPin, newLinkToken, organiserSignature, verifyPin } from "./secrets";
import { addDays, isFriday, shortDate, todayIn } from "./dates";
import { autofill } from "./autofill";
import { nextHue } from "./palette";

const { groups, people, roles, meetings, assignments, songs, availability, rolePreferences, activity } = schema;

const YEAR = 60 * 60 * 24 * 365;
const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: YEAR };

export type FormState = { error?: string; ok?: string } | undefined;

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

function int(form: FormData, key: string): number {
  const n = Number(form.get(key));
  if (!Number.isInteger(n)) throw new Error(`Missing ${key}`);
  return n;
}

const STATUSES: AvailabilityStatus[] = ["yes", "maybe", "no"];
const LEVELS: PreferenceLevel[] = ["love", "happy", "rather_not"];

async function load(form: FormData) {
  const token = str(form, "token");
  const [group, me] = await Promise.all([groupByToken(token), currentPerson()]);
  if (!group) throw new Error("This link is no longer valid.");
  return { group, token, me, organiser: await isOrganiser(group) };
}

async function member(form: FormData) {
  const c = await load(form);
  if (!c.me) redirect(`/g/${c.token}/who`);
  return { ...c, me: c.me as Person };
}

async function organiserOnly(form: FormData) {
  const c = await load(form);
  if (!c.organiser) redirect(`/g/${c.token}/organiser/unlock`);
  return c;
}

// The activity feed is written after the response is sent, so a tap never waits on it.
async function log(actor: Person | null, organiser: boolean, message: string) {
  after(async () => {
    await db()
      .insert(activity)
      .values({ actorPersonId: actor?.id ?? null, actorLabel: actor?.name ?? (organiser ? "Organiser" : "Someone"), message });
  });
}

function refresh(token: string) {
  revalidatePath(`/g/${token}`, "layout");
}

async function names(meetingId: number, roleId: number) {
  const [[m], [r]] = await Promise.all([
    db().select().from(meetings).where(eq(meetings.id, meetingId)),
    db().select().from(roles).where(eq(roles.id, roleId)),
  ]);
  return { date: m ? shortDate(m.date) : "a meeting", role: r?.name ?? "a role", meeting: m };
}

/* ---------- Setup ---------- */

const DEFAULT_ROLES = [
  { name: "Praise", description: "Lead the upbeat set", required: true, hasSongs: true },
  { name: "Worship", description: "Lead the slower set", required: true, hasSongs: true },
  { name: "Play Guitar", description: "Accompany the songs", required: true, hasSongs: false },
  { name: "SongSheets", description: "Prepare lyrics and chords", required: true, hasSongs: false },
  { name: "Games", description: "A short opener, if someone is up for it", required: false, hasSongs: false },
];

export async function createGroup(_: FormState, form: FormData): Promise<FormState> {
  if (await firstGroup()) return { error: "This app is already set up. Open the link from your organiser." };
  const name = str(form, "name");
  const pin = str(form, "pin");
  const timezone = str(form, "timezone") || "UTC";
  if (!name) return { error: "Give the group a name." };
  if (!/^\d{4,6}$/.test(pin)) return { error: "The PIN needs to be 4 to 6 digits." };

  const pinHash = hashPin(pin);
  const linkToken = newLinkToken();
  const [group] = await db()
    .insert(groups)
    .values({ name, pinHash, linkToken, timezone, startTime: str(form, "startTime") || "19:30" })
    .returning();
  await db()
    .insert(roles)
    .values(DEFAULT_ROLES.map((r, i) => ({ ...r, sortOrder: i + 1 })));
  (await cookies()).set(ORGANISER_COOKIE, organiserSignature(group.id, group.pinHash), cookieOptions);
  await log(null, true, `set up ${name}`);
  redirect(`/g/${linkToken}/organiser/people?welcome=1`);
}

/* ---------- Identity ---------- */

export async function choosePerson(form: FormData) {
  const { token } = await load(form);
  const id = int(form, "personId");
  const [p] = await db().select().from(people).where(and(eq(people.id, id), eq(people.active, true)));
  if (!p) redirect(`/g/${token}/who`);
  (await cookies()).set(PERSON_COOKIE, String(p.id), cookieOptions);
  const next = str(form, "next");
  redirect(next.startsWith(`/g/${token}`) ? next : `/g/${token}`);
}

export async function forgetPerson(form: FormData) {
  const { token } = await load(form);
  (await cookies()).delete(PERSON_COOKIE);
  redirect(`/g/${token}/who`);
}

// Slows down PIN guessing: five wrong tries from one address locks it out for ten minutes.
const failures = new Map<string, { count: number; until: number }>();

export async function unlock(_: FormState, form: FormData): Promise<FormState> {
  const { group, token } = await load(form);
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const f = failures.get(ip);
  if (f && f.until > Date.now()) return { error: "Too many wrong tries. Wait ten minutes, then try again." };
  if (!verifyPin(str(form, "pin"), group.pinHash)) {
    const count = (f?.count ?? 0) + 1;
    failures.set(ip, { count: count >= 5 ? 0 : count, until: count >= 5 ? Date.now() + 10 * 60_000 : 0 });
    return { error: "That PIN doesn't match. Try again." };
  }
  failures.delete(ip);
  (await cookies()).set(ORGANISER_COOKIE, organiserSignature(group.id, group.pinHash), cookieOptions);
  const next = str(form, "next");
  redirect(next.startsWith(`/g/${token}`) ? next : `/g/${token}/more`);
}

export async function lock(form: FormData) {
  const { token } = await load(form);
  (await cookies()).delete(ORGANISER_COOKIE);
  redirect(`/g/${token}/more`);
}

/* ---------- Roles at a meeting ---------- */

export async function takeRole(form: FormData) {
  const { token, me, organiser } = await member(form);
  const meetingId = int(form, "meetingId");
  const roleId = int(form, "roleId");
  const [existing] = await db()
    .select()
    .from(assignments)
    .where(and(eq(assignments.meetingId, meetingId), eq(assignments.roleId, roleId)));
  if (existing?.status === "confirmed") {
    refresh(token);
    return;
  }
  if (existing) await db().delete(assignments).where(eq(assignments.id, existing.id));
  const [, , n] = await Promise.all([
    db().insert(assignments).values({ meetingId, roleId, personId: me.id, status: "confirmed", source: "self" }),
    db()
      .insert(availability)
      .values({ personId: me.id, meetingId, status: "yes" })
      .onConflictDoUpdate({ target: [availability.personId, availability.meetingId], set: { status: "yes" } }),
    names(meetingId, roleId),
  ]);
  await log(me, organiser, `took ${n.role} for ${n.date}`);
  refresh(token);
}

export async function dropRole(form: FormData) {
  const { token, me, organiser } = await member(form);
  const id = int(form, "assignmentId");
  const [a] = await db().select().from(assignments).where(eq(assignments.id, id));
  if (!a || (a.personId !== me.id && !organiser)) return;
  await db().delete(assignments).where(eq(assignments.id, id));
  if (a.personId === me.id) {
    await db()
      .insert(availability)
      .values({ personId: me.id, meetingId: a.meetingId, status: "no" })
      .onConflictDoUpdate({ target: [availability.personId, availability.meetingId], set: { status: "no" } });
  }
  const n = await names(a.meetingId, a.roleId);
  await log(me, organiser, a.personId === me.id ? `can't make ${n.role} on ${n.date}` : `removed someone from ${n.role} on ${n.date}`);
  refresh(token);
}

export async function assignRole(form: FormData) {
  const { token, me, organiser } = await organiserOnly(form);
  const meetingId = int(form, "meetingId");
  const roleId = int(form, "roleId");
  const personId = Number(form.get("personId"));
  await db().delete(assignments).where(and(eq(assignments.meetingId, meetingId), eq(assignments.roleId, roleId)));
  const n = await names(meetingId, roleId);
  if (Number.isInteger(personId) && personId > 0) {
    await db().insert(assignments).values({ meetingId, roleId, personId, status: "confirmed", source: "organiser" });
    const [p] = await db().select().from(people).where(eq(people.id, personId));
    await log(me, organiser, `put ${p?.name ?? "someone"} on ${n.role} for ${n.date}`);
  } else {
    await log(me, organiser, `cleared ${n.role} for ${n.date}`);
  }
  refresh(token);
}

/* ---------- Availability and preferences ---------- */

export async function setAvailability(form: FormData) {
  const { token, me } = await member(form);
  const meetingId = int(form, "meetingId");
  const status = str(form, "status") as AvailabilityStatus;
  if (!STATUSES.includes(status)) return;
  await db()
    .insert(availability)
    .values({ personId: me.id, meetingId, status })
    .onConflictDoUpdate({ target: [availability.personId, availability.meetingId], set: { status } });
  refresh(token);
}

export async function setDefaultAvailability(form: FormData) {
  const { token, me } = await member(form);
  const status = str(form, "status") as AvailabilityStatus;
  if (!STATUSES.includes(status)) return;
  await db().update(people).set({ defaultAvailability: status }).where(eq(people.id, me.id));
  refresh(token);
}

export async function setPreference(form: FormData) {
  const { token, me } = await member(form);
  const roleId = int(form, "roleId");
  const level = str(form, "level") as PreferenceLevel;
  if (!LEVELS.includes(level)) return;
  await db()
    .insert(rolePreferences)
    .values({ personId: me.id, roleId, level })
    .onConflictDoUpdate({ target: [rolePreferences.personId, rolePreferences.roleId], set: { level } });
  refresh(token);
}

export async function setMaxPerMonth(form: FormData) {
  const { token, me } = await member(form);
  const raw = str(form, "maxPerMonth");
  const n = raw === "" ? null : Number(raw);
  await db()
    .update(people)
    .set({ maxPerMonth: n && n > 0 && n <= 8 ? n : null })
    .where(eq(people.id, me.id));
  refresh(token);
}

/* ---------- Songs ---------- */

async function canEditSet(meetingId: number, setRoleId: number, me: Person, organiser: boolean) {
  if (organiser) return true;
  const [lead] = await db()
    .select()
    .from(assignments)
    .where(and(eq(assignments.meetingId, meetingId), eq(assignments.roleId, setRoleId), eq(assignments.status, "confirmed")));
  return lead?.personId === me.id;
}

async function nextPosition(meetingId: number, setRoleId: number) {
  const [row] = await db()
    .select({ p: max(songs.position) })
    .from(songs)
    .where(and(eq(songs.meetingId, meetingId), eq(songs.setRoleId, setRoleId)));
  return (row?.p ?? 0) + 1;
}

const KEYS = new Set(["", "C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B", "Cm", "C#m", "Dm", "D#m", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "A#m", "Bbm", "Bm"]);

function songFields(form: FormData) {
  const songKey = str(form, "songKey");
  return {
    title: str(form, "title").slice(0, 120),
    artist: str(form, "artist").slice(0, 120),
    songKey: KEYS.has(songKey) ? songKey : "",
  };
}

export async function addSong(_: FormState, form: FormData): Promise<FormState> {
  const { token, me, organiser } = await member(form);
  const meetingId = int(form, "meetingId");
  const setRoleId = int(form, "setRoleId");
  const fields = songFields(form);
  if (!fields.title) return { error: "Add the song's title." };
  if (!(await canEditSet(meetingId, setRoleId, me, organiser))) return { error: "Only this set's leader can add songs here. You can open a song slot instead." };
  await db()
    .insert(songs)
    .values({ meetingId, setRoleId, leaderPersonId: me.id, position: await nextPosition(meetingId, setRoleId), ...fields });
  const n = await names(meetingId, setRoleId);
  await log(me, organiser, `added "${fields.title}" to ${n.role} on ${n.date}`);
  refresh(token);
  return { ok: `Added ${fields.title}` };
}

export async function addOpenSlot(form: FormData) {
  const { token, me, organiser } = await member(form);
  const meetingId = int(form, "meetingId");
  const setRoleId = int(form, "setRoleId");
  await db()
    .insert(songs)
    .values({ meetingId, setRoleId, leaderPersonId: null, position: await nextPosition(meetingId, setRoleId) });
  const n = await names(meetingId, setRoleId);
  await log(me, organiser, `opened a song slot in ${n.role} on ${n.date}`);
  refresh(token);
}

export async function claimSong(form: FormData) {
  const { token, me, organiser } = await member(form);
  const id = int(form, "songId");
  const [s] = await db().select().from(songs).where(eq(songs.id, id));
  if (!s || s.leaderPersonId) {
    refresh(token);
    return;
  }
  await db().update(songs).set({ leaderPersonId: me.id }).where(eq(songs.id, id));
  const n = await names(s.meetingId, s.setRoleId);
  await log(me, organiser, `will lead a song in ${n.role} on ${n.date}`);
  refresh(token);
}

async function songIfEditable(id: number, me: Person, organiser: boolean) {
  const [s] = await db().select().from(songs).where(eq(songs.id, id));
  if (!s) return null;
  if (s.leaderPersonId === me.id || (await canEditSet(s.meetingId, s.setRoleId, me, organiser))) return s;
  return null;
}

export async function updateSong(_: FormState, form: FormData): Promise<FormState> {
  const { token, me, organiser } = await member(form);
  const s = await songIfEditable(int(form, "songId"), me, organiser);
  if (!s) return { error: "Only the song's leader or the set leader can change this." };
  const fields = songFields(form);
  if (!fields.title) return { error: "Add the song's title." };
  await db().update(songs).set(fields).where(eq(songs.id, s.id));
  refresh(token);
  return { ok: "Saved" };
}

export async function releaseSong(form: FormData) {
  const { token, me, organiser } = await member(form);
  const id = int(form, "songId");
  const [s] = await db().select().from(songs).where(eq(songs.id, id));
  if (!s || s.leaderPersonId !== me.id) return;
  await db().update(songs).set({ leaderPersonId: null, title: "", artist: "", songKey: "" }).where(eq(songs.id, id));
  const n = await names(s.meetingId, s.setRoleId);
  await log(me, organiser, `gave up a song slot in ${n.role} on ${n.date}`);
  refresh(token);
}

export async function removeSong(form: FormData) {
  const { token, me, organiser } = await member(form);
  const s = await songIfEditable(int(form, "songId"), me, organiser);
  if (!s) return;
  await db().delete(songs).where(eq(songs.id, s.id));
  refresh(token);
}

export async function moveSong(form: FormData) {
  const { token, me, organiser } = await member(form);
  const s = await songIfEditable(int(form, "songId"), me, organiser);
  if (!s) return;
  const dir = str(form, "dir") === "up" ? -1 : 1;
  const set = await db()
    .select()
    .from(songs)
    .where(and(eq(songs.meetingId, s.meetingId), eq(songs.setRoleId, s.setRoleId)))
    .orderBy(asc(songs.position), asc(songs.id));
  const i = set.findIndex((x) => x.id === s.id);
  const j = i + dir;
  if (j < 0 || j >= set.length) return;
  [set[i], set[j]] = [set[j], set[i]];
  await Promise.all(set.map((x, pos) => db().update(songs).set({ position: pos + 1 }).where(eq(songs.id, x.id))));
  refresh(token);
}

/* ---------- Organiser: Fridays ---------- */

export async function setMeeting(form: FormData) {
  const { token, me, organiser } = await organiserOnly(form);
  const date = str(form, "date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isFriday(date)) return;
  if (str(form, "on") === "1") {
    await db().insert(meetings).values({ date }).onConflictDoNothing();
    await log(me, organiser, `added a meeting on ${shortDate(date)}`);
  } else {
    await db().delete(meetings).where(eq(meetings.date, date));
    await log(me, organiser, `called off the meeting on ${shortDate(date)}`);
  }
  refresh(token);
}

/* ---------- Organiser: roster ---------- */

async function rosterWindow(group: Group) {
  const today = todayIn(group.timezone);
  const rows = await db().select().from(meetings).where(gte(meetings.date, today)).orderBy(asc(meetings.date)).limit(8);
  // Suggest up to ten weeks ahead; further out, availability is mostly guesswork.
  return rows.filter((m) => m.date <= addDays(today, 70));
}

export async function suggestRoster(form: FormData) {
  const { group, token, me, organiser } = await organiserOnly(form);
  const upcoming = await rosterWindow(group);
  if (upcoming.length === 0) return;
  const ids = upcoming.map((m) => m.id);
  const [ppl, rls, avail, prefs, existing, recent] = await Promise.all([
    activePeople(),
    activeRoles(),
    availabilityFor(ids),
    preferencesFor(),
    db().select().from(assignments).where(inArray(assignments.meetingId, ids)),
    recentServingCounts(upcoming[0].date),
  ]);
  const dateOf = new Map(upcoming.map((m) => [m.id, m.date]));
  const out = autofill({
    meetings: upcoming,
    roles: rls,
    people: ppl,
    availability: new Map(avail.map((a) => [`${a.personId}:${a.meetingId}`, a.status])),
    preferences: new Map(prefs.map((p) => [`${p.personId}:${p.roleId}`, p.level])),
    existing: existing.map((e) => ({ ...e, date: dateOf.get(e.meetingId) ?? "" })),
    recentCounts: recent,
    allowedPairs: group.allowedPairs,
  });
  if (out.length > 0) {
    await db()
      .insert(assignments)
      .values(out.map((s) => ({ ...s, status: "suggested" as const, source: "auto" as const })))
      .onConflictDoNothing();
  }
  await log(me, organiser, `asked auto-fill for suggestions (${out.length} pencilled in)`);
  refresh(token);
}

export async function confirmSuggestions(form: FormData) {
  const { token, me, organiser } = await organiserOnly(form);
  const rows = await db().update(assignments).set({ status: "confirmed" }).where(eq(assignments.status, "suggested")).returning();
  await log(me, organiser, `confirmed ${rows.length} suggested ${rows.length === 1 ? "slot" : "slots"}`);
  refresh(token);
}

export async function clearSuggestions(form: FormData) {
  const { token } = await organiserOnly(form);
  await db().delete(assignments).where(eq(assignments.status, "suggested"));
  refresh(token);
}

/* ---------- Organiser: people ---------- */

export async function addPerson(_: FormState, form: FormData): Promise<FormState> {
  const { token, me, organiser } = await organiserOnly(form);
  const name = str(form, "name").slice(0, 60);
  if (!name) return { error: "Type a name first." };
  const everyone = await db().select().from(people);
  if (everyone.some((p) => p.active && p.name.toLowerCase() === name.toLowerCase())) return { error: `${name} is already on the list.` };
  await db()
    .insert(people)
    .values({ name, hue: nextHue(everyone.filter((p) => p.active).map((p) => p.hue)) });
  await log(me, organiser, `added ${name}`);
  refresh(token);
  return { ok: `Added ${name}` };
}

export async function renamePerson(form: FormData) {
  const { token, me, organiser } = await organiserOnly(form);
  const id = int(form, "personId");
  const name = str(form, "name").slice(0, 60);
  if (!name) return;
  const [before] = await db().select().from(people).where(eq(people.id, id));
  await db().update(people).set({ name }).where(eq(people.id, id));
  if (before && before.name !== name) await log(me, organiser, `renamed ${before.name} to ${name}`);
  refresh(token);
}

export async function setPersonHue(form: FormData) {
  const { token } = await organiserOnly(form);
  await db().update(people).set({ hue: int(form, "hue") }).where(eq(people.id, int(form, "personId")));
  refresh(token);
}

export async function setPersonActive(form: FormData) {
  const { group, token, me, organiser } = await organiserOnly(form);
  const id = int(form, "personId");
  const active = str(form, "active") === "1";
  const [p] = await db().update(people).set({ active }).where(eq(people.id, id)).returning();
  if (!active) {
    // Free their future slots so the dashboard shows them as open.
    const today = todayIn(group.timezone);
    const future = await db().select({ id: meetings.id }).from(meetings).where(gte(meetings.date, today));
    if (future.length) {
      await db()
        .delete(assignments)
        .where(and(eq(assignments.personId, id), inArray(assignments.meetingId, future.map((m) => m.id))));
    }
  }
  await log(me, organiser, active ? `brought back ${p?.name}` : `removed ${p?.name} from the list`);
  refresh(token);
}

/* ---------- Organiser: roles ---------- */

export async function addRole(_: FormState, form: FormData): Promise<FormState> {
  const { token, me, organiser } = await organiserOnly(form);
  const name = str(form, "name").slice(0, 40);
  if (!name) return { error: "Name the role first." };
  const [row] = await db().select({ m: max(roles.sortOrder) }).from(roles);
  await db()
    .insert(roles)
    .values({
      name,
      description: str(form, "description").slice(0, 80),
      required: form.get("required") === "on",
      hasSongs: form.get("hasSongs") === "on",
      sortOrder: (row?.m ?? 0) + 1,
    });
  await log(me, organiser, `added the role ${name}`);
  refresh(token);
  return { ok: `Added ${name}` };
}

export async function updateRole(_: FormState, form: FormData): Promise<FormState> {
  const { token } = await organiserOnly(form);
  const name = str(form, "name").slice(0, 40);
  if (!name) return { error: "A role needs a name." };
  await db()
    .update(roles)
    .set({
      name,
      description: str(form, "description").slice(0, 80),
      required: form.get("required") === "on",
      hasSongs: form.get("hasSongs") === "on",
    })
    .where(eq(roles.id, int(form, "roleId")));
  refresh(token);
  return { ok: "Saved" };
}

export async function setRoleActive(form: FormData) {
  const { token, me, organiser } = await organiserOnly(form);
  const active = str(form, "active") === "1";
  const [r] = await db().update(roles).set({ active }).where(eq(roles.id, int(form, "roleId"))).returning();
  await log(me, organiser, active ? `brought back the role ${r?.name}` : `retired the role ${r?.name}`);
  refresh(token);
}

export async function moveRole(form: FormData) {
  const { token } = await organiserOnly(form);
  const id = int(form, "roleId");
  const list = await db().select().from(roles).orderBy(asc(roles.sortOrder), asc(roles.id));
  const i = list.findIndex((r) => r.id === id);
  const j = i + (str(form, "dir") === "up" ? -1 : 1);
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await Promise.all(list.map((r, pos) => db().update(roles).set({ sortOrder: pos + 1 }).where(eq(roles.id, r.id))));
  refresh(token);
}

export async function setPairs(form: FormData) {
  const { group, token } = await organiserOnly(form);
  const pairs = form
    .getAll("pair")
    .map((v) => String(v).split("-").map(Number) as [number, number])
    .filter(([a, b]) => Number.isInteger(a) && Number.isInteger(b) && a !== b);
  await db().update(groups).set({ allowedPairs: pairs }).where(eq(groups.id, group.id));
  refresh(token);
}

/* ---------- Organiser: settings ---------- */

export async function updateSettings(_: FormState, form: FormData): Promise<FormState> {
  const { group, token } = await organiserOnly(form);
  const name = str(form, "name").slice(0, 60);
  const startTime = str(form, "startTime");
  const timezone = str(form, "timezone");
  if (!name) return { error: "The group needs a name." };
  if (!/^\d{2}:\d{2}$/.test(startTime)) return { error: "Pick a start time." };
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone });
  } catch {
    return { error: "That time zone isn't recognised." };
  }
  await db().update(groups).set({ name, startTime, timezone }).where(eq(groups.id, group.id));
  refresh(token);
  return { ok: "Saved" };
}

export async function changePin(_: FormState, form: FormData): Promise<FormState> {
  const { group, token, me, organiser } = await organiserOnly(form);
  const pin = str(form, "pin");
  if (!/^\d{4,6}$/.test(pin)) return { error: "The PIN needs to be 4 to 6 digits." };
  if (pin !== str(form, "confirm")) return { error: "The two PINs don't match." };
  const pinHash = hashPin(pin);
  await db().update(groups).set({ pinHash }).where(eq(groups.id, group.id));
  (await cookies()).set(ORGANISER_COOKIE, organiserSignature(group.id, pinHash), cookieOptions);
  await log(me, organiser, "changed the organiser PIN");
  refresh(token);
  return { ok: "PIN changed. Other devices will need the new PIN." };
}

export async function newLink(form: FormData) {
  const { group, me, organiser } = await organiserOnly(form);
  const linkToken = newLinkToken();
  await db().update(groups).set({ linkToken }).where(eq(groups.id, group.id));
  await log(me, organiser, "made a new group link (the old link stopped working)");
  redirect(`/g/${linkToken}/organiser/settings?newlink=1`);
}
