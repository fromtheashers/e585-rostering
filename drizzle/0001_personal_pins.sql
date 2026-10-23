CREATE TYPE "public"."person_access" AS ENUM('member', 'admin', 'owner');--> statement-breakpoint
ALTER TABLE "groups" ALTER COLUMN "pin_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "pin_hash" text;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "access" "person_access" DEFAULT 'member' NOT NULL;