import { users, type User, type UpsertUser } from "@shared/models/auth";
import { db } from "../../db";
import { eq } from "drizzle-orm";

// Interface for auth storage operations
// (IMPORTANT) These user operations are mandatory for Replit Auth.
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const name = userData.firstName && userData.lastName 
      ? `${userData.firstName} ${userData.lastName}`.trim()
      : userData.firstName || userData.lastName || userData.email || "User";

    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        name,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          name,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }
}

export const authStorage = new AuthStorage();
