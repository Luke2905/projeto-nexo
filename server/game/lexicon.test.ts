import { gunzipSync } from "node:zlib";
import encodedWords from "./generated/pt-br";
import { describe, expect, it } from "vitest";
import { isRecognizedWord } from "./lexicon";
import { normalizeWord } from "../../shared/words";
import { WORD_CATALOG, THEME_CATALOG } from "./dictionary";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

const caller = appRouter.createCaller({
  user: null,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
});
const challengeId = "daily-2024-01-01"; // farol

describe("Portuguese guess validation", () => {
  it("recognizes words, inflections and optional accents", () => {
    for (const word of ["água", "agua", "céu", "ceu", "coração", "coracao", "ações", "acoes", "casa", "casas", "livros", "correr", "correndo", "correram", "abacaxi", "  ÁGUA  ", "ce\u0301u", "chakra"]) {
      expect(isRecognizedWord(word), word).toBe(true);
    }
  });

  it("rejects invented words, misspellings and non-word inputs", () => {
    for (const word of ["asdfgh", "xqztrp", "cachoro", "abacaxii", "zzzzzzzz", "", "duas palavras", "casa123", "água!", "<script>", "a".repeat(81)]) {
      expect(isRecognizedWord(word), word).toBe(false);
    }
  });

  it("keeps all challenge answers and single-word clues playable", () => {
    for (const entry of [...WORD_CATALOG, ...THEME_CATALOG]) {
      for (const word of [entry.word, ...Object.keys(entry.aliases)].filter(word => !word.includes(" "))) {
        expect(isRecognizedWord(word), word).toBe(true);
      }
    }
  });

  it("finds words across the sorted index, including its boundaries", () => {
    const words = gunzipSync(Buffer.from(encodedWords, "base64")).toString("utf8").split("\n");
    expect(isRecognizedWord(words[0])).toBe(true);
    expect(isRecognizedWord(words[words.length - 1])).toBe(true);
    for (let index = 0; index < words.length; index += 1000) {
      expect(isRecognizedWord(words[index]), words[index]).toBe(true);
    }
  });

  it("uses the same identity for accent/case variants and decomposed Unicode", () => {
    expect(normalizeWord(" ÁGUA ")).toBe(normalizeWord("agua"));
    expect(normalizeWord("ce\u0301u")).toBe(normalizeWord("ceu"));
  });

  it("rejects an invalid guess at the API boundary instead of returning a rank", async () => {
    await expect(caller.challenges.submitGuess({ challengeId, word: "xqztrp" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: "Palavra não reconhecida. Confira a escrita e tente novamente." });
    await expect(caller.challenges.submitGuess({ challengeId, word: "duas palavras" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("keeps valid guesses and the exact answer working without a database", async () => {
    const accented = await caller.challenges.submitGuess({ challengeId, word: "água" });
    const plain = await caller.challenges.submitGuess({ challengeId, word: "agua" });
    expect(plain.rank).toBe(accented.rank);
    expect(plain.proximity).toBe(accented.proximity);
    await expect(caller.challenges.submitGuess({ challengeId, word: " FAROL " }))
      .resolves.toMatchObject({ word: "FAROL", rank: 1, proximity: 100, solved: true });
  });
});
