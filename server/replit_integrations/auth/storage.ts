import { users, type User, type UpsertUser, type AccessStatus } from "@shared/models/auth";
import { db } from "../../db";
import { eq, sql } from "drizzle-orm";

// Interface for auth storage operations
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserAdmin(id: string, isAdmin: boolean): Promise<User | undefined>;
  updateUserAccessStatus(id: string, accessStatus: AccessStatus): Promise<User | undefined>;
  getUserCount(): Promise<number>;
  deleteUser(id: string): Promise<void>;
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

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check if this is the first user - if so, make them admin with active status
    const existingUser = await this.getUser(userData.id!);
    const userCount = await this.getUserCount();
    const isFirstUser = userCount === 0 || (userCount === 1 && existingUser);
    
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        isAdmin: existingUser?.isAdmin ?? (isFirstUser ? true : false),
        accessStatus: existingUser?.accessStatus ?? (isFirstUser ? "active" : "pending"),
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          name: userData.name,
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
}

export const authStorage = new AuthStorage();
