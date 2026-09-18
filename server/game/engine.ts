/**
 * @file engine.ts
 * @description Core game logic: normalization, ranking, date-based daily challenge rotation.
 * All answer secrets are processed exclusively here — never sent to the client.
 */

import { normalizeWord as normalize } from "../../shared/words";
import { CATEGORY_HINTS, WORD_CATALOG, THEME_CATALOG, type WordEntry } from "./dictionary";

/** The reference epoch date. Day 0 = index 0 of WORD_CATALOG. Do not change this. */
const EPOCH = new Date("2024-01-01T00:00:00Z");

const MS_PER_DAY = 1000 * 60 * 60 * 24;

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
 * Deterministically returns a proximity rank for a word against an answer,
 * used as a fallback when the word isn't in the known aliases map.
 */
function fallbackRank(word: string, answer: string): number {
  const cleanWord = normalize(word);
  const cleanAnswer = normalize(answer);
  const shared = Array.from(new Set(cleanWord)).filter((char) => cleanAnswer.includes(char)).length;
  const seed = Array.from(cleanWord).reduce(
    (sum, char, index) => sum + char.charCodeAt(0) * (index + 3),
    0,
  );
  return Math.min(99, Math.max(17, 58 - shared * 6 - (seed % 17)));
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

  const rank = knownRank ?? fallbackRank(clean, entry.word);
  const proximity = Math.max(6, Math.round(100 - rank * 2.65));
  const tag =
    rank <= 5 ? "muito quente" : rank <= 15 ? "no caminho" : "mais distante";

  return { rank, proximity, tag };
}

/**
 * Returns the 0-based day index since EPOCH for a given UTC date string (YYYY-MM-DD).
 * Identical inputs always return the same number — past days are immutable.
 */
export function dayIndexForDate(dateStr: string): number {
  const target = new Date(`${dateStr}T00:00:00Z`);
  return Math.floor((target.getTime() - EPOCH.getTime()) / MS_PER_DAY);
}

/**
 * Returns the UTC date string (YYYY-MM-DD) for today.
 */
export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Returns the word catalog entry for a given UTC date string.
 * Wraps around the catalog so it never runs out.
 */
export function getEntryForDate(dateStr: string): WordEntry {
  const index = dayIndexForDate(dateStr);
  return WORD_CATALOG[((index % WORD_CATALOG.length) + WORD_CATALOG.length) % WORD_CATALOG.length];
}

/**
 * Returns the daily challenge metadata for the client (no answer exposed).
 */
export function getDailyChallengeMeta(dateStr: string): {
  challengeId: string;
  prompt: string;
  category: string;
  accent: string;
  label: string;
} {
  const entry = getEntryForDate(dateStr);
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
export function getHintForChallenge(challengeId: string): string {
  let entry: WordEntry | undefined;

  if (challengeId.startsWith("daily-")) {
    const dateStr = challengeId.replace("daily-", "");
    entry = getEntryForDate(dateStr);
  } else {
    entry = THEME_CATALOG.find((t) => t.id === challengeId);
  }

  if (!entry) return "A resposta aparece quando duas ideias começam a se aproximar.";
  return CATEGORY_HINTS[entry.category] ?? "A resposta aparece quando duas ideias começam a se aproximar.";
}

/**
 * Internal: looks up the WordEntry for a challengeId to validate a guess.
 * NOT exported to routes — only used internally to evaluate guesses.
 */
export function getEntryForChallenge(challengeId: string): WordEntry | null {
  if (challengeId.startsWith("daily-")) {
    const dateStr = challengeId.replace("daily-", "");
    return getEntryForDate(dateStr);
  }
  return THEME_CATALOG.find((t) => t.id === challengeId) ?? null;
}
