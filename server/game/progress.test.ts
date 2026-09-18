import { describe, expect, it } from "vitest";
import { appendGuess, validatedGuess } from "./progress";
import { getEntryForDate } from "./engine";
const challenge = "daily-2026-09-17";
describe("server-owned guesses", () => {
  it("evaluates the real answer and derives the full sequence", () => {
    const first = appendGuess([], challenge, "água", "first");
    expect(first.guesses).toHaveLength(1);
    const answer = getEntryForDate("2026-09-17").word;
    if (answer !== "água") {
      const second = appendGuess(first.guesses, challenge, answer, "second");
      expect(second.result.solved).toBe(true);
      expect(second.result.rank).toBe(1);
      expect(second.guesses).toHaveLength(2);
    }
  });
  it("replays the same request without adding attempts and rejects reused IDs for another word", () => {
    const first = appendGuess([], challenge, "água", "same");
    const retry = appendGuess(first.guesses, challenge, "AGUA", "same");
    expect(retry.duplicate).toBe(true);
    expect(retry.guesses).toHaveLength(1);
    expect(() => appendGuess(first.guesses, challenge, "casa", "same")).toThrow(
      "Identificador"
    );
  });
  it("rejects duplicate accent variants, invalid words and future challenges", () => {
    const first = appendGuess([], challenge, "água", "first");
    expect(() =>
      appendGuess(first.guesses, challenge, "AGUA", "different")
    ).toThrow("já está");
    expect(() => validatedGuess(challenge, "xqztrp")).toThrow(
      "não reconhecida"
    );
    expect(() => validatedGuess("daily-2099-01-01", "casa")).toThrow(
      "não encontrado"
    );
  });
});
