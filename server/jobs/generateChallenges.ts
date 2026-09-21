import { asc } from "drizzle-orm";
import { nexoDailyChallenges } from "../../drizzle/schema";
import { normalizeWord } from "../../shared/words";
import { getDb } from "../db/connection";
import {
  DAILY_REPEAT_COOLDOWN,
  getScheduledEntryForDate,
} from "../game/dailySchedule";
import { todayUTC } from "../game/engine";

const DAY_MS = 86_400_000;
export const DEFAULT_CHALLENGE_BUFFER_DAYS = 30;

function shiftDate(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export type PlannedChallenge = {
  date: string;
  word: string;
  prompt: string;
  category: string;
  aliasesJson: string;
};

/** Builds database snapshots from the versioned local catalog. */
export function planChallenges(startDate: string, days: number): PlannedChallenge[] {
  if (!Number.isInteger(days) || days < 1) throw new RangeError("days must be a positive integer");
  return Array.from({ length: days }, (_, offset) => {
    const date = shiftDate(startDate, offset);
    const entry = getScheduledEntryForDate(date);
    return {
      date,
      word: entry.word,
      prompt: entry.prompt,
      category: entry.category,
      aliasesJson: JSON.stringify(entry.aliases),
    };
  });
}

/**
 * Keeps a small production buffer without Random Word API or generative AI.
 * Existing dates are immutable, so games already started never change answer.
 */
export async function ensureChallenges(bufferDays = DEFAULT_CHALLENGE_BUFFER_DAYS) {
  const db = await getDb();
  if (!db) throw new Error("Database not ready");

  const startDate = todayUTC();
  const planned = planChallenges(startDate, bufferDays);
  const rows = await db
    .select({ date: nexoDailyChallenges.date, word: nexoDailyChallenges.word })
    .from(nexoDailyChallenges)
    .orderBy(asc(nexoDailyChallenges.date));
  const byDate = new Map(rows.map(row => [row.date, row.word]));

  // Validate the real database history before adding anything. A repeated word
  // inside the cooldown indicates manual/corrupt data and must not be hidden.
  const lastSeen = new Map<string, string>();
  for (const row of rows) {
    const word = normalizeWord(row.word);
    const previous = lastSeen.get(word);
    if (previous) {
      const distance = Math.round(
        (Date.parse(`${row.date}T00:00:00Z`) - Date.parse(`${previous}T00:00:00Z`)) / DAY_MS,
      );
      if (distance <= DAILY_REPEAT_COOLDOWN) {
        throw new Error(`Repeated daily word "${row.word}" on ${previous} and ${row.date}`);
      }
    }
    lastSeen.set(word, row.date);
  }

  let inserted = 0;
  for (const challenge of planned) {
    if (byDate.has(challenge.date)) continue;

    const normalized = normalizeWord(challenge.word);
    const previous = lastSeen.get(normalized);
    if (previous) {
      const distance = Math.round(
        (Date.parse(`${challenge.date}T00:00:00Z`) - Date.parse(`${previous}T00:00:00Z`)) / DAY_MS,
      );
      if (distance <= DAILY_REPEAT_COOLDOWN) {
        throw new Error(`Schedule collision for "${challenge.word}" after ${distance} days`);
      }
    }

    // A concurrent invocation may win the same date. The no-op update keeps the
    // first immutable snapshot instead of changing an answer mid-game.
    await db
      .insert(nexoDailyChallenges)
      .values(challenge)
      .onDuplicateKeyUpdate({ set: { date: challenge.date } });
    byDate.set(challenge.date, challenge.word);
    lastSeen.set(normalized, challenge.date);
    inserted++;
  }

  return {
    inserted,
    kept: planned.length - inserted,
    from: planned[0].date,
    through: planned.at(-1)!.date,
  };
}

if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/")}`) {
  ensureChallenges()
    .then(result => console.log("Daily challenge buffer ready:", result))
    .catch(error => {
      console.error(error);
      process.exitCode = 1;
    });
}
