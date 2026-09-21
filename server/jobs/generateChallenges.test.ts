import { describe, expect, it } from "vitest";
import { normalizeWord } from "../../shared/words";
import { DAILY_REPEAT_COOLDOWN } from "../game/dailySchedule";
import { planChallenges } from "./generateChallenges";

describe("local challenge planning", () => {
  it("creates deterministic snapshots without repeats inside the cooldown", () => {
    const first = planChallenges("2026-09-22", DAILY_REPEAT_COOLDOWN + 30);
    const second = planChallenges("2026-09-22", DAILY_REPEAT_COOLDOWN + 30);
    expect(second).toEqual(first);
    const seen = new Map<string, number>();
    first.forEach((challenge, index) => {
      const word = normalizeWord(challenge.word);
      const previous = seen.get(word);
      if (previous !== undefined) expect(index - previous).toBeGreaterThan(DAILY_REPEAT_COOLDOWN);
      seen.set(word, index);
      expect(JSON.parse(challenge.aliasesJson)[challenge.word]).toBe(1);
    });
  });
});

