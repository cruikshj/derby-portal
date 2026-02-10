ALTER TABLE "registrations" ADD COLUMN "car_number" integer;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "accepted" boolean DEFAULT false;--> statement-breakpoint

-- Backfill car numbers for existing registrations (sequential per event, ordered by created_at)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY created_at ASC) AS rn
  FROM registrations
  WHERE car_number IS NULL
)
UPDATE registrations
SET car_number = numbered.rn
FROM numbered
WHERE registrations.id = numbered.id;