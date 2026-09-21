/**
 * @file engine.ts
 * @description Core game logic: normalization, ranking, date-based daily challenge rotation.
 * All answer secrets are processed exclusively here — never sent to the client.
 */

import { normalizeWord as normalize } from "../../shared/words";
import { CATEGORY_HINTS, THEME_CATALOG, type WordEntry } from "./dictionary";
import { dayIndexForDate, getEntryForDate, isDailyDate } from "./dailySchedule";
import { semanticGraphRank } from "./semanticGraph";
import { getFreeEntry } from "./freeMode";
export { dayIndexForDate, getEntryForDate } from "./dailySchedule";

/**
 * Normalizes a string for consistent comparison:
 * trims whitespace, lowercases (pt-BR), strips diacritics.
 */
export { normalizeWord as normalize } from "../../shared/words";

/**
 * Validates that the input is a single word (letters only after normalization).
 */
export function isSingleWord(value: string): boolean {
  return /^[a-z]+$/i.test(normalize(value));
}

/**
 * Calculates a guess result for a given word against a challenge.
 * Returns the rank, proximity percentage, and a human-readable heat tag.
 */
export function evaluateGuess(
  guessWord: string,
  entry: WordEntry,
): { rank: number; proximity: number; tag: string } {
  const clean = normalize(guessWord);
  const isAnswer = normalize(guessWord) === normalize(entry.word);

  if (isAnswer) {
    return { rank: 1, proximity: 100, tag: "solução" };
  }

  const knownRank = Object.entries(entry.aliases).find(
    ([alias]) => normalize(alias) === clean,
  )?.[1];

  const rank = knownRank ?? semanticGraphRank(clean, entry);
  const proximity = Math.max(6, Math.round(100 - rank * 2.65));
  const tag =
    rank <= 5 ? "muito quente" : rank <= 15 ? "no caminho" : "mais distante";

  return { rank, proximity, tag };
}

/**
 * Returns the local date string (YYYY-MM-DD) for today in Brazil (America/Sao_Paulo).
 */
export function todayUTC(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

/** Current-month archive, including today, without creating rows or exposing
 * answers. Reuses historical IDs so existing sessions remain attached. */
export async function getDailyArchive() {
  const today = todayUTC();
  const month = today.slice(0, 7);
  const day = Number(today.slice(8));
  
  const challenges = [];
  for (let index = 0; index < day; index++) {
    const dateStr = `${month}-${String(day - index).padStart(2, "0")}`;
    const meta = await getDailyChallengeMeta(dateStr);
    challenges.push(meta);
  }
  
  return {
    today,
    month,
    challenges,
  };
}

/**
 * Returns the daily challenge metadata for the client (no answer exposed).
 */
export async function getDailyChallengeMeta(dateStr: string): Promise<{
  challengeId: string;
  prompt: string;
  category: string;
  accent: string;
  label: string;
}> {
  const entry = await getEntryForDate(dateStr);
  const dayIndex = dayIndexForDate(dateStr);
  const displayDate = new Date(`${dateStr}T12:00:00Z`);
  const label = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
  }).format(displayDate);

  const ACCENTS = ["coral", "lavender", "gold", "blue", "mint"];
  const accent = ACCENTS[dayIndex % ACCENTS.length];

  return {
    challengeId: `daily-${dateStr}`,
    prompt: entry.prompt,
    category: entry.category,
    accent,
    label: `${label} · #${dayIndex + 1}`,
  };
}

/**
 * Returns the theme challenge metadata for the client (no answer exposed).
 */
export function getThemesMeta() {
  return THEME_CATALOG.map(({ id, label, description, accent, prompt, category }) => ({
    id,
    label,
    description,
    accent,
    prompt,
    category,
  }));
}

/**
 * Returns the subtle category hint for a challenge.
 * The hint is based on category — never reveals the answer.
 */
export async function getHintForChallenge(challengeId: string): Promise<string> {
  const entry = await getEntryForChallenge(challengeId);

  if (!entry) return "A resposta aparece quando duas ideias começam a se aproximar.";
  return entry.prompt || CATEGORY_HINTS[entry.category] || "A resposta aparece quando duas ideias começam a se aproximar.";
}

/**
 * Internal: looks up the WordEntry for a challengeId to validate a guess.
 * Used by server routes only; answers are never returned to clients.
 */
export async function getEntryForChallenge(challengeId: string): Promise<WordEntry | null> {
  if (challengeId.startsWith("daily-")) {
    const dateStr = challengeId.slice("daily-".length);
    // Reject malformed dates and prevent probing future answers or generating
    // arbitrarily distant schedules through the public guess/hint endpoints.
    if (!isDailyDate(dateStr) || dateStr > todayUTC()) return null;
    return await getEntryForDate(dateStr);
  }
  if (challengeId.startsWith("free-")) return getFreeEntry(challengeId);
  return THEME_CATALOG.find((t) => t.id === challengeId) ?? null;
}
