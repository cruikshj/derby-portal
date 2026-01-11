import { users, inviteLinks, type User, type UpsertUser, type AccessStatus, type InviteLink } from "@shared/models/auth";
import { db } from "../../db";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";

// Interface for auth storage operations
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser, useInvite?: boolean): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserAdmin(id: string, isAdmin: boolean): Promise<User | undefined>;
  updateUserAccessStatus(id: string, accessStatus: AccessStatus): Promise<User | undefined>;
  getUserCount(): Promise<number>;
  deleteUser(id: string): Promise<void>;
  getInviteLink(): Promise<InviteLink | null>;
  createInviteLink(createdById: string): Promise<InviteLink>;
  deleteInviteLink(): Promise<void>;
  validateInviteToken(token: string): Promise<boolean>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(users);
    return Number(result[0]?.count || 0);
  }

  async upsertUser(userData: UpsertUser, useInvite: boolean = false): Promise<User> {
    // Check if this is the first user - if so, make them admin with active status
    const existingUser = await this.getUser(userData.id!);
    const userCount = await this.getUserCount();
    const isFirstUser = userCount === 0 || (userCount === 1 && existingUser);
    
    // Determine access status for new users
    // - First user: always active
    // - Existing disabled user: keep disabled (cannot be reactivated via invite)
    // - Existing active user: keep active
    // - Existing pending user with invite: promote to active
    // - Existing pending user without invite: keep pending
    // - New user with invite: active
    // - New user without invite: pending
    let accessStatus: AccessStatus = "pending";
    if (existingUser?.accessStatus === "disabled") {
      // Disabled users cannot be reactivated via invite link
      accessStatus = "disabled";
    } else if (existingUser?.accessStatus === "active") {
      // Already active users stay active
      accessStatus = "active";
    } else if (isFirstUser) {
      accessStatus = "active";
    } else if (useInvite) {
      // New users or pending users with invite become active
      accessStatus = "active";
    } else if (existingUser?.accessStatus === "pending") {
      // Pending users without invite stay pending
      accessStatus = "pending";
    }
    
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        isAdmin: existingUser?.isAdmin ?? (isFirstUser ? true : false),
        accessStatus,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          name: userData.name,
          accessStatus,
          updatedAt: new Date(),
        },
      })
      .returning();
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
    return user;
  }

  async updateUserAccessStatus(id: string, accessStatus: AccessStatus): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ accessStatus, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getInviteLink(): Promise<InviteLink | null> {
    const [link] = await db.select().from(inviteLinks).limit(1);
    return link || null;
  }

  async createInviteLink(createdById: string): Promise<InviteLink> {
    // Delete any existing invite link first (only one can exist)
    await db.delete(inviteLinks);
    
    // Generate a secure random token
    const token = crypto.randomBytes(32).toString("hex");
    
    const [link] = await db
      .insert(inviteLinks)
      .values({ token, createdById })
      .returning();
    return link;
  }

  async deleteInviteLink(): Promise<void> {
    await db.delete(inviteLinks);
  }

  async validateInviteToken(token: string): Promise<boolean> {
    const [link] = await db
      .select()
      .from(inviteLinks)
      .where(eq(inviteLinks.token, token));
    return !!link;
  }
}

export const authStorage = new AuthStorage();
