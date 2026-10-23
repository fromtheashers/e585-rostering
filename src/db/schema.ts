import {
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const availabilityStatus = pgEnum("availability_status", ["yes", "maybe", "no"]);
export const preferenceLevel = pgEnum("preference_level", ["love", "happy", "rather_not"]);
export const assignmentStatus = pgEnum("assignment_status", ["suggested", "confirmed"]);
export const assignmentSource = pgEnum("assignment_source", ["self", "organiser", "auto"]);
/** Owner: whoever set up the group. Admins can do everything the owner can, except remove the owner. */
export const personAccess = pgEnum("person_access", ["member", "admin", "owner"]);

/** The one small group. The app holds a single row. */
export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  linkToken: text("link_token").notNull().unique(),
  /** The old shared organiser PIN. Only used once, to claim the owner role on a group set up before people had PINs. */
  pinHash: text("pin_hash"),
  startTime: text("start_time").notNull().default("19:30"),
  timezone: text("timezone").notNull().default("UTC"),
  /** Pairs of role ids one person may hold at the same meeting, e.g. [[1, 3]]. */
  allowedPairs: jsonb("allowed_pairs").$type<[number, number][]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const people = pgTable("people", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  /** Index into the jewel palette, 0 to 9. */
  hue: integer("hue").notNull().default(0),
  maxPerMonth: integer("max_per_month"),
  defaultAvailability: availabilityStatus("default_availability").notNull().default("yes"),
  active: boolean("active").notNull().default(true),
  /** Each person makes their own PIN the first time they pick their name. Null until then. */
  pinHash: text("pin_hash"),
  access: personAccess("access").notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  required: boolean("required").notNull().default(true),
  hasSongs: boolean("has_songs").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

/** A Friday the group meets. Fridays with no row are "No meeting". */
export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  date: date("date", { mode: "string" }).notNull().unique(),
  startTime: text("start_time"),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const availability = pgTable(
  "availability",
  {
    personId: integer("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
    meetingId: integer("meeting_id").notNull().references(() => meetings.id, { onDelete: "cascade" }),
    status: availabilityStatus("status").notNull(),
  },
  (t) => [primaryKey({ columns: [t.personId, t.meetingId] })],
);

export const rolePreferences = pgTable(
  "role_preferences",
  {
    personId: integer("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
    roleId: integer("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
    level: preferenceLevel("level").notNull(),
  },
  (t) => [primaryKey({ columns: [t.personId, t.roleId] })],
);

export const assignments = pgTable(
  "assignments",
  {
    id: serial("id").primaryKey(),
    meetingId: integer("meeting_id").notNull().references(() => meetings.id, { onDelete: "cascade" }),
    roleId: integer("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
    personId: integer("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
    status: assignmentStatus("status").notNull().default("confirmed"),
    source: assignmentSource("source").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("assignments_meeting_role").on(t.meetingId, t.roleId)],
);

/** A song slot in the Praise or Worship set. No leader means an open slot anyone can take. */
export const songs = pgTable("songs", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull().references(() => meetings.id, { onDelete: "cascade" }),
  setRoleId: integer("set_role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  position: integer("position").notNull().default(0),
  leaderPersonId: integer("leader_person_id").references(() => people.id, { onDelete: "set null" }),
  title: text("title").notNull().default(""),
  artist: text("artist").notNull().default(""),
  songKey: text("song_key").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activity = pgTable("activity", {
  id: serial("id").primaryKey(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  actorPersonId: integer("actor_person_id").references(() => people.id, { onDelete: "set null" }),
  actorLabel: text("actor_label").notNull(),
  message: text("message").notNull(),
});

export type Group = typeof groups.$inferSelect;
export type Person = typeof people.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type Meeting = typeof meetings.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Song = typeof songs.$inferSelect;
export type AvailabilityStatus = (typeof availabilityStatus.enumValues)[number];
export type PreferenceLevel = (typeof preferenceLevel.enumValues)[number];
export type PersonAccess = (typeof personAccess.enumValues)[number];
