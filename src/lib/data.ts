import "server-only";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, gte, inArray, lt, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import type { AvailabilityStatus, Group, Person, PreferenceLevel, Role } from "@/db/schema";
import { adminSignature, organiserSignature, signatureMatches } from "./secrets";
import { addDays, todayIn } from "./dates";

export const PERSON_COOKIE = "e585_person";
export const ORGANISER_COOKIE = "e585_organiser";

const { groups, people, roles, meetings, assignments, songs, availability, rolePreferences, activity } = schema;

export async function firstGroup(): Promise<Group | null> {
  const rows = await db().select().from(groups).orderBy(asc(groups.id)).limit(1);
  return rows[0] ?? null;
}

export async function groupByToken(token: string): Promise<Group | null> {
  const rows = await db().select().from(groups).where(eq(groups.linkToken, token)).limit(1);
  return rows[0] ?? null;
}

export async function isOrganiser(group: Group): Promise<boolean> {
  const value = (await cookies()).get(ORGANISER_COOKIE)?.value;
  if (!value) return false;
  if (!value.startsWith("a.")) return signatureMatches(value, organiserSignature(group.id, group.pinHash));
  // An admin's unlock: still valid only while they are on the list and still an admin.
  const id = Number(value.split(".")[1]);
  if (!Number.isInteger(id)) return false;
  const [p] = await db().select().from(people).where(and(eq(people.id, id), eq(people.active, true))).limit(1);
  return !!p?.adminPinHash && signatureMatches(value, adminSignature(group.id, p.id, p.adminPinHash));
}

export async function currentPerson(): Promise<Person | null> {
  const raw = (await cookies()).get(PERSON_COOKIE)?.value;
  const id = Number(raw);
  if (!raw || !Number.isInteger(id)) return null;
  const rows = await db().select().from(people).where(and(eq(people.id, id), eq(people.active, true))).limit(1);
  return rows[0] ?? null;
}

export interface Ctx {
  group: Group;
  token: string;
  me: Person | null;
  organiser: boolean;
  today: string;
}

/** Loads the group for a link, or shows Not Found so a wrong link reveals nothing. */
export async function context(token: string): Promise<Ctx> {
  const group = await groupByToken(token);
  if (!group) notFound();
  const [me, organiser] = await Promise.all([currentPerson(), isOrganiser(group)]);
  return { group, token, me, organiser, today: todayIn(group.timezone) };
}

export async function activePeople(): Promise<Person[]> {
  return db().select().from(people).where(eq(people.active, true)).orderBy(asc(people.name));
}

export async function allPeople(): Promise<Person[]> {
  return db().select().from(people).orderBy(desc(people.active), asc(people.name));
}

export async function activeRoles(): Promise<Role[]> {
  return db().select().from(roles).where(eq(roles.active, true)).orderBy(asc(roles.sortOrder), asc(roles.id));
}

export async function allRoles(): Promise<Role[]> {
  return db().select().from(roles).orderBy(desc(roles.active), asc(roles.sortOrder), asc(roles.id));
}

export async function upcomingMeetings(today: string, limit = 12) {
  return db().select().from(meetings).where(gte(meetings.date, today)).orderBy(asc(meetings.date)).limit(limit);
}

export async function meetingsBetween(from: string, toExclusive: string) {
  return db()
    .select()
    .from(meetings)
    .where(and(gte(meetings.date, from), lt(meetings.date, toExclusive)))
    .orderBy(asc(meetings.date));
}

export async function meetingByDate(date: string) {
  const rows = await db().select().from(meetings).where(eq(meetings.date, date)).limit(1);
  return rows[0] ?? null;
}

export async function assignmentsFor(meetingIds: number[]) {
  if (meetingIds.length === 0) return [];
  return db().select().from(assignments).where(inArray(assignments.meetingId, meetingIds));
}

export async function songsFor(meetingIds: number[]) {
  if (meetingIds.length === 0) return [];
  return db()
    .select()
    .from(songs)
    .where(inArray(songs.meetingId, meetingIds))
    .orderBy(asc(songs.setRoleId), asc(songs.position), asc(songs.id));
}

export async function availabilityFor(meetingIds: number[]) {
  if (meetingIds.length === 0) return [];
  return db().select().from(availability).where(inArray(availability.meetingId, meetingIds));
}

export async function preferencesFor(personId?: number) {
  const q = db().select().from(rolePreferences);
  return personId ? q.where(eq(rolePreferences.personId, personId)) : q;
}

/** Times each person served in the eight weeks before `day`. */
export async function recentServingCounts(day: string): Promise<Map<number, number>> {
  const rows = await db()
    .select({ personId: assignments.personId })
    .from(assignments)
    .innerJoin(meetings, eq(meetings.id, assignments.meetingId))
    .where(and(gte(meetings.date, addDays(day, -56)), lt(meetings.date, day), eq(assignments.status, "confirmed")));
  const counts = new Map<number, number>();
  for (const r of rows) counts.set(r.personId, (counts.get(r.personId) ?? 0) + 1);
  return counts;
}

/** Songs sung before, newest first, for the add-song suggestions. */
export async function songLibrary(beforeDate: string) {
  const rows = await db()
    .select({ title: songs.title, artist: songs.artist, songKey: songs.songKey, date: meetings.date })
    .from(songs)
    .innerJoin(meetings, eq(meetings.id, songs.meetingId))
    .where(and(ne(songs.title, ""), lt(meetings.date, beforeDate)))
    .orderBy(desc(meetings.date));
  const seen = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const k = r.title.trim().toLowerCase();
    if (!seen.has(k)) seen.set(k, r);
  }
  return [...seen.values()];
}

export async function recentActivity(limit = 40) {
  return db().select().from(activity).orderBy(desc(activity.at)).limit(limit);
}

export function statusOf(
  rows: { personId: number; meetingId: number; status: AvailabilityStatus }[],
  person: Pick<Person, "id" | "defaultAvailability">,
  meetingId: number,
): { status: AvailabilityStatus; explicit: boolean } {
  const row = rows.find((r) => r.personId === person.id && r.meetingId === meetingId);
  return row ? { status: row.status, explicit: true } : { status: person.defaultAvailability, explicit: false };
}

export function levelOf(
  rows: { personId: number; roleId: number; level: PreferenceLevel }[],
  personId: number,
  roleId: number,
): PreferenceLevel | null {
  return rows.find((r) => r.personId === personId && r.roleId === roleId)?.level ?? null;
}
