import { createHash } from "node:crypto";
import { normalizeWord } from "../../shared/words";
import { WORD_CATALOG, type WordEntry } from "./dictionary";
import { DAILY_CATALOG_V2 } from "./dailyCatalogV2";

const DAY_MS = 86_400_000;
const EPOCH_MS = Date.parse("2024-01-01T00:00:00Z");
export const DAILY_V2_START = "2026-09-19";
export const DAILY_REPEAT_COOLDOWN = 180;
const START_MS = Date.parse(`${DAILY_V2_START}T00:00:00Z`);
// Never change the seed, start date, catalog or selection algorithm of a released
// version. Add a new dated version instead, preserving historical schedules.
const SEED = "nexo-daily-v2/2026-09-19";

export function isDailyDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === date;
}

export function dayIndexForDate(date: string): number {
  if (!isDailyDate(date)) throw new RangeError("Invalid daily challenge date");
  return (Date.parse(`${date}T00:00:00Z`) - EPOCH_MS) / DAY_MS;
}

function legacyEntry(timestamp: number): WordEntry {
  const day = (timestamp - EPOCH_MS) / DAY_MS;
  return WORD_CATALOG[((day % WORD_CATALOG.length) + WORD_CATALOG.length) % WORD_CATALOG.length];
}

/** Independent instances reconstruct exactly the same schedule, including on
 * serverless cold starts. The cache only saves computation; it is not state. */
export function createDailySchedule(): (date: string) => WordEntry {
  const scheduled: WordEntry[] = [];
  // Keep duplicates here: removing an old occurrence must not remove a newer one.
  const recent = Array.from({ length: DAILY_REPEAT_COOLDOWN }, (_, index) =>
    normalizeWord(legacyEntry(START_MS - (DAILY_REPEAT_COOLDOWN - index) * DAY_MS).word),
  );

  function appendCycle() {
    const cycle = scheduled.length / DAILY_CATALOG_V2.length;
    const remaining = DAILY_CATALOG_V2.map(entry => ({
      entry,
      word: normalizeWord(entry.word),
      key: createHash("sha256").update(`${SEED}/${cycle}/${normalizeWord(entry.word)}`).digest("hex"),
    })).sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : a.word < b.word ? -1 : 1);

    while (remaining.length) {
      const index = remaining.findIndex(candidate => !recent.includes(candidate.word));
      // A unique catalog larger than the cooldown always has an eligible entry.
      if (index < 0) throw new Error("Daily catalog cannot satisfy the repeat cooldown");
      const [selected] = remaining.splice(index, 1);
      scheduled.push(selected.entry);
      recent.push(selected.word);
      recent.shift();
    }
  }

  return date => {
    if (!isDailyDate(date)) throw new RangeError("Invalid daily challenge date");
    const timestamp = Date.parse(`${date}T00:00:00Z`);
    if (timestamp < START_MS) return legacyEntry(timestamp);
    const offset = (timestamp - START_MS) / DAY_MS;
    while (scheduled.length <= offset) appendCycle();
    return scheduled[offset];
  };
}

export const getLegacyEntryForDate = createDailySchedule();

import { getDb } from "../db/connection";
import { nexoDailyChallenges } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export async function getEntryForDate(date: string): Promise<WordEntry> {
  const db = await getDb();
  if (db) {
    try {
      const rows = await db
        .select()
        .from(nexoDailyChallenges)
        .where(eq(nexoDailyChallenges.date, date))
        .limit(1);

      if (rows.length > 0) {
        const row = rows[0];
        return {
          word: row.word,
          prompt: row.prompt,
          category: row.category,
          aliases: JSON.parse(row.aliasesJson),
        };
      }
    } catch (e: any) {
      console.error("[getEntryForDate] DB Query Error:", e.message, "Cause:", e.cause || e);
    }
  }

  // Fallback to deterministic offline schedule if DB is unavailable or date not generated
  return getLegacyEntryForDate(date);
}
