/**
 * @file users.ts
 * @description Database repository for user-related operations.
 */

import { eq } from "drizzle-orm";
import { InsertUser, users } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { getDb } from "./connection";

/**
 * Upserts a user by their openId. Updates existing user or creates a new one.
 * @param {InsertUser} user - The user data to insert or update.
 * @throws {Error} If openId is missing.
 */
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

/**
 * Retrieves a user by their unique openId.
 * @param {string} openId - The openId to search for.
 * @returns {Promise<typeof users.$inferSelect | undefined>} The user object if found, undefined otherwise.
 */
export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

/**
 * Retrieves a user by their username.
 * @param {string} username - The username to search for.
 * @returns {Promise<typeof users.$inferSelect | undefined>} The user object if found, undefined otherwise.
 */
export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result[0];
}

/**
 * Updates a user's profile information.
 * @param {number} userId - The ID of the user to update.
 * @param {{ name?: string; avatarUrl?: string }} input - The profile fields to update.
 * @returns {Promise<typeof users.$inferSelect | undefined>} The updated user object.
 */
export async function updateUserProfile(userId: number, input: { name?: string; avatarUrl?: string }) {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(users).set(input).where(eq(users.id, userId));
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0];
}

/**
 * Creates a new user with local authentication (username and password).
 * @param {{ username: string; name: string; passwordHash: string }} input - The user credentials.
 * @returns {Promise<typeof users.$inferSelect | undefined>} The newly created user object.
 * @throws {Error} If the database is unavailable.
 */
export async function createLocalUser(input: { username: string; name: string; passwordHash: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const openId = `local_${input.username}`;
  await db.insert(users).values({
    openId,
    username: input.username,
    passwordHash: input.passwordHash,
    name: input.name,
    loginMethod: "password",
  });
  return getUserByOpenId(openId);
}
