import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Export auth models (users and sessions tables for Replit Auth)
export * from "./models/auth";

import { users } from "./models/auth";

// Car details visibility options
export const carDetailsVisibilityEnum = ["hide", "show", "show_after_voting"] as const;
export type CarDetailsVisibility = typeof carDetailsVisibilityEnum[number];

// Derby Events table - main event container
export const derbyEvents = pgTable("derby_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  rules: text("rules"),
  info: text("info"),
  registrationStartDate: date("registration_start_date"),
  registrationEndDate: date("registration_end_date"),
  votingStartDate: date("voting_start_date"),
  votingEndDate: date("voting_end_date"),
  eventDate: date("event_date"),
  isActive: boolean("is_active").default(true),
  carDetailsVisibility: text("car_details_visibility").default("hide"),
  createdById: varchar("created_by_id").references(() => users.id),
});

export const derbyEventsRelations = relations(derbyEvents, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [derbyEvents.createdById],
    references: [users.id],
  }),
  dens: many(dens),
  votingCategories: many(votingCategories),
  registrations: many(registrations),
}));

// Dens/Categories table - configurable per event
export const dens = pgTable("dens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => derbyEvents.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: text("sort_order").default("0"),
});

export const densRelations = relations(dens, ({ one, many }) => ({
  event: one(derbyEvents, {
    fields: [dens.eventId],
    references: [derbyEvents.id],
  }),
  registrations: many(registrations),
}));

// Voting Categories table - configurable per event
export const votingCategories = pgTable("voting_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => derbyEvents.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: text("sort_order").default("0"),
});

export const votingCategoriesRelations = relations(votingCategories, ({ one }) => ({
  event: one(derbyEvents, {
    fields: [votingCategories.eventId],
    references: [derbyEvents.id],
  }),
}));

// Registrations table - participant and car info
export const registrations = pgTable("registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => derbyEvents.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id),
  denId: varchar("den_id").references(() => dens.id),
  participantName: text("participant_name").notNull(),
  participantPictureUrl: text("participant_picture_url"),
  carName: text("car_name"),
  carPictureUrl: text("car_picture_url"),
  votingCategoryIds: text("voting_category_ids").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const registrationsRelations = relations(registrations, ({ one }) => ({
  event: one(derbyEvents, {
    fields: [registrations.eventId],
    references: [derbyEvents.id],
  }),
  user: one(users, {
    fields: [registrations.userId],
    references: [users.id],
  }),
  den: one(dens, {
    fields: [registrations.denId],
    references: [dens.id],
  }),
}));

// Insert schemas
export const insertDerbyEventSchema = createInsertSchema(derbyEvents).omit({ id: true });
export const insertDenSchema = createInsertSchema(dens).omit({ id: true });
export const insertVotingCategorySchema = createInsertSchema(votingCategories).omit({ id: true });
export const insertRegistrationSchema = createInsertSchema(registrations).omit({ id: true, createdAt: true });

// Types
export type InsertDerbyEvent = z.infer<typeof insertDerbyEventSchema>;
export type DerbyEvent = typeof derbyEvents.$inferSelect;

export type InsertDen = z.infer<typeof insertDenSchema>;
export type Den = typeof dens.$inferSelect;

export type InsertVotingCategory = z.infer<typeof insertVotingCategorySchema>;
export type VotingCategory = typeof votingCategories.$inferSelect;

export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;
export type Registration = typeof registrations.$inferSelect;

// Extended types for frontend with relations
export type RegistrationWithDen = Registration & {
  den?: Den | null;
  user?: { id: string; name: string } | null;
};

export type DerbyEventWithDetails = DerbyEvent & {
  dens: Den[];
  votingCategories: VotingCategory[];
  registrations: RegistrationWithDen[];
};
