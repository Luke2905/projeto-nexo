import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

const authenticateRequest = vi.hoisted(() => vi.fn());
vi.mock("./sdk", () => ({ sdk: { authenticateRequest } }));
import { createContext } from "./context";
const options = { req: { headers: {} }, res: {} } as CreateExpressContextOptions;
beforeEach(() => { authenticateRequest.mockReset(); });

describe("authentication during database startup", () => {
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
