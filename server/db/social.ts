/**
 * @file social.ts
 * @description Database repository for social operations like leaderboard and friends.
 */

import { and, desc, eq, ne, sql } from "drizzle-orm";
import { friendships, gameSessions, users } from "../../drizzle/schema";
import { getDb } from "./connection";

/**
 * Retrieves the global leaderboard ranking users by total games solved.
 * @returns {Promise<Array>} List of top 50 users on the leaderboard.
 */
export async function getLeaderboard() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: users.id,
      name: users.name,
      solved: sql<number>`COALESCE(SUM(${gameSessions.solved}), 0)`,
      games: sql<number>`COUNT(${gameSessions.id})`,
      bestRank: sql<number>`COALESCE(MIN(NULLIF(${gameSessions.bestRank}, 0)), 0)`,
    })
    .from(users)
    .leftJoin(gameSessions, eq(users.id, gameSessions.userId))
    .groupBy(users.id, users.name)
    .orderBy(
      desc(sql`COALESCE(SUM(${gameSessions.solved}), 0)`),
      desc(sql`COUNT(${gameSessions.id})`),
    )
    .limit(50);
}

/**
 * Retrieves the list of friends for a specific user.
 * @param {number} userId - The user ID.
 * @returns {Promise<Array>} List of user's friends.
 */
export async function getFriends(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ id: users.id, name: users.name, status: friendships.status })
    .from(friendships)
    .innerJoin(users, eq(friendships.friendUserId, users.id))
    .where(and(eq(friendships.userId, userId), ne(friendships.friendUserId, userId)))
    .limit(50);
}

/**
 * Adds a new friendship connection between two users.
 * @param {number} userId - The ID of the user initiating the friendship.
 * @param {number} friendUserId - The ID of the user being added as a friend.
 * @returns {Promise<{success: boolean} | null>} Object indicating success or null on failure.
 */
export async function addFriend(userId: number, friendUserId: number) {
  const db = await getDb();
  if (!db || userId === friendUserId) return null;
  await db.insert(friendships).values({ userId, friendUserId, status: "accepted" });
  return { success: true };
}
