import { randomUUID } from "node:crypto";
import { and, eq, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import {
  nexoProfiles,
  nexoAchievements,
  nexoBlocks,
  friendships,
  gameSessions,
  users,
} from "../drizzle/schema";
import {
  getMap,
  getOwnMap,
  saveMapProfile,
  connectionsFor,
  searchPeople,
  changeConnection,
  friendsFeed,
  mapCompanions,
  mapLeaderboard,
  likeEvent,
  unlikeEvent,
} from "./db/nexomap";
import { lockUser, requireDb } from "./db/nexoProgress";
import { hashPassword, verifyPassword } from "./localAuth";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";

const userId = z.number().int().positive();
const password = z.string().min(8, "Use pelo menos 8 caracteres.").max(128);
const avatarData = z
  .string()
  .max(40000)
  .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/, "Foto inválida.")
  .refine(value => {
    const bytes = Buffer.from(value.split(",")[1] ?? "", "base64");
    return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  }, "Foto inválida.")
  .nullable()
  .optional();
const profileInput = z.object({
  avatarData,
  name: z.string().trim().min(2).max(80),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(32)
    .regex(
      /^[a-z0-9_.-]+$/,
      "Use letras, números, ponto, hífen ou sublinhado."
    ),
  bio: z.string().trim().max(240),
  title: z.string().max(40),
  badges: z.array(z.string().max(40)).max(3),
  accent: z.enum(["coral", "blue", "gold", "mint"]),
  visibility: z.enum(["public", "friends", "private"]),
  publishActivity: z.boolean(),
  showRanking: z.boolean(),
});
export const nexomapRouter = router({
  me: protectedProcedure.query(({ ctx }) => getOwnMap(ctx.user.id)),
  profile: publicProcedure
    .input(z.object({ userId, preview: z.boolean().optional() }))
    .query(({ ctx, input }) =>
      getMap(
        input.userId,
        input.preview && ctx.user?.id === input.userId
          ? undefined
          : ctx.user?.id
      )
    ),
  save: protectedProcedure
    .input(profileInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await saveMapProfile(ctx.user.id, input);
      } catch (error: any) {
        if (
          error?.code === "ER_DUP_ENTRY" ||
          error?.cause?.code === "ER_DUP_ENTRY"
        )
          throw new TRPCError({
            code: "CONFLICT",
            message: "Este @usuário já está em uso.",
          });
        throw error;
      }
    }),
  connections: protectedProcedure.query(({ ctx }) =>
    connectionsFor(ctx.user.id)
  ),
  search: protectedProcedure
    .input(z.object({ query: z.string().trim().min(2).max(60) }))
    .query(({ ctx, input }) => searchPeople(ctx.user.id, input.query)),
  connect: protectedProcedure
    .input(
      z.object({
        userId,
        action: z.enum(["request", "accept", "remove", "block", "unblock"]),
      })
    )
    .mutation(({ ctx, input }) =>
      changeConnection(ctx.user.id, input.userId, input.action)
    ),
  companions: protectedProcedure.query(({ ctx }) => mapCompanions(ctx.user.id)),
  feed: protectedProcedure.query(({ ctx }) => friendsFeed(ctx.user.id)),
  likeEvent: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .mutation(({ ctx, input }) => likeEvent(ctx.user.id, input.eventId)),
  unlikeEvent: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .mutation(({ ctx, input }) => unlikeEvent(ctx.user.id, input.eventId)),
  ranking: publicProcedure
    .input(z.object({ scope: z.enum(["global", "friends"]) }))
    .query(({ ctx, input }) => {
      if (input.scope === "friends" && !ctx.user)
        throw new TRPCError({ code: "UNAUTHORIZED" });
      return mapLeaderboard(ctx.user?.id, input.scope);
    }),
  changePassword: protectedProcedure
    .input(z.object({ current: z.string().min(1).max(128), next: password }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const openId = "local_" + randomUUID();
      const nextHash = await hashPassword(input.next);
      await db.transaction(async tx => {
        await lockUser(tx, ctx.user.id);
        const [user] = await tx
          .select()
          .from(users)
          .where(eq(users.id, ctx.user.id));
        if (
          !user.passwordHash ||
          !(await verifyPassword(input.current, user.passwordHash))
        )
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Senha atual incorreta.",
          });
        await tx
          .update(users)
          .set({ passwordHash: nextHash, openId })
          .where(eq(users.id, user.id));
      });
      const token = await sdk.createSessionToken(openId, {
        name: ctx.user.name ?? "Jogador",
      });
      ctx.res.cookie(COOKIE_NAME, token, {
        ...getSessionCookieOptions(ctx.req),
        maxAge: 30 * 86400000,
      });
      return { success: true };
    }),
  export: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    return {
      exportedAt: new Date(),
      map: await getOwnMap(ctx.user.id),
      sessions: await db
        .select({
          challengeId: gameSessions.challengeId,
          guesses: gameSessions.guesses,
          totalGuesses: gameSessions.totalGuesses,
          solved: gameSessions.solved,
          retryCount: gameSessions.retryCount,
          completedAt: gameSessions.completedAt,
          playedAt: gameSessions.playedAt,
        })
        .from(gameSessions)
        .where(eq(gameSessions.userId, ctx.user.id)),
      connections: await connectionsFor(ctx.user.id),
    };
  }),
  deleteAccount: protectedProcedure
    .input(
      z.object({
        password: z.string().min(1).max(128),
        confirmation: z.literal("EXCLUIR"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.transaction(async tx => {
        await lockUser(tx, ctx.user.id);
        const [user] = await tx
          .select()
          .from(users)
          .where(eq(users.id, ctx.user.id));
        if (
          !user.passwordHash ||
          !(await verifyPassword(input.password, user.passwordHash))
        )
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Senha incorreta.",
          });
        await tx
          .delete(friendships)
          .where(
            or(
              eq(friendships.userId, user.id),
              eq(friendships.friendUserId, user.id)
            )
          );
        await tx
          .delete(nexoBlocks)
          .where(
            or(
              eq(nexoBlocks.userId, user.id),
              eq(nexoBlocks.blockedUserId, user.id)
            )
          );
        await tx
          .delete(nexoAchievements)
          .where(eq(nexoAchievements.userId, user.id));
        await tx.delete(gameSessions).where(eq(gameSessions.userId, user.id));
        await tx.delete(nexoProfiles).where(eq(nexoProfiles.userId, user.id));
        await tx.delete(users).where(eq(users.id, user.id));
      });
      ctx.res.clearCookie(COOKIE_NAME, {
        ...getSessionCookieOptions(ctx.req),
        maxAge: -1,
      });
      return { success: true };
    }),
});
