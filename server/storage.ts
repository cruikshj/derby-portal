import {
  users, derbyEvents, dens, votingCategories, registrations,
  eventVotes, voteCategoryEntries, voteBallots, voteBallotEntries, voteResults,
  racingAwards, racingAwardResults,
  type User, type UpsertUser,
  type DerbyEvent, type InsertDerbyEvent, type UpdateDerbyEvent,
  type Den, type InsertDen,
  type VotingCategory, type InsertVotingCategory,
  type Registration, type InsertRegistration, type UpdateRegistration,
  type DerbyEventWithDetails, type DerbyEventSummary, type RegistrationWithDen,
  type EventVote, type InsertEventVote, type EventVoteWithDetails,
  type VoteCategoryEntry, type InsertVoteCategoryEntry,
  type VoteBallot, type InsertVoteBallot,
  type VoteBallotEntry, type InsertVoteBallotEntry,
  type VoteResult, type InsertVoteResult,
  type VoteTally,
  type RacingAward, type InsertRacingAward,
  type RacingAwardResult, type InsertRacingAwardResult,
  type RacingAwardWithResult,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, count, inArray } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserAdmin(id: string, isAdmin: boolean): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;

  // Events
  getEvents(): Promise<DerbyEvent[]>;
  getEvent(id: string): Promise<DerbyEvent | undefined>;
  getEventWithDetails(id: string): Promise<DerbyEventWithDetails | undefined>;
  getActiveEvent(): Promise<DerbyEventWithDetails | undefined>;
  getActiveEventSummary(): Promise<DerbyEventSummary | undefined>;
  createEvent(event: InsertDerbyEvent): Promise<DerbyEvent>;
  updateEvent(id: string, event: UpdateDerbyEvent): Promise<DerbyEvent | undefined>;
  deleteEvent(id: string): Promise<void>;

  // Dens
  getDensByEvent(eventId: string): Promise<Den[]>;
  createDen(den: InsertDen): Promise<Den>;
  deleteDen(id: string): Promise<void>;

  // Voting Categories
  getVotingCategoriesByEvent(eventId: string): Promise<VotingCategory[]>;
  createVotingCategory(category: InsertVotingCategory): Promise<VotingCategory>;
  deleteVotingCategory(id: string): Promise<void>;

  // Registrations
  getRegistrationsByEvent(eventId: string): Promise<RegistrationWithDen[]>;
  getRegistrationsByUser(userId: string, eventId: string): Promise<RegistrationWithDen[]>;
  getRegistration(id: string): Promise<Registration | undefined>;
  getRegistrationWithDen(id: string): Promise<RegistrationWithDen | undefined>;
  createRegistration(registration: InsertRegistration): Promise<Registration>;
  updateRegistration(id: string, registration: UpdateRegistration & { accepted?: boolean; participantPictureUrl?: string | null; carPictureUrl?: string | null }): Promise<Registration | undefined>;
  deleteRegistration(id: string): Promise<void>;

  // Event Votes
  getEventVoteByEvent(eventId: string): Promise<EventVote | undefined>;
  getEventVoteWithDetails(eventVoteId: string): Promise<EventVoteWithDetails | undefined>;
  createEventVote(vote: InsertEventVote): Promise<EventVote>;
  updateEventVoteStatus(id: string, status: string, publishedAt?: Date): Promise<EventVote | undefined>;
  deleteEventVote(id: string): Promise<void>;
  clearEventVoteBallots(eventVoteId: string): Promise<void>;

  // Vote Category Entries
  getVoteCategoryEntries(eventVoteId: string): Promise<VoteCategoryEntry[]>;
  addVoteCategoryEntry(entry: InsertVoteCategoryEntry): Promise<VoteCategoryEntry>;
  removeVoteCategoryEntry(eventVoteId: string, votingCategoryId: string, registrationId: string): Promise<void>;
  setVoteCategoryEntries(eventVoteId: string, votingCategoryId: string, registrationIds: string[]): Promise<void>;

  // Vote Ballots
  getBallotsByVoter(eventVoteId: string, voterRegistrationId: string): Promise<VoteBallot | undefined>;
  getBallotsByEvent(eventVoteId: string): Promise<VoteBallot[]>;
  createBallotWithEntries(ballot: InsertVoteBallot, entries: Omit<InsertVoteBallotEntry, "ballotId">[]): Promise<VoteBallot>;

  // Vote Results
  getVoteResults(eventVoteId: string): Promise<VoteResult[]>;
  getVoteTally(eventVoteId: string): Promise<VoteTally[]>;
  setVoteResults(eventVoteId: string, results: Omit<InsertVoteResult, "eventVoteId">[]): Promise<VoteResult[]>;

  // Racing Awards
  getRacingAwardsByEvent(eventId: string): Promise<RacingAward[]>;
  getRacingAward(id: string): Promise<RacingAward | undefined>;
  createRacingAward(award: InsertRacingAward): Promise<RacingAward>;
  deleteRacingAward(id: string): Promise<void>;
  getRacingAwardsWithResults(eventId: string): Promise<RacingAwardWithResult[]>;
  setRacingAwardResult(racingAwardId: string, winnerRegistrationId: string): Promise<RacingAwardResult>;
  removeRacingAwardResult(racingAwardId: string): Promise<void>;
  publishRacingAwardResults(eventId: string, published: boolean): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async createUser(insertUser: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(users.createdAt);
  }

  async updateUserAdmin(id: string, isAdmin: boolean): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ isAdmin, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Events
  async getEvents(): Promise<DerbyEvent[]> {
    return db.select().from(derbyEvents).orderBy(desc(derbyEvents.eventDate));
  }

  async getEvent(id: string): Promise<DerbyEvent | undefined> {
    const [event] = await db.select().from(derbyEvents).where(eq(derbyEvents.id, id));
    return event || undefined;
  }

  async getEventWithDetails(id: string): Promise<DerbyEventWithDetails | undefined> {
    const event = await this.getEvent(id);
    if (!event) return undefined;

    const eventDens = await this.getDensByEvent(id);
    const eventCategories = await this.getVotingCategoriesByEvent(id);
    const eventRegistrations = await this.getRegistrationsByEvent(id);

    return {
      ...event,
      dens: eventDens,
      votingCategories: eventCategories,
      registrations: eventRegistrations,
    };
  }

  async getActiveEvent(): Promise<DerbyEventWithDetails | undefined> {
    const [event] = await db.select().from(derbyEvents).where(eq(derbyEvents.isActive, true)).limit(1);
    if (!event) return undefined;
    return this.getEventWithDetails(event.id);
  }

  async getActiveEventSummary(): Promise<DerbyEventSummary | undefined> {
    const [event] = await db.select().from(derbyEvents).where(eq(derbyEvents.isActive, true)).limit(1);
    if (!event) return undefined;

    const eventDens = await this.getDensByEvent(event.id);
    const eventCategories = await this.getVotingCategoriesByEvent(event.id);

    return {
      ...event,
      rules: null,
      info: null,
      dens: eventDens,
      votingCategories: eventCategories,
      hasRules: !!(event.rules && event.rules.trim().length > 0),
      hasInfo: !!(event.info && event.info.trim().length > 0),
    };
  }

  async createEvent(insertEvent: InsertDerbyEvent & { createdById?: string | null }): Promise<DerbyEvent> {
    return db.transaction(async (tx) => {
      // Only one event may be active at a time
      if (insertEvent.isActive) {
        await tx.update(derbyEvents).set({ isActive: false });
      }
      const [event] = await tx.insert(derbyEvents).values(insertEvent).returning();
      return event;
    });
  }

  async updateEvent(id: string, updates: UpdateDerbyEvent): Promise<DerbyEvent | undefined> {
    if (Object.keys(updates).length === 0) {
      return this.getEvent(id);
    }
    return db.transaction(async (tx) => {
      if (updates.isActive) {
        await tx.update(derbyEvents).set({ isActive: false });
      }
      const [event] = await tx.update(derbyEvents).set(updates).where(eq(derbyEvents.id, id)).returning();
      return event || undefined;
    });
  }

  async deleteEvent(id: string): Promise<void> {
    await db.delete(derbyEvents).where(eq(derbyEvents.id, id));
  }

  // Dens
  async getDensByEvent(eventId: string): Promise<Den[]> {
    return db.select().from(dens).where(eq(dens.eventId, eventId)).orderBy(dens.sortOrder);
  }

  async createDen(insertDen: InsertDen): Promise<Den> {
    const [den] = await db.insert(dens).values(insertDen).returning();
    return den;
  }

  async deleteDen(id: string): Promise<void> {
    await db.delete(dens).where(eq(dens.id, id));
  }

  // Voting Categories
  async getVotingCategoriesByEvent(eventId: string): Promise<VotingCategory[]> {
    return db.select().from(votingCategories).where(eq(votingCategories.eventId, eventId)).orderBy(votingCategories.sortOrder);
  }

  async createVotingCategory(insertCategory: InsertVotingCategory): Promise<VotingCategory> {
    const [category] = await db.insert(votingCategories).values(insertCategory).returning();
    return category;
  }

  async deleteVotingCategory(id: string): Promise<void> {
    await db.delete(votingCategories).where(eq(votingCategories.id, id));
  }

  // Registrations
  async getRegistrationsByEvent(eventId: string): Promise<RegistrationWithDen[]> {
    const regs = await db
      .select({
        registration: registrations,
        den: dens,
        user: {
          id: users.id,
          name: users.name,
        },
      })
      .from(registrations)
      .leftJoin(dens, eq(registrations.denId, dens.id))
      .leftJoin(users, eq(registrations.userId, users.id))
      .where(eq(registrations.eventId, eventId))
      .orderBy(desc(registrations.createdAt));

    return regs.map((r) => ({
      ...r.registration,
      den: r.den,
      user: r.user,
    }));
  }

  async getRegistrationsByUser(userId: string, eventId: string): Promise<RegistrationWithDen[]> {
    const regs = await db
      .select({
        registration: registrations,
        den: dens,
      })
      .from(registrations)
      .leftJoin(dens, eq(registrations.denId, dens.id))
      .where(and(eq(registrations.userId, userId), eq(registrations.eventId, eventId)))
      .orderBy(desc(registrations.createdAt));

    return regs.map((r) => ({
      ...r.registration,
      den: r.den,
    }));
  }

  async getRegistration(id: string): Promise<Registration | undefined> {
    const [registration] = await db.select().from(registrations).where(eq(registrations.id, id));
    return registration || undefined;
  }

  async getRegistrationWithDen(id: string): Promise<RegistrationWithDen | undefined> {
    const [result] = await db
      .select({
        registration: registrations,
        den: dens,
      })
      .from(registrations)
      .leftJoin(dens, eq(registrations.denId, dens.id))
      .where(eq(registrations.id, id));

    if (!result) return undefined;
    return {
      ...result.registration,
      den: result.den,
    };
  }

  async createRegistration(insertReg: InsertRegistration): Promise<Registration> {
    return db.transaction(async (tx) => {
      // Serialise registrations per event so concurrent sign-ups never share a car number
      await tx.execute(sql`SELECT id FROM ${derbyEvents} WHERE id = ${insertReg.eventId} FOR UPDATE`);
      const [lastReg] = await tx
        .select({ carNumber: registrations.carNumber })
        .from(registrations)
        .where(eq(registrations.eventId, insertReg.eventId))
        .orderBy(desc(registrations.carNumber))
        .limit(1);

      const nextCarNumber = (lastReg?.carNumber || 0) + 1;
      const [registration] = await tx
        .insert(registrations)
        .values({ ...insertReg, carNumber: nextCarNumber })
        .returning();
      return registration;
    });
  }

  async updateRegistration(
    id: string,
    updates: UpdateRegistration & { accepted?: boolean; participantPictureUrl?: string | null; carPictureUrl?: string | null },
  ): Promise<Registration | undefined> {
    if (Object.keys(updates).length === 0) {
      return this.getRegistration(id);
    }
    const [registration] = await db.update(registrations).set(updates).where(eq(registrations.id, id)).returning();
    return registration || undefined;
  }

  async deleteRegistration(id: string): Promise<void> {
    await db.delete(registrations).where(eq(registrations.id, id));
  }

  // Event Votes
  async getEventVoteByEvent(eventId: string): Promise<EventVote | undefined> {
    const [vote] = await db.select().from(eventVotes).where(eq(eventVotes.eventId, eventId)).limit(1);
    return vote || undefined;
  }

  async getEventVoteWithDetails(eventVoteId: string): Promise<EventVoteWithDetails | undefined> {
    const [vote] = await db.select().from(eventVotes).where(eq(eventVotes.id, eventVoteId));
    if (!vote) return undefined;

    const entries = await db
      .select({
        entry: voteCategoryEntries,
        registration: {
          id: registrations.id,
          carName: registrations.carName,
          carPictureUrl: registrations.carPictureUrl,
          participantName: registrations.participantName,
        },
      })
      .from(voteCategoryEntries)
      .leftJoin(registrations, eq(voteCategoryEntries.registrationId, registrations.id))
      .where(eq(voteCategoryEntries.eventVoteId, eventVoteId));

    const resultsData = await db
      .select({
        result: voteResults,
        registration: {
          id: registrations.id,
          carName: registrations.carName,
          carPictureUrl: registrations.carPictureUrl,
          participantName: registrations.participantName,
        },
      })
      .from(voteResults)
      .leftJoin(registrations, eq(voteResults.winnerRegistrationId, registrations.id))
      .where(eq(voteResults.eventVoteId, eventVoteId));

    return {
      ...vote,
      categoryEntries: entries.map((e) => ({
        ...e.entry,
        registration: e.registration || undefined,
      })),
      results: resultsData.map((r) => ({
        ...r.result,
        registration: r.registration || undefined,
      })),
    };
  }

  async createEventVote(insertVote: InsertEventVote): Promise<EventVote> {
    const [vote] = await db.insert(eventVotes).values(insertVote).returning();
    return vote;
  }

  async updateEventVoteStatus(id: string, status: string, publishedAt?: Date): Promise<EventVote | undefined> {
    const updates: any = { status };
    if (publishedAt) updates.publishedAt = publishedAt;
    const [vote] = await db.update(eventVotes).set(updates).where(eq(eventVotes.id, id)).returning();
    return vote || undefined;
  }

  async deleteEventVote(id: string): Promise<void> {
    await db.delete(voteResults).where(eq(voteResults.eventVoteId, id));
    await db.delete(voteBallotEntries).where(
      inArray(voteBallotEntries.ballotId,
        db.select({ id: voteBallots.id }).from(voteBallots).where(eq(voteBallots.eventVoteId, id))
      )
    );
    await db.delete(voteBallots).where(eq(voteBallots.eventVoteId, id));
    await db.delete(voteCategoryEntries).where(eq(voteCategoryEntries.eventVoteId, id));
    await db.delete(eventVotes).where(eq(eventVotes.id, id));
  }

  async clearEventVoteBallots(eventVoteId: string): Promise<void> {
    await db.delete(voteResults).where(eq(voteResults.eventVoteId, eventVoteId));
    await db.delete(voteBallotEntries).where(
      inArray(voteBallotEntries.ballotId,
        db.select({ id: voteBallots.id }).from(voteBallots).where(eq(voteBallots.eventVoteId, eventVoteId))
      )
    );
    await db.delete(voteBallots).where(eq(voteBallots.eventVoteId, eventVoteId));
  }

  // Vote Category Entries
  async getVoteCategoryEntries(eventVoteId: string): Promise<VoteCategoryEntry[]> {
    return db.select().from(voteCategoryEntries).where(eq(voteCategoryEntries.eventVoteId, eventVoteId));
  }

  async addVoteCategoryEntry(entry: InsertVoteCategoryEntry): Promise<VoteCategoryEntry> {
    const [result] = await db.insert(voteCategoryEntries).values(entry).returning();
    return result;
  }

  async removeVoteCategoryEntry(eventVoteId: string, votingCategoryId: string, registrationId: string): Promise<void> {
    await db.delete(voteCategoryEntries).where(
      and(
        eq(voteCategoryEntries.eventVoteId, eventVoteId),
        eq(voteCategoryEntries.votingCategoryId, votingCategoryId),
        eq(voteCategoryEntries.registrationId, registrationId)
      )
    );
  }

  async setVoteCategoryEntries(eventVoteId: string, votingCategoryId: string, registrationIds: string[]): Promise<void> {
    const uniqueIds = Array.from(new Set(registrationIds));
    await db.transaction(async (tx) => {
      await tx.delete(voteCategoryEntries).where(
        and(
          eq(voteCategoryEntries.eventVoteId, eventVoteId),
          eq(voteCategoryEntries.votingCategoryId, votingCategoryId)
        )
      );
      if (uniqueIds.length > 0) {
        await tx.insert(voteCategoryEntries).values(
          uniqueIds.map((regId) => ({
            eventVoteId,
            votingCategoryId,
            registrationId: regId,
          }))
        );
      }
    });
  }

  // Vote Ballots
  async getBallotsByVoter(eventVoteId: string, voterRegistrationId: string): Promise<VoteBallot | undefined> {
    const [ballot] = await db.select().from(voteBallots).where(
      and(
        eq(voteBallots.eventVoteId, eventVoteId),
        eq(voteBallots.voterRegistrationId, voterRegistrationId)
      )
    );
    return ballot || undefined;
  }

  async getBallotsByEvent(eventVoteId: string): Promise<VoteBallot[]> {
    return db.select().from(voteBallots).where(eq(voteBallots.eventVoteId, eventVoteId));
  }

  async createBallotWithEntries(
    ballot: InsertVoteBallot,
    entries: Omit<InsertVoteBallotEntry, "ballotId">[]
  ): Promise<VoteBallot> {
    return db.transaction(async (tx) => {
      const [createdBallot] = await tx.insert(voteBallots).values(ballot).returning();
      if (entries.length > 0) {
        await tx.insert(voteBallotEntries).values(
          entries.map((e) => ({
            ...e,
            ballotId: createdBallot.id,
          }))
        );
      }
      return createdBallot;
    });
  }

  // Vote Results
  async getVoteResults(eventVoteId: string): Promise<VoteResult[]> {
    return db.select().from(voteResults).where(eq(voteResults.eventVoteId, eventVoteId));
  }

  async getVoteTally(eventVoteId: string): Promise<VoteTally[]> {
    const rows = await db
      .select({
        votingCategoryId: voteBallotEntries.votingCategoryId,
        registrationId: voteBallotEntries.selectedRegistrationId,
        carName: registrations.carName,
        carPictureUrl: registrations.carPictureUrl,
        participantName: registrations.participantName,
        voteCount: count(voteBallotEntries.id),
      })
      .from(voteBallotEntries)
      .innerJoin(voteBallots, eq(voteBallotEntries.ballotId, voteBallots.id))
      .innerJoin(registrations, eq(voteBallotEntries.selectedRegistrationId, registrations.id))
      .where(eq(voteBallots.eventVoteId, eventVoteId))
      .groupBy(
        voteBallotEntries.votingCategoryId,
        voteBallotEntries.selectedRegistrationId,
        registrations.carName,
        registrations.carPictureUrl,
        registrations.participantName
      );

    return rows.map((r) => ({
      ...r,
      voteCount: Number(r.voteCount),
    }));
  }

  async setVoteResults(eventVoteId: string, results: Omit<InsertVoteResult, "eventVoteId">[]): Promise<VoteResult[]> {
    return db.transaction(async (tx) => {
      await tx.delete(voteResults).where(eq(voteResults.eventVoteId, eventVoteId));
      if (results.length === 0) return [];
      return tx.insert(voteResults).values(
        results.map((r) => ({ ...r, eventVoteId }))
      ).returning();
    });
  }

  // Racing Awards
  async getRacingAwardsByEvent(eventId: string): Promise<RacingAward[]> {
    return db.select().from(racingAwards).where(eq(racingAwards.eventId, eventId)).orderBy(racingAwards.sortOrder);
  }

  async getRacingAward(id: string): Promise<RacingAward | undefined> {
    const [award] = await db.select().from(racingAwards).where(eq(racingAwards.id, id));
    return award || undefined;
  }

  async createRacingAward(award: InsertRacingAward): Promise<RacingAward> {
    const [result] = await db.insert(racingAwards).values(award).returning();
    return result;
  }

  async deleteRacingAward(id: string): Promise<void> {
    await db.delete(racingAwardResults).where(eq(racingAwardResults.racingAwardId, id));
    await db.delete(racingAwards).where(eq(racingAwards.id, id));
  }

  async getRacingAwardsWithResults(eventId: string): Promise<RacingAwardWithResult[]> {
    const awards = await this.getRacingAwardsByEvent(eventId);
    if (awards.length === 0) return [];

    const awardIds = awards.map((a) => a.id);
    const results = await db
      .select({
        result: racingAwardResults,
        registration: {
          id: registrations.id,
          carName: registrations.carName,
          carPictureUrl: registrations.carPictureUrl,
          participantName: registrations.participantName,
        },
      })
      .from(racingAwardResults)
      .leftJoin(registrations, eq(racingAwardResults.winnerRegistrationId, registrations.id))
      .where(inArray(racingAwardResults.racingAwardId, awardIds));

    const resultsByAwardId = new Map<string, typeof results[0]>();
    for (const r of results) {
      resultsByAwardId.set(r.result.racingAwardId, r);
    }

    return awards.map((award) => {
      const r = resultsByAwardId.get(award.id);
      return {
        ...award,
        result: r ? { ...r.result, registration: r.registration || undefined } : null,
      };
    });
  }

  async setRacingAwardResult(racingAwardId: string, winnerRegistrationId: string): Promise<RacingAwardResult> {
    return db.transaction(async (tx) => {
      await tx.delete(racingAwardResults).where(eq(racingAwardResults.racingAwardId, racingAwardId));
      const [result] = await tx.insert(racingAwardResults).values({
        racingAwardId,
        winnerRegistrationId,
        published: false,
      }).returning();
      return result;
    });
  }

  async removeRacingAwardResult(racingAwardId: string): Promise<void> {
    await db.delete(racingAwardResults).where(eq(racingAwardResults.racingAwardId, racingAwardId));
  }

  async publishRacingAwardResults(eventId: string, published: boolean): Promise<void> {
    const awards = await this.getRacingAwardsByEvent(eventId);
    if (awards.length === 0) return;
    const awardIds = awards.map((a) => a.id);
    await db.update(racingAwardResults)
      .set({ published })
      .where(inArray(racingAwardResults.racingAwardId, awardIds));
  }
}

export const storage = new DatabaseStorage();
