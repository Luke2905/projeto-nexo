import {
  and,
  eq,
  inArray,
  like,
  ne,
  or,
  desc,
  sql,
  isNotNull,
} from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  friendships,
  gameSessions,
  nexoAchievements,
  nexoBlocks,
  nexoProfiles,
  users,
} from "../../drizzle/schema";
import {
  calculateProgress,
  canViewMap,
  TITLES,
  type Visibility,
} from "../../shared/nexomap";
import {
  awardProgress,
  lockUser,
  progressFor,
  requireDb,
  type Database,
  type Transaction,
} from "./nexoProgress";

export const defaultProfile = {
  bio: "",
  title: "iniciante",
  badges: "[]",
  accent: "coral",
  visibility: "friends" as Visibility,
  publishActivity: 1,
  showRanking: 1,
};
const identity = {
  id: users.id,
  name: users.name,
  username: users.username,
  avatarUrl: users.avatarUrl,
  createdAt: users.createdAt,
};
export function parseBadges(value: string | null) {
  try {
    const array = JSON.parse(value ?? "[]");
    return Array.isArray(array)
      ? array.filter((x): x is string => typeof x === "string").slice(0, 3)
      : [];
  } catch {
    return [];
  }
}
async function settings(db: Database | Transaction, userId: number) {
  const [profile] = await db
    .select()
    .from(nexoProfiles)
    .where(eq(nexoProfiles.userId, userId));
  return profile ?? { ...defaultProfile, userId };
}
export const pairFilter = (a: number, b: number) =>
  or(
    and(eq(friendships.userId, a), eq(friendships.friendUserId, b)),
    and(eq(friendships.userId, b), eq(friendships.friendUserId, a))
  )!;
async function relationship(
  db: Database | Transaction,
  viewer: number | undefined,
  target: number
) {
  if (!viewer || viewer === target) return { friend: false, blocked: false };
  const connections = await db
    .select()
    .from(friendships)
    .where(pairFilter(viewer, target));
  const blocks = await db
    .select()
    .from(nexoBlocks)
    .where(
      or(
        and(
          eq(nexoBlocks.userId, viewer),
          eq(nexoBlocks.blockedUserId, target)
        ),
        and(eq(nexoBlocks.userId, target), eq(nexoBlocks.blockedUserId, viewer))
      )
    );
  return {
    friend: connections.some(c => c.status === "accepted"),
    blocked: blocks.length > 0,
  };
}
export async function getMap(userId: number, viewer?: number) {
  const db = await requireDb();
  const [person] = await db
    .select(identity)
    .from(users)
    .where(eq(users.id, userId));
  if (!person)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Jogador não encontrado.",
    });
  const profile = await settings(db, userId);
  const relation = await relationship(db, viewer, userId);
  if (relation.blocked)
    throw new TRPCError({ code: "NOT_FOUND", message: "Mapa indisponível." });
  const owner = viewer === userId;
  const visible = canViewMap(
    profile.visibility,
    owner,
    relation.friend,
    relation.blocked
  );
  if (!visible)
    return {
      person,
      profile: null,
      progress: null,
      owner,
      friend: relation.friend,
      restricted: true,
    };
  const progress = await progressFor(db, userId);
  return {
    person,
    profile: { ...profile, badges: parseBadges(profile.badges) },
    progress,
    owner,
    friend: relation.friend,
    restricted: false,
  };
}
export async function getOwnMap(userId: number) {
  const db = await requireDb();
  await db.transaction(async tx => {
    await lockUser(tx, userId);
    await awardProgress(tx, userId, true);
  });
  return getMap(userId, userId);
}
export type ProfileUpdate = {
  name: string;
  username: string;
  bio: string;
  title: string;
  badges: string[];
  accent: string;
  visibility: Visibility;
  publishActivity: boolean;
  showRanking: boolean;
  avatarData?: string | null;
};
export async function saveMapProfile(userId: number, input: ProfileUpdate) {
  const db = await requireDb();
  return db.transaction(async tx => {
    await lockUser(tx, userId);
    const [taken] = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.username, input.username), ne(users.id, userId)));
    if (taken)
      throw new TRPCError({
        code: "CONFLICT",
        message: "Este @usuário já está em uso.",
      });
    const progress = await progressFor(tx, userId);
    const unlocked = new Set(
      progress.achievements.filter(a => a.unlocked).map(a => String(a.id))
    );
    const title = TITLES.find(t => t.id === input.title);
    if (
      !title ||
      (title.achievement && !unlocked.has(title.achievement)) ||
      input.badges.some(id => !unlocked.has(id))
    )
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Escolha títulos e emblemas que você já conquistou.",
      });
    await tx
      .update(users)
      .set({
        name: input.name,
        username: input.username,
        ...(input.avatarData !== undefined
          ? { avatarUrl: input.avatarData }
          : {}),
      })
      .where(eq(users.id, userId));
    const values = {
      bio: input.bio,
      title: input.title,
      badges: JSON.stringify(Array.from(new Set(input.badges))),
      accent: input.accent,
      visibility: input.visibility,
      publishActivity: Number(input.publishActivity),
      showRanking: Number(input.showRanking),
    };
    await tx
      .insert(nexoProfiles)
      .values({ userId, ...values })
      .onDuplicateKeyUpdate({ set: values });
    return { success: true };
  });
}
export async function connectionsFor(userId: number) {
  const db = await requireDb();
  const connections = await db
    .select()
    .from(friendships)
    .where(
      or(eq(friendships.userId, userId), eq(friendships.friendUserId, userId))
    );
  const blocks = await db
    .select()
    .from(nexoBlocks)
    .where(
      or(eq(nexoBlocks.userId, userId), eq(nexoBlocks.blockedUserId, userId))
    );
  const excluded = new Set(
    blocks.map(b => (b.userId === userId ? b.blockedUserId : b.userId))
  );
  const ids = Array.from(
    new Set(
      connections
        .map(c => (c.userId === userId ? c.friendUserId : c.userId))
        .filter(id => !excluded.has(id))
    )
  );
  const people = ids.length
    ? await db.select(identity).from(users).where(inArray(users.id, ids))
    : [];
  const rows = people.map(person => {
    const related = connections.filter(
      c => c.userId === person.id || c.friendUserId === person.id
    );
    const c = related.find(c => c.status === "accepted") ?? related[0];
    return { ...person, status: c.status, incoming: c.friendUserId === userId };
  });
  const ownBlockedIds = blocks
    .filter(b => b.userId === userId)
    .map(b => b.blockedUserId);
  const blocked = ownBlockedIds.length
    ? await db
        .select(identity)
        .from(users)
        .where(inArray(users.id, ownBlockedIds))
    : [];
  return {
    friends: rows.filter(r => r.status === "accepted"),
    incoming: rows.filter(r => r.status === "pending" && r.incoming),
    outgoing: rows.filter(r => r.status === "pending" && !r.incoming),
    blocked,
  };
}
export async function searchPeople(userId: number, query: string) {
  const db = await requireDb();
  const blocks = await db
    .select()
    .from(nexoBlocks)
    .where(
      or(eq(nexoBlocks.userId, userId), eq(nexoBlocks.blockedUserId, userId))
    );
  const excluded = new Set(
    blocks.map(b => (b.userId === userId ? b.blockedUserId : b.userId))
  );
  // Match literal search text; do not let SQL wildcard input enumerate members.
  const escaped = query.replace(/[\\%_]/g, c => "\\" + c);
  const rows = await db
    .select(identity)
    .from(users)
    .where(
      and(
        ne(users.id, userId),
        or(
          like(users.name, "%" + escaped + "%"),
          like(users.username, "%" + escaped + "%")
        )
      )
    )
    .limit(30);
  return rows.filter(p => !excluded.has(p.id));
}
export async function changeConnection(
  userId: number,
  target: number,
  action: "request" | "accept" | "remove" | "block" | "unblock"
) {
  if (userId === target)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Escolha outro jogador.",
    });
  const db = await requireDb();
  return db.transaction(async tx => {
    for (const id of [userId, target].sort((a, b) => a - b))
      await lockUser(tx, id);
    if (action === "unblock") {
      await tx
        .delete(nexoBlocks)
        .where(
          and(
            eq(nexoBlocks.userId, userId),
            eq(nexoBlocks.blockedUserId, target)
          )
        );
      return { success: true };
    }
    if (action === "block") {
      await tx
        .insert(nexoBlocks)
        .values({ userId, blockedUserId: target })
        .onDuplicateKeyUpdate({ set: { userId } });
      await tx.delete(friendships).where(pairFilter(userId, target));
      return { success: true };
    }
    const rel = await relationship(tx, userId, target);
    if (rel.blocked)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Esta conexão está indisponível.",
      });
    const rows = await tx
      .select()
      .from(friendships)
      .where(pairFilter(userId, target));
    if (action === "remove")
      await tx.delete(friendships).where(pairFilter(userId, target));
    if (action === "request" && !rows.length)
      await tx
        .insert(friendships)
        .values({ userId, friendUserId: target, status: "pending" });
    if (action === "accept") {
      if (!rows.some(c => c.friendUserId === userId && c.status === "pending"))
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você só pode aceitar pedidos recebidos.",
        });
      await tx
        .update(friendships)
        .set({ status: "accepted" })
        .where(pairFilter(userId, target));
    }
    return { success: true };
  });
}
export async function friendsFeed(userId: number) {
  const db = await requireDb();
  const graph = await connectionsFor(userId);
  const maps = [];
  // Bound concurrent work against the small serverless connection pool.
  for (const person of graph.friends) {
    try {
      maps.push(await getMap(person.id, userId));
    } catch (error) {
      if (!(error instanceof TRPCError && error.code === "NOT_FOUND"))
        throw error;
    }
  }
  const visible = maps.filter(
    map => map.progress && map.profile?.publishActivity
  );
  const feed = visible.flatMap(map =>
    map
      .progress!.achievements.filter(a => a.unlocked && a.unlockedAt)
      .map(a => ({
        id: "award-" + map.person.id + "-" + a.id,
        userId: map.person.id,
        name: map.person.name,
        message: "conquistou " + a.title + ".",
        at: a.unlockedAt!,
      }))
  );
  const ids = visible.map(map => map.person.id);
  if (ids.length) {
    const completions = await db
      .select({
        id: gameSessions.id,
        userId: gameSessions.userId,
        at: gameSessions.completedAt,
      })
      .from(gameSessions)
      .where(
        and(
          inArray(gameSessions.userId, ids),
          eq(gameSessions.solved, 1),
          eq(gameSessions.verified, 1),
          isNotNull(gameSessions.completedAt)
        )
      )
      .orderBy(desc(gameSessions.completedAt))
      .limit(40);
    for (const completion of completions)
      feed.push({
        id: "game-" + completion.id,
        userId: completion.userId,
        name: visible.find(map => map.person.id === completion.userId)!.person
          .name,
        message: "concluiu mais um desafio.",
        at: completion.at!,
      });
  }
  return feed
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 40);
}
export async function mapLeaderboard(
  viewer?: number,
  scope: "global" | "friends" = "global"
) {
  const db = await requireDb();
  const rows = await db
    .select({
      person: identity,
      profile: nexoProfiles,
      solved: sql<number>`count(distinct case when ${gameSessions.solved} = 1 then ${gameSessions.challengeId} end)`,
    })
    .from(users)
    .leftJoin(nexoProfiles, eq(users.id, nexoProfiles.userId))
    .leftJoin(gameSessions, eq(users.id, gameSessions.userId))
    .groupBy(users.id, nexoProfiles.userId)
    .orderBy(
      desc(
        sql`count(distinct case when ${gameSessions.solved} = 1 then ${gameSessions.challengeId} end)`
      ),
      users.id
    );
  const graph = viewer ? await connectionsFor(viewer) : null;
  const friends = new Set(graph?.friends.map(p => p.id) ?? []);
  const blocks = viewer
    ? await db
        .select()
        .from(nexoBlocks)
        .where(
          or(
            eq(nexoBlocks.userId, viewer),
            eq(nexoBlocks.blockedUserId, viewer)
          )
        )
    : [];
  const excluded = new Set(
    blocks.map(b => (b.userId === viewer ? b.blockedUserId : b.userId))
  );
  const eligible = rows.filter(r => {
    const p = r.profile ?? defaultProfile;
    return (
      Number(r.solved) > 0 &&
      p.showRanking &&
      !excluded.has(r.person.id) &&
      (scope === "global"
        ? p.visibility === "public"
        : viewer &&
          (r.person.id === viewer || friends.has(r.person.id)) &&
          canViewMap(
            p.visibility,
            r.person.id === viewer,
            friends.has(r.person.id),
            false
          ))
    );
  });
  const ranked = eligible.map((r, i) => ({
    ...r.person,
    solved: Number(r.solved),
    position: i + 1,
  }));
  return {
    rows: ranked.slice(0, 50),
    mine: ranked.find(r => r.id === viewer) ?? null,
    total: ranked.length,
  };
}

export async function mapCompanions(userId: number) {
  const db = await requireDb();
  const graph = await connectionsFor(userId);
  if (!graph.friends.length) return [];
  const ids = graph.friends.map(p => p.id);
  const profiles = await db
    .select()
    .from(nexoProfiles)
    .where(inArray(nexoProfiles.userId, ids));
  const visible = graph.friends.filter(person => {
    const profile =
      profiles.find(p => p.userId === person.id) ?? defaultProfile;
    return canViewMap(profile.visibility, false, true, false);
  });
  if (!visible.length) return [];
  const sessions = await db
    .select()
    .from(gameSessions)
    .where(
      inArray(
        gameSessions.userId,
        visible.map(p => p.id)
      )
    );
  return visible
    .flatMap(person => {
      const progress = calculateProgress(
        sessions.filter(s => s.userId === person.id)
      );
      const milestone = progress.achievements
        .filter(a => a.path === "descoberta" && a.unlocked)
        .at(-1);
      return milestone
        ? [
            {
              id: person.id,
              name: person.name,
              avatarUrl: person.avatarUrl,
              milestone: milestone.id,
            },
          ]
        : [];
    })
    .slice(0, 12);
}
