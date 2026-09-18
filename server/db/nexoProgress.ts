import { eq } from "drizzle-orm";
import { gameSessions, nexoAchievements, users } from "../../drizzle/schema";
import { calculateProgress } from "../../shared/nexomap";
import { getDb } from "./connection";
import { TRPCError } from "@trpc/server";

export type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export async function requireDb() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "Banco indisponível. Tente novamente em instantes.",
    });
  return db;
}
export async function lockUser(tx: Transaction, userId: number) {
  const rows = await tx
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .for("update");
  if (!rows.length)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Conta não encontrada.",
    });
}
export async function progressFor(db: Database | Transaction, userId: number) {
  const sessions = await db
    .select()
    .from(gameSessions)
    .where(eq(gameSessions.userId, userId));
  const progress = calculateProgress(sessions);
  const awards = await db
    .select()
    .from(nexoAchievements)
    .where(eq(nexoAchievements.userId, userId));
  return {
    ...progress,
    achievements: progress.achievements.map(a => {
      const award = awards.find(row => row.achievementId === a.id);
      return {
        ...a,
        unlocked: Boolean(award) || a.unlocked,
        unlockedAt: award?.unlockedAt ?? null,
      };
    }),
  };
}
export async function awardProgress(
  tx: Transaction,
  userId: number,
  historical = false
) {
  const progress = await progressFor(tx, userId);
  const existing = await tx
    .select()
    .from(nexoAchievements)
    .where(eq(nexoAchievements.userId, userId));
  const fresh = progress.achievements.filter(
    a => a.unlocked && !existing.some(e => e.achievementId === a.id)
  );
  for (const a of fresh)
    await tx
      .insert(nexoAchievements)
      .values({
        userId,
        achievementId: a.id,
        unlockedAt: historical ? null : new Date(),
      });
  return fresh.map(a => a.title);
}
