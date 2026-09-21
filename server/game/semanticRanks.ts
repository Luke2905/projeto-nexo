import { gunzipSync } from "node:zlib";
import rankData, {
  SEMANTIC_NEIGHBOR_LIMIT,
  SEMANTIC_VOCABULARY_SIZE,
  semanticTargets,
  semanticWords,
} from "./generated/semantic-ranks";
import { normalizeWord } from "../../shared/words";

let vocabulary: string[] | undefined;
let targets: string[] | undefined;
let ranks: Buffer | undefined;
const targetRankCache = new Map<number, Map<number, number>>();

function decodedWords(): string[] {
  return vocabulary ??= gunzipSync(Buffer.from(semanticWords, "base64")).toString("utf8").split("\n");
}

function decodedTargets(): string[] {
  return targets ??= gunzipSync(Buffer.from(semanticTargets, "base64")).toString("utf8").split("\n");
}

function decodedRanks(): Buffer {
  return ranks ??= gunzipSync(Buffer.from(rankData, "base64"));
}

function binarySearch(values: readonly string[], sought: string): number {
  let low = 0;
  let high = values.length - 1;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    const value = values[middle];
    if (value === sought) return middle;
    if (value < sought) low = middle + 1;
    else high = middle - 1;
  }
  return -1;
}

function ranksForTarget(targetIndex: number): Map<number, number> {
  const cached = targetRankCache.get(targetIndex);
  if (cached) return cached;
  const result = new Map<number, number>();
  const data = decodedRanks();
  const start = targetIndex * SEMANTIC_NEIGHBOR_LIMIT * 2;
  for (let offset = 0; offset < SEMANTIC_NEIGHBOR_LIMIT; offset++) {
    result.set(data.readUInt16LE(start + offset * 2), offset + 1);
  }
  targetRankCache.set(targetIndex, result);
  return result;
}

/** Exact precomputed embedding rank for the closest semantic neighbourhood. */
export function precomputedSemanticRank(guessWord: string, answerWord: string): number | undefined {
  const targetIndex = binarySearch(decodedTargets(), normalizeWord(answerWord));
  if (targetIndex < 0) return undefined;
  const wordIndex = binarySearch(decodedWords(), normalizeWord(guessWord));
  if (wordIndex < 0) return undefined;
  return ranksForTarget(targetIndex).get(wordIndex);
}

export { SEMANTIC_NEIGHBOR_LIMIT, SEMANTIC_VOCABULARY_SIZE };

