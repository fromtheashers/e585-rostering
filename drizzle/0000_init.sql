CREATE TYPE "public"."assignment_source" AS ENUM('self', 'organiser', 'auto');--> statement-breakpoint
CREATE TYPE "public"."assignment_status" AS ENUM('suggested', 'confirmed');--> statement-breakpoint
CREATE TYPE "public"."availability_status" AS ENUM('yes', 'maybe', 'no');--> statement-breakpoint
CREATE TYPE "public"."preference_level" AS ENUM('love', 'happy', 'rather_not');--> statement-breakpoint
CREATE TABLE "activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_person_id" integer,
	"actor_label" text NOT NULL,
	"message" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"person_id" integer NOT NULL,
	"status" "assignment_status" DEFAULT 'confirmed' NOT NULL,
	"source" "assignment_source" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability" (
	"person_id" integer NOT NULL,
	"meeting_id" integer NOT NULL,
	"status" "availability_status" NOT NULL,
	CONSTRAINT "availability_person_id_meeting_id_pk" PRIMARY KEY("person_id","meeting_id")
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"link_token" text NOT NULL,
	"pin_hash" text NOT NULL,
	"start_time" text DEFAULT '19:30' NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"allowed_pairs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "groups_link_token_unique" UNIQUE("link_token")
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"start_time" text,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meetings_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"hue" integer DEFAULT 0 NOT NULL,
	"max_per_month" integer,
	"default_availability" "availability_status" DEFAULT 'yes' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_preferences" (
	"person_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"level" "preference_level" NOT NULL,
	CONSTRAINT "role_preferences_person_id_role_id_pk" PRIMARY KEY("person_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"has_songs" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "songs" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" integer NOT NULL,
	"set_role_id" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"leader_person_id" integer,
	"title" text DEFAULT '' NOT NULL,
	"artist" text DEFAULT '' NOT NULL,
	"song_key" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_actor_person_id_people_id_fk" FOREIGN KEY ("actor_person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_preferences" ADD CONSTRAINT "role_preferences_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_preferences" ADD CONSTRAINT "role_preferences_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "songs" ADD CONSTRAINT "songs_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "songs" ADD CONSTRAINT "songs_set_role_id_roles_id_fk" FOREIGN KEY ("set_role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "songs" ADD CONSTRAINT "songs_leader_person_id_people_id_fk" FOREIGN KEY ("leader_person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assignments_meeting_role" ON "assignments" USING btree ("meeting_id","role_id");