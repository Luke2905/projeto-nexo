/**
 * @file games.ts
 * @description Database repository for game session-related operations.
 */

import { and, desc, eq } from "drizzle-orm";
import { gameSessions } from "../../drizzle/schema";
import { getDb } from "./connection";

/**
 * Records or updates a user's progress on a specific game challenge.
 * @param {Object} input - Game session details.
 * @returns {Promise<any>} The result of the insert/update operation.
 */
export async function recordGameSession(input: { userId: number; challengeId: string; guesses: number; bestRank: number; solved: boolean; lost?: boolean; retryCount?: number; progressJson?: string }) {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select({ id: gameSessions.id, retryCount: gameSessions.retryCount }).from(gameSessions).where(and(eq(gameSessions.userId, input.userId), eq(gameSessions.challengeId, input.challengeId))).limit(1);
  const values = {
    userId: input.userId,
    challengeId: input.challengeId,
    guesses: input.guesses,
    bestRank: input.bestRank,
    solved: input.solved ? 1 : 0,
    lost: input.lost ? 1 : 0,
    retryCount: input.retryCount ?? existing[0]?.retryCount ?? 0,
    progressJson: input.progressJson ?? null,
  };
  if (existing[0]) {
    return db.update(gameSessions).set({ guesses: values.guesses, bestRank: values.bestRank, solved: values.solved, lost: values.lost, retryCount: values.retryCount, progressJson: values.progressJson, playedAt: new Date() }).where(eq(gameSessions.id, existing[0].id));
  }
  return db.insert(gameSessions).values(values);
}

/**
 * Retrieves the recent game history for a specific user.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<Array>} List of recent game sessions, up to 100.
 */
export async function getGameHistory(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: gameSessions.id,
      challengeId: gameSessions.challengeId,
      guesses: gameSessions.guesses,
      bestRank: gameSessions.bestRank,
      solved: gameSessions.solved,
      lost: gameSessions.lost,
      retryCount: gameSessions.retryCount,
      progressJson: gameSessions.progressJson,
      playedAt: gameSessions.playedAt,
    })
    .from(gameSessions)
    .where(eq(gameSessions.userId, userId))
    .orderBy(desc(gameSessions.playedAt))
    .limit(100);
}

/**
 * Marks a game challenge as given up (lost) by the user.
 * @param {number} userId - The user ID.
 * @param {string} challengeId - The challenge ID.
 * @returns {Promise<Object | null>} The updated game session.
 */
export async function giveUpGame(userId: number, challengeId: string) {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(gameSessions).where(and(eq(gameSessions.userId, userId), eq(gameSessions.challengeId, challengeId))).limit(1);
  if (!existing[0] || existing[0].solved) return existing[0] ?? null;
  await db.update(gameSessions).set({ lost: 1, progressJson: null, playedAt: new Date() }).where(eq(gameSessions.id, existing[0].id));
  return { ...existing[0], lost: 1, progressJson: null };
}

/**
 * Resets a lost game challenge to allow the user to try again, tracking the retry count.
 * @param {number} userId - The user ID.
 * @param {string} challengeId - The challenge ID.
 * @returns {Promise<Object | null>} The updated game session.
 */
export async function retryGame(userId: number, challengeId: string) {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(gameSessions).where(and(eq(gameSessions.userId, userId), eq(gameSessions.challengeId, challengeId))).limit(1);
  if (!existing[0] || !existing[0].lost || existing[0].retryCount >= 3) return existing[0] ?? null;
  const retryCount = existing[0].retryCount + 1;
  await db.update(gameSessions).set({ lost: 0, solved: 0, guesses: 0, bestRank: 0, retryCount, progressJson: null, playedAt: new Date() }).where(eq(gameSessions.id, existing[0].id));
  return { ...existing[0], lost: 0, solved: 0, guesses: 0, bestRank: 0, retryCount, progressJson: null };
}
