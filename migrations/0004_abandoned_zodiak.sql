ALTER TABLE "registrations" ADD COLUMN "car_number" integer;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "accepted" boolean DEFAULT false;