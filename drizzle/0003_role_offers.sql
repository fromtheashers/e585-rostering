CREATE TABLE "role_offers" (
	"person_id" integer NOT NULL,
	"meeting_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_offers_person_id_meeting_id_role_id_pk" PRIMARY KEY("person_id","meeting_id","role_id")
);
--> statement-breakpoint
ALTER TABLE "role_offers" ADD CONSTRAINT "role_offers_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_offers" ADD CONSTRAINT "role_offers_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_offers" ADD CONSTRAINT "role_offers_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;