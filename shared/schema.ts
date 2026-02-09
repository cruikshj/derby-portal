import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Export auth models (users and sessions tables for Replit Auth)
export * from "./models/auth";

import { users } from "./models/auth";

// Car details visibility options
export const carDetailsVisibilityEnum = ["hide", "show", "show_after_voting"] as const;
export type CarDetailsVisibility = typeof carDetailsVisibilityEnum[number];

// Participant photos visibility options
export const participantPhotosVisibilityEnum = ["hide", "show", "show_after_voting"] as const;
export type ParticipantPhotosVisibility = typeof participantPhotosVisibilityEnum[number];

// Derby Events table - main event container
export const derbyEvents = pgTable("derby_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  rules: text("rules"),
  info: text("info"),
  registrationStartDate: timestamp("registration_start_date", { withTimezone: true }),
  registrationEndDate: timestamp("registration_end_date", { withTimezone: true }),
  votingStartDate: timestamp("voting_start_date", { withTimezone: true }),
  votingEndDate: timestamp("voting_end_date", { withTimezone: true }),
  weighInDate: timestamp("weigh_in_date", { withTimezone: true }),
  eventDate: timestamp("event_date", { withTimezone: true }),
  isActive: boolean("is_active").default(true),
  carDetailsVisibility: text("car_details_visibility").default("hide"),
  participantPhotosVisibility: text("participant_photos_visibility").default("show"),
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
  notes: text("notes"),
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

// Event Votes table - a vote instance created by admin for an event
export const eventVotesStatusEnum = ["draft", "open", "closed", "published"] as const;
export type EventVoteStatus = typeof eventVotesStatusEnum[number];

export const eventVotes = pgTable("event_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => derbyEvents.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("draft"),
  createdById: varchar("created_by_id").references(() => users.id),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const eventVotesRelations = relations(eventVotes, ({ one, many }) => ({
  event: one(derbyEvents, {
    fields: [eventVotes.eventId],
    references: [derbyEvents.id],
  }),
  createdBy: one(users, {
    fields: [eventVotes.createdById],
    references: [users.id],
  }),
  categoryEntries: many(voteCategoryEntries),
  ballots: many(voteBallots),
  results: many(voteResults),
}));

// Vote Category Entries - which cars (registrations) are in each voting category
export const voteCategoryEntries = pgTable("vote_category_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventVoteId: varchar("event_vote_id").notNull().references(() => eventVotes.id, { onDelete: "cascade" }),
  votingCategoryId: varchar("voting_category_id").notNull().references(() => votingCategories.id, { onDelete: "cascade" }),
  registrationId: varchar("registration_id").notNull().references(() => registrations.id, { onDelete: "cascade" }),
});

export const voteCategoryEntriesRelations = relations(voteCategoryEntries, ({ one }) => ({
  eventVote: one(eventVotes, {
    fields: [voteCategoryEntries.eventVoteId],
    references: [eventVotes.id],
  }),
  votingCategory: one(votingCategories, {
    fields: [voteCategoryEntries.votingCategoryId],
    references: [votingCategories.id],
  }),
  registration: one(registrations, {
    fields: [voteCategoryEntries.registrationId],
    references: [registrations.id],
  }),
}));

// Vote Ballots - each participant's vote submission
export const voteBallots = pgTable("vote_ballots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventVoteId: varchar("event_vote_id").notNull().references(() => eventVotes.id, { onDelete: "cascade" }),
  voterRegistrationId: varchar("voter_registration_id").notNull().references(() => registrations.id, { onDelete: "cascade" }),
  completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow(),
});

export const voteBallotsRelations = relations(voteBallots, ({ one, many }) => ({
  eventVote: one(eventVotes, {
    fields: [voteBallots.eventVoteId],
    references: [eventVotes.id],
  }),
  voterRegistration: one(registrations, {
    fields: [voteBallots.voterRegistrationId],
    references: [registrations.id],
  }),
  entries: many(voteBallotEntries),
}));

// Vote Ballot Entries - individual choices per category
export const voteBallotEntries = pgTable("vote_ballot_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ballotId: varchar("ballot_id").notNull().references(() => voteBallots.id, { onDelete: "cascade" }),
  votingCategoryId: varchar("voting_category_id").notNull().references(() => votingCategories.id, { onDelete: "cascade" }),
  selectedRegistrationId: varchar("selected_registration_id").notNull().references(() => registrations.id, { onDelete: "cascade" }),
});

export const voteBallotEntriesRelations = relations(voteBallotEntries, ({ one }) => ({
  ballot: one(voteBallots, {
    fields: [voteBallotEntries.ballotId],
    references: [voteBallots.id],
  }),
  votingCategory: one(votingCategories, {
    fields: [voteBallotEntries.votingCategoryId],
    references: [votingCategories.id],
  }),
  selectedRegistration: one(registrations, {
    fields: [voteBallotEntries.selectedRegistrationId],
    references: [registrations.id],
  }),
}));

// Vote Results - admin-publishable results per category
export const voteResults = pgTable("vote_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventVoteId: varchar("event_vote_id").notNull().references(() => eventVotes.id, { onDelete: "cascade" }),
  votingCategoryId: varchar("voting_category_id").notNull().references(() => votingCategories.id, { onDelete: "cascade" }),
  winnerRegistrationId: varchar("winner_registration_id").notNull().references(() => registrations.id, { onDelete: "cascade" }),
  voteCount: integer("vote_count").default(0),
  isOverride: boolean("is_override").default(false),
});

export const voteResultsRelations = relations(voteResults, ({ one }) => ({
  eventVote: one(eventVotes, {
    fields: [voteResults.eventVoteId],
    references: [eventVotes.id],
  }),
  votingCategory: one(votingCategories, {
    fields: [voteResults.votingCategoryId],
    references: [votingCategories.id],
  }),
  winnerRegistration: one(registrations, {
    fields: [voteResults.winnerRegistrationId],
    references: [registrations.id],
  }),
}));

// Insert schemas
export const insertDerbyEventSchema = createInsertSchema(derbyEvents).omit({ id: true });
export const insertDenSchema = createInsertSchema(dens).omit({ id: true });
export const insertVotingCategorySchema = createInsertSchema(votingCategories).omit({ id: true });
export const insertRegistrationSchema = createInsertSchema(registrations).omit({ id: true, createdAt: true });
export const insertEventVoteSchema = createInsertSchema(eventVotes).omit({ id: true, createdAt: true });
export const insertVoteCategoryEntrySchema = createInsertSchema(voteCategoryEntries).omit({ id: true });
export const insertVoteBallotSchema = createInsertSchema(voteBallots).omit({ id: true, completedAt: true });
export const insertVoteBallotEntrySchema = createInsertSchema(voteBallotEntries).omit({ id: true });
export const insertVoteResultSchema = createInsertSchema(voteResults).omit({ id: true });

// Types
export type InsertDerbyEvent = z.infer<typeof insertDerbyEventSchema>;
export type DerbyEvent = typeof derbyEvents.$inferSelect;

export type InsertDen = z.infer<typeof insertDenSchema>;
export type Den = typeof dens.$inferSelect;

export type InsertVotingCategory = z.infer<typeof insertVotingCategorySchema>;
export type VotingCategory = typeof votingCategories.$inferSelect;

export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;
export type Registration = typeof registrations.$inferSelect;

export type InsertEventVote = z.infer<typeof insertEventVoteSchema>;
export type EventVote = typeof eventVotes.$inferSelect;

export type InsertVoteCategoryEntry = z.infer<typeof insertVoteCategoryEntrySchema>;
export type VoteCategoryEntry = typeof voteCategoryEntries.$inferSelect;

export type InsertVoteBallot = z.infer<typeof insertVoteBallotSchema>;
export type VoteBallot = typeof voteBallots.$inferSelect;

export type InsertVoteBallotEntry = z.infer<typeof insertVoteBallotEntrySchema>;
export type VoteBallotEntry = typeof voteBallotEntries.$inferSelect;

export type InsertVoteResult = z.infer<typeof insertVoteResultSchema>;
export type VoteResult = typeof voteResults.$inferSelect;

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

export type EventVoteWithDetails = EventVote & {
  categoryEntries: (VoteCategoryEntry & {
    registration?: { id: string; carName: string | null; carPictureUrl: string | null; participantName: string };
  })[];
  results: (VoteResult & {
    registration?: { id: string; carName: string | null; carPictureUrl: string | null; participantName: string };
  })[];
};

export type VoteTally = {
  votingCategoryId: string;
  registrationId: string;
  carName: string | null;
  carPictureUrl: string | null;
  participantName: string;
  voteCount: number;
};
