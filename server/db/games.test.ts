import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("./connection", () => ({ getDb: mock.getDb }));
import { submitSavedGuess, retryGame, giveUpGame } from "./games";

function database(results: unknown[][]) {
  const mutations: { action: string; values?: any }[] = [];
  let index = 0;
  const db: any = {
    select: () => {
      const q: any = {};
      for (const m of ["from", "where", "orderBy", "limit", "for"])
        q[m] = () => q;
      q.then = (resolve: any, reject: any) => {
        if (index >= results.length)
          return Promise.reject(new Error("Unexpected read " + index)).then(
            resolve,
            reject
          );
        return Promise.resolve(results[index++]).then(resolve, reject);
      };
      return q;
    },
    transaction: (fn: any) => fn(db),
  };
  for (const action of ["insert", "update"])
    db[action] = () => {
      const record: { action: string; values?: any } = { action };
      mutations.push(record);
      const q: any = {
        values: (v: any) => {
          record.values = v;
          return q;
        },
        set: (v: any) => {
          record.values = v;
          return q;
        },
        where: () => q,
        then: (resolve: any) => Promise.resolve({}).then(resolve),
      };
      return q;
    };
  mock.getDb.mockResolvedValue(db);
  return mutations;
}
beforeEach(() => vi.clearAllMocks());
const guess = { challengeId: "theme-food", word: "casa", requestId: "a" };
describe("persisted game transitions", () => {
  it("stores an evaluated first guess using server-owned counters", async () => {
    const writes = database([[{ id: 1 }], []]);
    const result = await submitSavedGuess(1, guess);
    expect(result.guesses).toHaveLength(1);
    expect(writes).toHaveLength(1);
    expect(writes[0].values).toMatchObject({
      guesses: 1,
      totalGuesses: 1,
      verified: 1,
      solved: 0,
      userId: 1,
    });
    expect(writes[0].values.bestRank).toBe(result.rank);
  });
  it("replays a request without rewriting attempts", async () => {
    const stored = {
      word: "casa",
      rank: 20,
      proximity: 47,
      tag: "mais distante",
      requestId: "a",
    };
    const writes = database([
      [{ id: 1 }],
      [
        {
          id: 10,
          solved: 0,
          lost: 0,
          progressJson: JSON.stringify([stored]),
          guesses: 1,
          totalGuesses: 1,
          verified: 1,
        },
      ],
    ]);
    const result = await submitSavedGuess(1, guess);
    expect(result.guesses).toHaveLength(1);
    expect(writes).toHaveLength(0);
  });
  it("rejects attempts in a lost session until retry", async () => {
    const writes = database([
      [{ id: 1 }],
      [{ id: 10, solved: 0, lost: 1, progressJson: null }],
    ]);
    await expect(submitSavedGuess(1, guess)).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(writes).toHaveLength(0);
  });
  it("retains accumulated attempts on retry and enforces the retry limit", async () => {
    const row = { id: 10, lost: 1, solved: 0, retryCount: 1, totalGuesses: 20 };
    const writes = database([[{ id: 1 }], [row]]);
    const result = await retryGame(1, "theme-food");
    expect(result.totalGuesses).toBe(20);
    expect(result.retryCount).toBe(2);
    expect(writes[0].values).not.toHaveProperty("totalGuesses");
    const second = database([[{ id: 1 }], [{ ...row, retryCount: 3 }]]);
    await expect(retryGame(1, "theme-food")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(second).toHaveLength(0);
  });
  it("does not turn a solved challenge into a lost one", async () => {
    const writes = database([[{ id: 1 }], [{ id: 10, solved: 1 }]]);
    await giveUpGame(1, "theme-food");
    expect(writes).toHaveLength(0);
  });
});
