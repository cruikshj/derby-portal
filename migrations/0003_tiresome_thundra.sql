CREATE TABLE "event_votes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by_id" varchar,
	"published_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vote_ballot_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ballot_id" varchar NOT NULL,
	"voting_category_id" varchar NOT NULL,
	"selected_registration_id" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vote_ballots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_vote_id" varchar NOT NULL,
	"voter_registration_id" varchar NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vote_category_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_vote_id" varchar NOT NULL,
	"voting_category_id" varchar NOT NULL,
	"registration_id" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vote_results" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_vote_id" varchar NOT NULL,
	"voting_category_id" varchar NOT NULL,
	"winner_registration_id" varchar NOT NULL,
	"vote_count" integer DEFAULT 0,
	"is_override" boolean DEFAULT false
);
--> statement-breakpoint
ALTER TABLE "event_votes" ADD CONSTRAINT "event_votes_event_id_derby_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."derby_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_votes" ADD CONSTRAINT "event_votes_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_ballot_entries" ADD CONSTRAINT "vote_ballot_entries_ballot_id_vote_ballots_id_fk" FOREIGN KEY ("ballot_id") REFERENCES "public"."vote_ballots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_ballot_entries" ADD CONSTRAINT "vote_ballot_entries_voting_category_id_voting_categories_id_fk" FOREIGN KEY ("voting_category_id") REFERENCES "public"."voting_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_ballot_entries" ADD CONSTRAINT "vote_ballot_entries_selected_registration_id_registrations_id_fk" FOREIGN KEY ("selected_registration_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_ballots" ADD CONSTRAINT "vote_ballots_event_vote_id_event_votes_id_fk" FOREIGN KEY ("event_vote_id") REFERENCES "public"."event_votes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_ballots" ADD CONSTRAINT "vote_ballots_voter_registration_id_registrations_id_fk" FOREIGN KEY ("voter_registration_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_category_entries" ADD CONSTRAINT "vote_category_entries_event_vote_id_event_votes_id_fk" FOREIGN KEY ("event_vote_id") REFERENCES "public"."event_votes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_category_entries" ADD CONSTRAINT "vote_category_entries_voting_category_id_voting_categories_id_fk" FOREIGN KEY ("voting_category_id") REFERENCES "public"."voting_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_category_entries" ADD CONSTRAINT "vote_category_entries_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_results" ADD CONSTRAINT "vote_results_event_vote_id_event_votes_id_fk" FOREIGN KEY ("event_vote_id") REFERENCES "public"."event_votes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_results" ADD CONSTRAINT "vote_results_voting_category_id_voting_categories_id_fk" FOREIGN KEY ("voting_category_id") REFERENCES "public"."voting_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_results" ADD CONSTRAINT "vote_results_winner_registration_id_registrations_id_fk" FOREIGN KEY ("winner_registration_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;