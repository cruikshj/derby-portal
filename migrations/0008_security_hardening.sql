ALTER TABLE "derby_events" DROP CONSTRAINT "derby_events_created_by_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "event_votes" DROP CONSTRAINT "event_votes_created_by_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "registrations" DROP CONSTRAINT "registrations_den_id_dens_id_fk";
--> statement-breakpoint
ALTER TABLE "invite_links" DROP CONSTRAINT "invite_links_created_by_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "dens" ALTER COLUMN "sort_order" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "dens" ALTER COLUMN "sort_order" SET DATA TYPE integer USING NULLIF(regexp_replace(COALESCE("sort_order", '0'), '[^0-9-]', '', 'g'), '')::integer;--> statement-breakpoint
ALTER TABLE "dens" ALTER COLUMN "sort_order" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "racing_awards" ALTER COLUMN "sort_order" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "racing_awards" ALTER COLUMN "sort_order" SET DATA TYPE integer USING NULLIF(regexp_replace(COALESCE("sort_order", '0'), '[^0-9-]', '', 'g'), '')::integer;--> statement-breakpoint
ALTER TABLE "racing_awards" ALTER COLUMN "sort_order" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "voting_categories" ALTER COLUMN "sort_order" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "voting_categories" ALTER COLUMN "sort_order" SET DATA TYPE integer USING NULLIF(regexp_replace(COALESCE("sort_order", '0'), '[^0-9-]', '', 'g'), '')::integer;--> statement-breakpoint
ALTER TABLE "voting_categories" ALTER COLUMN "sort_order" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "derby_events" ADD CONSTRAINT "derby_events_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_votes" ADD CONSTRAINT "event_votes_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_den_id_dens_id_fk" FOREIGN KEY ("den_id") REFERENCES "public"."dens"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_links" ADD CONSTRAINT "invite_links_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Renumber any duplicate car numbers (possible from the old read-then-insert race) before enforcing uniqueness
WITH dups AS (
  SELECT id, event_id,
         ROW_NUMBER() OVER (PARTITION BY event_id, car_number ORDER BY created_at, id) AS rn
  FROM registrations
  WHERE car_number IS NOT NULL
),
maxes AS (
  SELECT event_id, MAX(car_number) AS max_number FROM registrations GROUP BY event_id
),
renumber AS (
  SELECT d.id, m.max_number + ROW_NUMBER() OVER (PARTITION BY d.event_id ORDER BY d.id) AS new_number
  FROM dups d JOIN maxes m ON m.event_id = d.event_id
  WHERE d.rn > 1
)
UPDATE registrations r SET car_number = renumber.new_number FROM renumber WHERE r.id = renumber.id;--> statement-breakpoint
-- Keep only the earliest ballot per participant per vote before enforcing one ballot each
DELETE FROM vote_ballots b
USING vote_ballots earlier
WHERE earlier.event_vote_id = b.event_vote_id
  AND earlier.voter_registration_id = b.voter_registration_id
  AND (earlier.completed_at < b.completed_at OR (earlier.completed_at = b.completed_at AND earlier.id < b.id));--> statement-breakpoint
CREATE UNIQUE INDEX "registrations_event_car_number_unique" ON "registrations" USING btree ("event_id","car_number");--> statement-breakpoint
CREATE UNIQUE INDEX "vote_ballots_vote_voter_unique" ON "vote_ballots" USING btree ("event_vote_id","voter_registration_id");
