import { TRPCError } from "@trpc/server";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { isPublicChallengePath } from "../../shared/publicChallenges";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // Even a valid session cookie must not wake TiDB for anonymous game data.
  // Mixed batches still authenticate; protected procedures never bypass auth.
  const calls = opts.info?.calls;
  if (calls?.length && calls.every(call => isPublicChallengePath(call.path))) {
    return { req: opts.req, res: opts.res, user: null };
  }

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // A database outage must not turn an authenticated request into a guest.
    if (error instanceof TRPCError && error.code === "SERVICE_UNAVAILABLE") throw error;
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
