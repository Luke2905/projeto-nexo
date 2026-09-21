import { normalizeWord } from "../../shared/words";
import { DAILY_CATALOG_V3 } from "./dailyCatalogV3";
import { THEME_CATALOG, type WordEntry } from "./dictionary";

type TermContext = {
  answer: string;
  category: string;
  relationRank: number;
  entry: WordEntry;
};

const RELATED_CATEGORIES: Record<string, readonly string[]> = {
  lugares: ["natureza", "aventura", "cultura"],
  casa: ["objetos", "comidas"],
  espaço: ["natureza", "fantasia"],
  natureza: ["lugares", "espaço", "aventura"],
  objetos: ["casa", "aventura"],
  aventura: ["lugares", "natureza", "fantasia", "anime"],
  cultura: ["arte", "filmes", "lugares"],
  fantasia: ["aventura", "anime", "espaço"],
  comidas: ["casa", "cultura"],
  filmes: ["arte", "cultura", "fantasia"],
  anime: ["aventura", "fantasia"],
  ideias: ["arte", "cultura"],
  arte: ["cultura", "filmes", "ideias"],
};

const termContexts = new Map<string, TermContext[]>();

for (const entry of [...DAILY_CATALOG_V3, ...THEME_CATALOG]) {
  const answer = normalizeWord(entry.word);
  const terms = new Map<string, number>([
    [answer, 1],
    ...Object.entries(entry.aliases).map(([term, rank]) => [normalizeWord(term), rank] as const),
  ]);

  terms.forEach((relationRank, term) => {
    const contexts = termContexts.get(term) ?? [];
    contexts.push({ answer, category: entry.category, relationRank, entry });
    termContexts.set(term, contexts);
  });
}

function stableRank(min: number, max: number, key: string): number {
  let hash = 2166136261;
  for (const char of key) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return min + ((hash >>> 0) % (max - min + 1));
}

function directRank(entry: WordEntry, normalizedTerm: string): number | undefined {
  return Object.entries(entry.aliases).find(
    ([term]) => normalizeWord(term) === normalizedTerm,
  )?.[1];
}

/**
 * Ranks a valid word that is not a direct alias of the answer.
 *
 * The curated catalog is treated as a small semantic graph: answers and aliases
 * are nodes, direct aliases are edges, and categories provide the wider
 * neighbourhood. Unknown dictionary words remain distant. This deliberately
 * avoids spelling similarity: sharing letters does not make two words related.
 */
export function semanticGraphRank(guessWord: string, target: WordEntry): number {
  const guess = normalizeWord(guessWord);
  const answer = normalizeWord(target.word);
  const contexts = termContexts.get(guess) ?? [];
  let best = 99;

  for (const context of contexts) {
    const reverse = directRank(context.entry, answer);
    if (context.relationRank === 1 && reverse !== undefined) {
      best = Math.min(best, Math.max(12, Math.min(30, reverse + 7)));
      continue;
    }

    if (context.category === target.category) {
      best = Math.min(
        best,
        context.relationRank === 1
          ? stableRank(27, 38, `${guess}/${answer}/answer`)
          : stableRank(34, 49, `${guess}/${answer}/alias`),
      );
      continue;
    }

    if (RELATED_CATEGORIES[target.category]?.includes(context.category)) {
      best = Math.min(best, stableRank(52, 72, `${guess}/${answer}/related`));
    }
  }

  return best === 99 ? stableRank(78, 99, `${guess}/${answer}/distant`) : best;
}
