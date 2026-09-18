import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { UNAUTHED_ERR_MSG } from "../shared/const";
import type { TrpcContext } from "./_core/context";

function createContext(user: TrpcContext["user"] = null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("social routes", () => {
  it("blocks saving a game for guests", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.games.saveProgress({
      challengeId: "daily-2026-09-17",
      guesses: 4,
      bestRank: 1,
      solved: true,
    })).rejects.toMatchObject({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  });

  it("blocks friend list access for guests", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.leaderboard.friends()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("keeps the public leaderboard callable without an account", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.leaderboard.list();
    expect(Array.isArray(result)).toBe(true);
  });
});
