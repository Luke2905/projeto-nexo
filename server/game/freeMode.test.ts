import { describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import { FREE_CATALOGS } from "./dailyCatalogV3";
import { evaluateGuess } from "./engine";
import { getFreeChallengeMeta, getFreeEntry } from "./freeMode";

const caller = appRouter.createCaller({
  user: null,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
});

describe("free play", () => {
  it.each(["easy", "medium", "hard"] as const)("creates a playable %s round", async difficulty => {
    const meta = await caller.challenges.getFree({ difficulty, nonce: `test-${difficulty}` });
    expect(meta.difficulty).toBe(difficulty);
    expect(meta).not.toHaveProperty("word");
    expect(meta).not.toHaveProperty("aliases");
    const entry = getFreeEntry(meta.challengeId)!;
    await expect(caller.challenges.submitGuess({ challengeId: meta.challengeId, word: entry.word }))
      .resolves.toMatchObject({ rank: 1, solved: true });
  });

  it("is stable for one nonce and provides populated difficulty pools", () => {
    expect(getFreeChallengeMeta("medium", "same-round"))
      .toEqual(getFreeChallengeMeta("medium", "same-round"));
    for (const catalog of Object.values(FREE_CATALOGS)) expect(catalog.length).toBeGreaterThan(20);
  });

  it("uses semantic relations instead of shared spelling for fallback ranks", () => {
    const target = FREE_CATALOGS.easy.find(entry => entry.word === "água")!;
    expect(evaluateGuess("oceano", target).rank).toBeLessThan(evaluateGuess("trabalho", target).rank);
  });
});

