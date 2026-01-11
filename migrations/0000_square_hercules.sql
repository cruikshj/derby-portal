CREATE TABLE "dens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar NOT NULL,
	"name" text NOT NULL,
	"sort_order" text DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "derby_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"rules" text,
	"registration_start_date" date,
	"registration_end_date" date,
	"voting_start_date" date,
	"voting_end_date" date,
	"event_date" date,
	"is_active" boolean DEFAULT true,
	"car_details_visibility" text DEFAULT 'hide',
	"created_by_id" varchar
);
--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar NOT NULL,
	"user_id" varchar,
	"den_id" varchar,
	"participant_name" text NOT NULL,
	"participant_picture_url" text,
	"car_name" text,
	"car_picture_url" text,
	"voting_category_ids" text[],
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "voting_categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort_order" text DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "invite_links" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" varchar(64) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"created_by_id" varchar,
	CONSTRAINT "invite_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"band_user_id" text,
	"name" text NOT NULL,
	"profile_image_url" text,
	"is_admin" boolean DEFAULT false,
	"access_status" varchar(20) DEFAULT 'pending',
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_band_user_id_unique" UNIQUE("band_user_id")
);
--> statement-breakpoint
ALTER TABLE "dens" ADD CONSTRAINT "dens_event_id_derby_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."derby_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "derby_events" ADD CONSTRAINT "derby_events_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_event_id_derby_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."derby_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_den_id_dens_id_fk" FOREIGN KEY ("den_id") REFERENCES "public"."dens"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_categories" ADD CONSTRAINT "voting_categories_event_id_derby_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."derby_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_links" ADD CONSTRAINT "invite_links_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");