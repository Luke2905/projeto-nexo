import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

const authenticateRequest = vi.hoisted(() => vi.fn());
vi.mock("./sdk", () => ({ sdk: { authenticateRequest } }));
import { createContext } from "./context";
import { PUBLIC_CHALLENGE_PATHS } from "../../shared/publicChallenges";
const options = { req: { headers: {} }, res: {} } as CreateExpressContextOptions;
beforeEach(() => { authenticateRequest.mockReset(); });

describe("authentication during database startup", () => {
  const withCalls = (...paths: string[]) => ({
    ...options,
    req: { headers: { cookie: "session=existing-session" } },
    info: { calls: paths.map(path => ({ path })) },
  }) as CreateExpressContextOptions;

  it("serves all public challenge operations without waking TiDB, even with a cookie", async () => {
    authenticateRequest.mockImplementation(() => new Promise(() => {}));
    for (const path of PUBLIC_CHALLENGE_PATHS) {
      expect((await createContext(withCalls(path))).user).toBeNull();
    }
    expect((await createContext(withCalls(...PUBLIC_CHALLENGE_PATHS))).user).toBeNull();
    expect(authenticateRequest).not.toHaveBeenCalled();
  });

  it.each(["games.history", "games.saveProgress", "auth.me", "challenges.privateFutureRoute"])(
    "never skips authentication for a mixed batch containing %s", async path => {
      const error = new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      authenticateRequest.mockRejectedValue(error);
      await expect(createContext(withCalls("challenges.getDaily", path))).rejects.toBe(error);
      expect(authenticateRequest).toHaveBeenCalledOnce();
    },
  );
  it("preserves database unavailability instead of silently logging the user out", async () => {
    const error = new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" });
    authenticateRequest.mockRejectedValue(error);
    await expect(createContext(options)).rejects.toBe(error);
  });
  it("still allows a guest when there is no valid session", async () => {
    authenticateRequest.mockRejectedValue(new Error("Invalid session cookie"));
    expect((await createContext(options)).user).toBeNull();
  });
});
