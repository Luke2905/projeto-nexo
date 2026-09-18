import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
const mock = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("./db/connection", () => ({ getDb: mock.getDb }));
import { appRouter } from "./routers";
import {
  getMap,
  changeConnection,
  saveMapProfile,
  mapLeaderboard,
  mapCompanions,
} from "./db/nexomap";

// Queue database results while retaining the actual repository control flow.
// Unexpected reads fail, so denied maps cannot silently fetch private progress.
function database(results: unknown[][]) {
  const writes: string[] = [];
  let index = 0;
  const db: any = {
    select: () => {
      const query: any = {};
      for (const method of [
        "from",
        "where",
        "limit",
        "for",
        "orderBy",
        "leftJoin",
        "groupBy",
      ])
        query[method] = () => query;
      query.then = (resolve: any, reject: any) => {
        if (index >= results.length)
          return Promise.reject(new Error("Unexpected database read")).then(
            resolve,
            reject
          );
        return Promise.resolve(results[index++]).then(resolve, reject);
      };
      return query;
    },
    transaction: (callback: any) => callback(db),
  };
  for (const action of ["insert", "update", "delete"])
    db[action] = () => {
      writes.push(action);
      const query: any = {};
      for (const method of ["values", "set", "where", "onDuplicateKeyUpdate"])
        query[method] = () => query;
      query.then = (resolve: any) => Promise.resolve({}).then(resolve);
      return query;
    };
  mock.getDb.mockResolvedValue(db);
  return { writes, reads: () => index };
}
const person = {
  id: 2,
  name: "Amiga",
  username: "amiga",
  avatarUrl: null,
  createdAt: new Date(),
};
const profile = {
  userId: 2,
  bio: "privado",
  badges: "[]",
  title: "iniciante",
  accent: "coral",
  visibility: "friends",
  publishActivity: 1,
  showRanking: 1,
};
const user = {
  id: 1,
  openId: "local_test",
  name: "Eu",
  username: "eu",
  passwordHash: null,
  avatarUrl: null,
  email: null,
  loginMethod: "password",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
} as const;
function caller(auth = false) {
  return appRouter.createCaller({
    user: auth ? user : null,
    req: { headers: {} },
    res: {},
  } as TrpcContext);
}
beforeEach(() => vi.clearAllMocks());
describe("NexoMap privacy and friendship authorization", () => {
  it("does not fetch progress or expose bio for an unrelated viewer", async () => {
    const db = database([[person], [profile], [], []]);
    const map = await getMap(2, 1);
    expect(map.restricted).toBe(true);
    expect(map.profile).toBeNull();
    expect(map.progress).toBeNull();
    expect(db.reads()).toBe(4);
  });
  it("blocks visits in either direction before loading any progress", async () => {
    database([
      [person],
      [{ ...profile, visibility: "public" }],
      [{ status: "accepted" }],
      [{ userId: 2, blockedUserId: 1 }],
    ]);
    await expect(getMap(2, 1)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("allows accepted friends to see aggregates, never private guesses", async () => {
    database([
      [person],
      [profile],
      [{ status: "accepted" }],
      [],
      [
        {
          challengeId: "daily-2026-09-17",
          guesses: 8,
          solved: 1,
          verified: 0,
          completedAt: null,
          retryCount: 0,
          progressJson: '[{"word":"secret"}]',
        },
      ],
      [],
    ]);
    const map = await getMap(2, 1);
    expect(map.progress?.solved).toBe(1);
    expect(JSON.stringify(map)).not.toContain("secret");
  });
  it("prevents a sender from accepting their own outgoing request", async () => {
    const db = database([
      [{ id: 1 }],
      [{ id: 2 }],
      [{ userId: 1, friendUserId: 2, status: "pending" }],
      [],
      [{ userId: 1, friendUserId: 2, status: "pending" }],
    ]);
    await expect(changeConnection(1, 2, "accept")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(db.writes).toEqual([]);
  });
  it("does not duplicate an existing request", async () => {
    const db = database([
      [{ id: 1 }],
      [{ id: 2 }],
      [],
      [],
      [{ userId: 1, friendUserId: 2, status: "pending" }],
    ]);
    await changeConnection(1, 2, "request");
    expect(db.writes).toEqual([]);
  });
  it("rejects equipping achievements not yet earned", async () => {
    const db = database([[{ id: 1 }], [], [], []]);
    await expect(
      saveMapProfile(1, {
        name: "Eu",
        username: "jogador",
        bio: "",
        title: "cartographer",
        badges: [],
        accent: "coral",
        visibility: "public",
        publishActivity: true,
        showRanking: true,
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.writes).toEqual([]);
  });
  it("excludes private, friend-only and opted-out maps from the global ranking", async () => {
    database([
      [
        { person, profile: { ...profile, visibility: "public" }, solved: 8 },
        { person: { ...person, id: 3 }, profile, solved: 9 },
        {
          person: { ...person, id: 4 },
          profile: { ...profile, visibility: "public", showRanking: 0 },
          solved: 10,
        },
      ],
    ]);
    const result = await mapLeaderboard();
    expect(result.rows.map(r => r.id)).toEqual([2]);
    expect(result.rows[0].position).toBe(1);
  });
  it("rejects client-authored completions even for signed-in users", async () => {
    await expect(
      caller(true).games.saveProgress({
        challengeId: "daily-2026-09-17",
        guesses: 1,
        bestRank: 1,
        solved: true,
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mock.getDb).not.toHaveBeenCalled();
  });
  it("requires authentication for settings, relations, exports and deletion", async () => {
    await expect(caller().nexomap.me()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(caller().nexomap.connections()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(caller().nexomap.export()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(
      caller().nexomap.deleteAccount({
        password: "password",
        confirmation: "EXCLUIR",
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("friend markers", () => {
  it("never puts a private friend's milestone on the map", async () => {
    const publicFriend = { ...person, id: 3, name: "Amigo público" };
    database([
      [
        { userId: 1, friendUserId: 2, status: "accepted" },
        { userId: 1, friendUserId: 3, status: "accepted" },
      ],
      [],
      [person, publicFriend],
      [
        { ...profile, visibility: "private" },
        { ...profile, userId: 3, visibility: "friends" },
      ],
      [
        {
          userId: 3,
          challengeId: "theme-food",
          solved: 1,
          guesses: 8,
          retryCount: 0,
          verified: 1,
          completedAt: new Date(),
        },
      ],
    ]);
    const markers = await mapCompanions(1);
    expect(markers.map(p => p.id)).toEqual([3]);
    expect(markers[0].milestone).toBe("first");
    expect(markers[0]).not.toHaveProperty("progressJson");
  });
  it("does not fetch game data when all friends' maps are private", async () => {
    const db = database([
      [{ userId: 1, friendUserId: 2, status: "accepted" }],
      [],
      [person],
      [{ ...profile, visibility: "private" }],
    ]);
    expect(await mapCompanions(1)).toEqual([]);
    expect(db.reads()).toBe(4);
  });
});
