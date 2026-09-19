/**
 * @file routers.ts
 * @description Main tRPC application router defining API endpoints and procedures.
 */
import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { addFriend, createLocalUser, getFriends, getGameHistory, getLeaderboard, getUserByUsername, giveUpGame, submitSavedGuess, retryGame, updateUserProfile } from "./db";
import { hashPassword, normalizeUsername, verifyPassword } from "./localAuth";
import { nexomapRouter } from "./nexomapRouter";
import { storagePut } from "./storage";

const failedLogins = new Map<string, { count: number; resetAt: number }>();
const usernameSchema = z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_.-]+$/, "Use apenas letras, números, ponto, hífen ou sublinhado.");
function assertLocalAuthConfigured() {
  if (ENV.cookieSecret.length < 32 || !ENV.databaseUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Autenticação indisponível. Verifique a configuração do servidor.",
    });
  }
}

const passwordSchema = z.string().min(8, "A senha precisa ter pelo menos 8 caracteres.").max(128);

/**
 * Checks if the current login attempt is rate limited.
 * Throws TRPCError if the limit has been exceeded.
 */
function checkRateLimit(key: string) {
  const now = Date.now();
  const current = failedLogins.get(key);
  if (!current || current.resetAt < now) return;
  if (current.count >= 5) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Muitas tentativas. Aguarde alguns minutos e tente novamente." });
}

/**
 * Records a failed login attempt for rate limiting purposes.
 */
function registerFailure(key: string) {
  const now = Date.now();
  const current = failedLogins.get(key);
  if (!current || current.resetAt < now) failedLogins.set(key, { count: 1, resetAt: now + 10 * 60 * 1000 });
  else failedLogins.set(key, { count: current.count + 1, resetAt: current.resetAt });
}

/**
 * Clears failed login attempts for a specific key.
 */
function clearFailures(key: string) {
  failedLogins.delete(key);
}

/**
 * Creates and sets a local session cookie for an authenticated user.
 */
async function createLocalSession(ctx: { res: any; req: any }, user: { openId: string; name: string | null }) {
  const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "Jogador" });
  ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: 1000 * 60 * 60 * 24 * 30 });
}

export const appRouter = router({
  system: systemRouter,
  nexomap: nexomapRouter,
  
  /** 
   * Authentication and user profile router.
   */
  auth: router({
    me: publicProcedure.query((opts) => {
      const user = opts.ctx.user;
      if (!user) return null;
      // Never expose passwordHash or internal fields to the client
      return {
        id: user.id,
        name: user.name,
        username: (user as any).username ?? null,
        avatarUrl: user.avatarUrl,
        role: user.role,
        loginMethod: user.loginMethod,
        createdAt: user.createdAt,
      };
    }),
    updateProfile: protectedProcedure
      .input(z.object({ name: z.string().trim().min(2).max(80).optional(), avatarData: z.string().max(3_000_000).optional(), avatarType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional() }))
      .mutation(async ({ ctx, input }) => {
        let avatarUrl: string | undefined;
        if (input.avatarData) {
          const raw = input.avatarData.replace(/^data:[^;]+;base64,/, "");
          const bytes = Buffer.from(raw, "base64");
          if (bytes.length > 2 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "A foto precisa ter no máximo 2 MB." });
          const uploaded = await storagePut(`avatars/${ctx.user.id}/profile`, bytes, input.avatarType ?? "image/jpeg");
          avatarUrl = uploaded.url;
        }
        const user = await updateUserProfile(ctx.user.id, { ...(input.name ? { name: input.name } : {}), ...(avatarUrl ? { avatarUrl } : {}) });
        return { success: true };
      }),
    register: publicProcedure
      .input(z.object({ username: usernameSchema, name: z.string().trim().min(2).max(80), password: passwordSchema }))
      .mutation(async ({ ctx, input }) => {
        assertLocalAuthConfigured();
        const username = normalizeUsername(input.username);
        if (await getUserByUsername(username)) throw new TRPCError({ code: "CONFLICT", message: "Esse usuário já está em uso." });
        const user = await createLocalUser({ username, name: input.name.trim(), passwordHash: await hashPassword(input.password) });
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível criar sua conta." });
        await createLocalSession(ctx, user);
        return { id: user.id, username: user.username, name: user.name };
      }),
    login: publicProcedure
      .input(z.object({ username: usernameSchema, password: z.string().min(1).max(128) }))
      .mutation(async ({ ctx, input }) => {
        assertLocalAuthConfigured();
        const username = normalizeUsername(input.username);
        const rateKey = `${ctx.req.ip ?? "unknown"}:${username}`;
        checkRateLimit(rateKey);
        const user = await getUserByUsername(username);
        const valid = Boolean(user?.passwordHash && await verifyPassword(input.password, user.passwordHash));
        if (!user || !valid) {
          registerFailure(rateKey);
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário ou senha inválidos." });
        }
        clearFailures(rateKey);
        await createLocalSession(ctx, user);
        return { id: user.id, username: user.username, name: user.name };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  
  /**
   * Game challenge catalog and guess validation router.
   * Answers are never exposed to the client — only metadata (prompt, category, accent).
   */
  challenges: router({
    /**
     * Returns today's daily challenge metadata (no answer).
     * The date is always read from the server clock to prevent spoofing.
     */
    getDaily: publicProcedure
      .input(z.object({ date: z.string().max(10) }).optional())
      .query(async ({ input }) => {
        const { getDailyChallengeMeta, getEntryForChallenge, todayUTC } = await import("./game/engine");
        const date = input?.date ?? todayUTC();
        if (!(await getEntryForChallenge(`daily-${date}`))) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Desafio não encontrado ou ainda não disponível." });
        }
        return await getDailyChallengeMeta(date);
      }),

    getDailyArchive: publicProcedure.query(async () => {
      const { getDailyArchive } = await import("./game/engine");
      return await getDailyArchive();
    }),

    /**
     * Returns the static theme challenges metadata (no answers).
     */
    getThemes: publicProcedure.query(async () => {
      const { getThemesMeta } = await import("./game/engine");
      return getThemesMeta();
    }),

    /**
     * Validates a guess word against the challenge answer on the server.
     * Returns rank, proximity and heat tag — never the answer itself.
     */
    submitGuess: publicProcedure
      .input(z.object({
        challengeId: z.string().max(96),
        word: z.string().trim().min(1).max(80),
      }))
      .mutation(async ({ input }) => {
        const { getEntryForChallenge, evaluateGuess, isSingleWord } = await import("./game/engine");

        if (!isSingleWord(input.word)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Digite apenas uma palavra, sem espaços ou frases." });
        }

        const entry = await getEntryForChallenge(input.challengeId);
        if (!entry) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Desafio não encontrado." });
        }

        const { isRecognizedWord } = await import("./game/lexicon");
        if (!isRecognizedWord(input.word)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Palavra não reconhecida. Confira a escrita e tente novamente." });
        }

        const result = evaluateGuess(input.word, entry);
        return {
          word: input.word.trim(),
          rank: result.rank,
          proximity: result.proximity,
          tag: result.tag,
          solved: result.rank === 1,
        };
      }),

    /**
     * Returns the subtle hint for a challenge based on its category.
     * The hint is poetic and category-based — never reveals the answer.
     */
    getHint: publicProcedure
      .input(z.object({ challengeId: z.string().max(96) }))
      .query(async ({ input }) => {
        const { getHintForChallenge } = await import("./game/engine");
        return { hint: await getHintForChallenge(input.challengeId) };
      }),
  }),

  /**
   * Game sessions and challenge progression router.
   */
  games: router({
    guess: protectedProcedure.input(z.object({ challengeId: z.string().max(96), word: z.string().trim().min(1).max(80), requestId: z.string().uuid() })).mutation(({ ctx, input }) => submitSavedGuess(ctx.user.id, input)),
    useCloseHint: protectedProcedure.input(z.object({ challengeId: z.string().max(96), requestId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
      const { useCloseHint } = await import("./db/games");
      return useCloseHint(ctx.user.id, input.challengeId, input.requestId);
    }),
    history: protectedProcedure.query(({ ctx }) => getGameHistory(ctx.user.id)),
    giveUp: protectedProcedure.input(z.object({ challengeId: z.string().max(96) })).mutation(({ ctx, input }) => giveUpGame(ctx.user.id, input.challengeId)),
    retry: protectedProcedure.input(z.object({ challengeId: z.string().max(96) })).mutation(async ({ ctx, input }) => {
      const result = await retryGame(ctx.user.id, input.challengeId);
      if (result?.lost) throw new TRPCError({ code: "FORBIDDEN", message: "Você atingiu o limite de 3 novas tentativas para este dia." });
      return result;
    }),
    /**
     * Legacy endpoint retained only to tell old clients to reload.
     * New clients submit individual guesses via games.guess.
     */
    saveProgress: protectedProcedure
      .input(z.object({
        challengeId: z.string().max(96),
        guesses: z.number().int().min(0).max(999),
        bestRank: z.number().int().min(1).max(999),
        solved: z.boolean(),
        progressJson: z.string().max(50_000).optional(),
      }))
      .mutation(() => { throw new TRPCError({ code: "BAD_REQUEST", message: "Atualize a página para salvar seus palpites com a nova versão." }); }),
  }),
  
  /**
   * Social features and global leaderboard router.
   */
  leaderboard: router({
    list: publicProcedure.query(() => getLeaderboard()),
    friends: protectedProcedure.query(({ ctx }) => getFriends(ctx.user.id)),
    add: protectedProcedure.input(z.object({ friendUserId: z.number().int().positive() })).mutation(({ ctx, input }) => addFriend(ctx.user.id, input.friendUserId)),
  }),
});

export type AppRouter = typeof appRouter;
