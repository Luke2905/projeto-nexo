import { createHash } from "node:crypto";
import { FREE_CATALOGS } from "./dailyCatalogV3";
import type { Difficulty } from "./expandedCatalog";
import type { WordEntry } from "./dictionary";

const ACCENTS = ["coral", "lavender", "gold", "blue", "mint"] as const;
const FREE_ID = /^free-(easy|medium|hard)-(\d+)-([a-zA-Z0-9-]{1,40})$/;

export function getFreeEntry(challengeId: string): WordEntry | null {
  const match = FREE_ID.exec(challengeId);
  if (!match) return null;
  const difficulty = match[1] as Difficulty;
  const index = Number(match[2]);
  return FREE_CATALOGS[difficulty][index] ?? null;
}

export function getFreeChallengeMeta(difficulty: Difficulty, nonce: string) {
  const catalog = FREE_CATALOGS[difficulty];
  const digest = createHash("sha256").update(`nexo-free/${difficulty}/${nonce}`).digest();
  const index = digest.readUInt32BE(0) % catalog.length;
  const accent = ACCENTS[digest[4] % ACCENTS.length];
  const entry = catalog[index];
  const labels: Record<Difficulty, string> = {
    easy: "Livre · Fácil",
    medium: "Livre · Médio",
    hard: "Livre · Difícil",
  };

  return {
    challengeId: `free-${difficulty}-${index}-${nonce}`,
    prompt: entry.prompt,
    category: entry.category,
    accent,
    label: labels[difficulty],
    difficulty,
  };
}

