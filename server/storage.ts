import {
  users, derbyEvents, dens, votingCategories, registrations,
  type User, type UpsertUser,
  type DerbyEvent, type InsertDerbyEvent,
  type Den, type InsertDen,
  type VotingCategory, type InsertVotingCategory,
  type Registration, type InsertRegistration,
  type DerbyEventWithDetails, type RegistrationWithDen,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByBandId(bandUserId: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserAdmin(id: string, isAdmin: boolean): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;

  // Events
  getEvents(): Promise<DerbyEvent[]>;
  getEvent(id: string): Promise<DerbyEvent | undefined>;
  getEventWithDetails(id: string): Promise<DerbyEventWithDetails | undefined>;
  getActiveEvent(): Promise<DerbyEventWithDetails | undefined>;
  createEvent(event: InsertDerbyEvent): Promise<DerbyEvent>;
  updateEvent(id: string, event: Partial<InsertDerbyEvent>): Promise<DerbyEvent | undefined>;
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
  updateRegistration(id: string, registration: Partial<InsertRegistration>): Promise<Registration | undefined>;
  deleteRegistration(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByBandId(bandUserId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.bandUserId, bandUserId));
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

  async createEvent(insertEvent: InsertDerbyEvent): Promise<DerbyEvent> {
    // If this event is set as active, deactivate all others first
    if (insertEvent.isActive) {
      await db.update(derbyEvents).set({ isActive: false });
    }
    
    // Convert date strings to Date objects for timestamp fields
    const processedEvent = { ...insertEvent };
    const dateFields = ['eventDate', 'registrationStartDate', 'registrationEndDate', 'votingStartDate', 'votingEndDate', 'weighInDate'] as const;
    for (const field of dateFields) {
      if (field in processedEvent && processedEvent[field] !== null && processedEvent[field] !== undefined) {
        const value = processedEvent[field];
        if (typeof value === 'string') {
          (processedEvent as any)[field] = new Date(value);
        }
      }
    }
    
    const [event] = await db.insert(derbyEvents).values(processedEvent).returning();
    return event;
  }

  async updateEvent(id: string, updates: Partial<InsertDerbyEvent>): Promise<DerbyEvent | undefined> {
    // If setting this event as active, deactivate all others first
    if (updates.isActive) {
      await db.update(derbyEvents).set({ isActive: false });
    }
    
    // Convert date strings to Date objects for timestamp fields
    const processedUpdates = { ...updates };
    const dateFields = ['eventDate', 'registrationStartDate', 'registrationEndDate', 'votingStartDate', 'votingEndDate', 'weighInDate'] as const;
    for (const field of dateFields) {
      if (field in processedUpdates && processedUpdates[field] !== null && processedUpdates[field] !== undefined) {
        const value = processedUpdates[field];
        if (typeof value === 'string') {
          processedUpdates[field] = new Date(value);
        }
      }
    }
    
    const [event] = await db.update(derbyEvents).set(processedUpdates).where(eq(derbyEvents.id, id)).returning();
    return event || undefined;
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
    const [registration] = await db.insert(registrations).values(insertReg).returning();
    return registration;
  }

  async updateRegistration(id: string, updates: Partial<InsertRegistration>): Promise<Registration | undefined> {
    const [registration] = await db.update(registrations).set(updates).where(eq(registrations.id, id)).returning();
    return registration || undefined;
  }

  async deleteRegistration(id: string): Promise<void> {
    await db.delete(registrations).where(eq(registrations.id, id));
  }
}

export const storage = new DatabaseStorage();
