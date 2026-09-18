import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { gameSessions } from "../../drizzle/schema";
import { getDb } from "./connection";
import { awardProgress, lockUser, requireDb } from "./nexoProgress";
import { appendGuess, readGuesses, validatedGuess } from "../game/progress";
import { getEntryForChallenge } from "../game/engine";

export async function getGameHistory(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(gameSessions)
    .where(eq(gameSessions.userId, userId))
    .orderBy(desc(gameSessions.playedAt));
  return rows.map(({ userId: _owner, ...row }) => ({
    ...row,
    progressJson: row.solved ? null : row.progressJson,
  }));
}

export async function submitSavedGuess(
  userId: number,
  input: { challengeId: string; word: string; requestId: string }
) {
  const evaluated = validatedGuess(input.challengeId, input.word);
  const db = await requireDb();
  return db.transaction(async tx => {
    await lockUser(tx, userId);
    // Register old accomplishments without inventing their original dates.
    if (evaluated.solved) await awardProgress(tx, userId, true);
    const [session] = await tx
      .select()
      .from(gameSessions)
      .where(
        and(
          eq(gameSessions.userId, userId),
          eq(gameSessions.challengeId, input.challengeId)
        )
      )
      .orderBy(desc(gameSessions.solved), desc(gameSessions.id))
      .limit(1);
    const previous = readGuesses(session?.progressJson ?? null);
    const repeated = previous.some(g => g.requestId === input.requestId);
    if (!repeated && (session?.solved || session?.lost))
      throw new TRPCError({
        code: "CONFLICT",
        message: session.solved
          ? "Este desafio já foi concluído."
          : "Recomece a partida antes de enviar outro palpite.",
      });
    const next = appendGuess(
      previous,
      input.challengeId,
      input.word,
      input.requestId
    );
    if (next.duplicate)
      return { ...next.result, guesses: next.guesses, awards: [] as string[] };
    // Legacy in-progress games retain their attempts but cannot earn precision.
    const verified = session ? session.verified : 1;
    const count = Math.max(session?.guesses ?? 0, previous.length) + 1;
    const serialized = JSON.stringify(next.guesses);
    if (Buffer.byteLength(serialized, "utf8") > 60000)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Esta partida atingiu o limite de armazenamento.",
      });
    const values = {
      guesses: count,
      totalGuesses:
        Math.max(session?.totalGuesses ?? 0, session?.guesses ?? 0) + 1,
      bestRank: Math.min(...next.guesses.map(g => g.rank)),
      solved: next.result.solved ? 1 : 0,
      verified,
      progressJson: serialized,
      playedAt: new Date(),
      completedAt: next.result.solved ? new Date() : null,
    };
    if (session)
      await tx
        .update(gameSessions)
        .set(values)
        .where(eq(gameSessions.id, session.id));
    else
      await tx
        .insert(gameSessions)
        .values({ ...values, userId, challengeId: input.challengeId });
    const awards = next.result.solved ? await awardProgress(tx, userId) : [];
    return { ...next.result, guesses: next.guesses, awards };
  });
}

export async function giveUpGame(userId: number, challengeId: string) {
  if (!getEntryForChallenge(challengeId))
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Desafio não encontrado.",
    });
  const db = await requireDb();
  return db.transaction(async tx => {
    await lockUser(tx, userId);
    const [row] = await tx
      .select()
      .from(gameSessions)
      .where(
        and(
          eq(gameSessions.userId, userId),
          eq(gameSessions.challengeId, challengeId)
        )
      )
      .orderBy(desc(gameSessions.solved), desc(gameSessions.id))
      .limit(1);
    if (row?.solved || row?.lost) return row;
    if (row) {
      await tx
        .update(gameSessions)
        .set({ lost: 1 })
        .where(eq(gameSessions.id, row.id));
      return { ...row, lost: 1 };
    }
    await tx
      .insert(gameSessions)
      .values({ userId, challengeId, lost: 1, verified: 1 });
    return { lost: 1 };
  });
}

export async function retryGame(userId: number, challengeId: string) {
  const db = await requireDb();
  return db.transaction(async tx => {
    await lockUser(tx, userId);
    const [row] = await tx
      .select()
      .from(gameSessions)
      .where(
        and(
          eq(gameSessions.userId, userId),
          eq(gameSessions.challengeId, challengeId)
        )
      )
      .orderBy(desc(gameSessions.solved), desc(gameSessions.id))
      .limit(1);
    if (!row || row.solved || !row.lost)
      throw new TRPCError({
        code: "CONFLICT",
        message: "Esta partida não pode ser reiniciada.",
      });
    if (row.retryCount >= 3)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Você atingiu o limite de 3 recomeços.",
      });
    const values = {
      lost: 0,
      guesses: 0,
      bestRank: 0,
      retryCount: row.retryCount + 1,
      progressJson: null,
    };
    await tx
      .update(gameSessions)
      .set(values)
      .where(eq(gameSessions.id, row.id));
    return { ...row, ...values };
  });
}
