import { TRPCError } from "@trpc/server";
import {
  evaluateGuess,
  getEntryForChallenge,
  isSingleWord,
  normalize,
} from "./engine";
import { isRecognizedWord } from "./lexicon";

export type StoredGuess = ReturnType<typeof evaluateGuess> & {
  word: string;
  requestId?: string;
};
export function validatedGuess(challengeId: string, word: string) {
  const entry = getEntryForChallenge(challengeId);
  if (!entry)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Desafio não encontrado.",
    });
  if (!isSingleWord(word) || !isRecognizedWord(word))
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Palavra não reconhecida. Digite uma palavra válida.",
    });
  const result = evaluateGuess(word, entry);
  return { ...result, word: word.trim(), solved: result.rank === 1 };
}
export function readGuesses(json: string | null): StoredGuess[] {
  try {
    const parsed = JSON.parse(json ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter(
          g => typeof g?.word === "string" && typeof g.rank === "number"
        )
      : [];
  } catch {
    return [];
  }
}
export function appendGuess(
  previous: StoredGuess[],
  challengeId: string,
  word: string,
  requestId: string
) {
  const repeated = previous.find(g => g.requestId === requestId);
  if (repeated) {
    if (normalize(repeated.word) !== normalize(word))
      throw new TRPCError({
        code: "CONFLICT",
        message: "Identificador de palpite já utilizado.",
      });
    return {
      result: { ...repeated, solved: repeated.rank === 1 },
      guesses: previous,
      duplicate: true,
    };
  }
  if (previous.some(g => normalize(g.word) === normalize(word)))
    throw new TRPCError({
      code: "CONFLICT",
      message: "Essa palavra já está no seu mapa de pistas.",
    });
  if (previous.length >= 999)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Limite de armazenamento desta partida atingido.",
    });
  const result = validatedGuess(challengeId, word);
  return {
    result,
    guesses: [{ ...result, requestId }, ...previous],
    duplicate: false,
  };
}
