CREATE TABLE "racing_award_results" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"racing_award_id" varchar NOT NULL,
	"winner_registration_id" varchar NOT NULL,
	"published" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "racing_awards" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort_order" text DEFAULT '0'
);
--> statement-breakpoint
ALTER TABLE "racing_award_results" ADD CONSTRAINT "racing_award_results_racing_award_id_racing_awards_id_fk" FOREIGN KEY ("racing_award_id") REFERENCES "public"."racing_awards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "racing_award_results" ADD CONSTRAINT "racing_award_results_winner_registration_id_registrations_id_fk" FOREIGN KEY ("winner_registration_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "racing_awards" ADD CONSTRAINT "racing_awards_event_id_derby_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."derby_events"("id") ON DELETE cascade ON UPDATE no action;