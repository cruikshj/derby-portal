ALTER TABLE "derby_events" ALTER COLUMN "registration_start_date" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "derby_events" ALTER COLUMN "registration_end_date" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "derby_events" ALTER COLUMN "voting_start_date" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "derby_events" ALTER COLUMN "voting_end_date" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "derby_events" ALTER COLUMN "event_date" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "derby_events" ADD COLUMN "info" text;--> statement-breakpoint
ALTER TABLE "derby_events" ADD COLUMN "weigh_in_date" timestamp with time zone;