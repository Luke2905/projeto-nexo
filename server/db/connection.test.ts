import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createPool: vi.fn(),
  drizzle: vi.fn(),
  env: { databaseUrl: "mysql://test:local@localhost:3306/test" },
}));
vi.mock("mysql2/promise", () => ({ default: { createPool: mocks.createPool } }));
vi.mock("drizzle-orm/mysql2", () => ({ drizzle: mocks.drizzle }));
vi.mock("../_core/env", () => ({ ENV: mocks.env }));

function failure(code: string) {
  return Object.assign(new Error(code), { code });
}
function fixtures() {
  const connection = { query: vi.fn().mockResolvedValue([[]]), release: vi.fn(), destroy: vi.fn() };
  const pool = { getConnection: vi.fn().mockResolvedValue(connection), end: vi.fn().mockResolvedValue(undefined) };
  const database = { ready: true };
  mocks.createPool.mockReturnValue(pool);
  mocks.drizzle.mockReturnValue(database);
  return { connection, pool, database };
}

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  mocks.env.databaseUrl = "mysql://test:local@localhost:3306/test";
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("database cold-start readiness", () => {
  it("shares a slow initialization across requests and reuses the ready database", async () => {
    const { pool, connection, database } = fixtures();
    pool.getConnection.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(connection), 18_000)));
    const { getDb } = await import("./connection");
    let completed = false;
    const requests = Promise.all([getDb(), getDb(), getDb()]).then(result => { completed = true; return result; });
    await vi.advanceTimersByTimeAsync(17_000);
    expect(completed).toBe(false);
    expect(pool.getConnection).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(await requests).toEqual([database, database, database]);
    expect(connection.release).toHaveBeenCalledTimes(1);
    expect(await getDb()).toBe(database);
    expect(mocks.createPool).toHaveBeenCalledTimes(1);
    expect(pool.getConnection).toHaveBeenCalledTimes(1);
    expect(mocks.createPool).toHaveBeenCalledWith(expect.objectContaining({
      uri: mocks.env.databaseUrl, connectTimeout: 20_000, connectionLimit: 3,
    }));
  });

  it("backs off after a transient connection timeout and succeeds on the second attempt", async () => {
    const { pool, database } = fixtures();
    pool.getConnection.mockRejectedValueOnce(failure("ETIMEDOUT"));
    const { getDb } = await import("./connection");
    const pending = getDb();
    await vi.advanceTimersByTimeAsync(1_499);
    expect(pool.getConnection).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toBe(database);
    expect(pool.getConnection).toHaveBeenCalledTimes(2);
    expect(pool.end).not.toHaveBeenCalled();
  });

  it("waits for SQL readiness and discards a timed-out probe before retrying", async () => {
    const { pool, connection, database } = fixtures();
    const broken = { query: vi.fn().mockRejectedValue(failure("PROTOCOL_SEQUENCE_TIMEOUT")), destroy: vi.fn(), release: vi.fn() };
    pool.getConnection.mockResolvedValueOnce(broken);
    const { getDb } = await import("./connection");
    const pending = getDb();
    await vi.advanceTimersByTimeAsync(1_500);
    expect(await pending).toBe(database);
    expect(broken.destroy).toHaveBeenCalledTimes(1);
    expect(broken.release).not.toHaveBeenCalled();
    expect(connection.query).toHaveBeenCalledWith({ sql: "SELECT 1", timeout: 5_000 });
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  it("returns a service error within the readiness budget and allows a later request to recover", async () => {
    const { pool, database } = fixtures();
    pool.getConnection.mockImplementation(() => new Promise((_, reject) => setTimeout(() => reject(failure("ETIMEDOUT")), 20_000)));
    const { getDb } = await import("./connection");
    const outcomes = Promise.all([getDb().catch(error => error), getDb().catch(error => error)]);
    await vi.advanceTimersByTimeAsync(41_500);
    for (const error of await outcomes) expect(error).toMatchObject({ code: "SERVICE_UNAVAILABLE" });
    expect(pool.getConnection).toHaveBeenCalledTimes(2);
    expect(pool.end).toHaveBeenCalledTimes(1);
    const replacement = fixtures();
    expect(await getDb()).toEqual(database);
    expect(replacement.pool.getConnection).toHaveBeenCalledTimes(1);
    expect(mocks.createPool).toHaveBeenCalledTimes(2);
  });

  it("bounds two slow handshakes and SQL readiness timeouts to 51.5 seconds", async () => {
    const { pool, connection } = fixtures();
    pool.getConnection.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(connection), 20_000)));
    connection.query.mockImplementation(() => new Promise((_, reject) => setTimeout(() => reject(failure("PROTOCOL_SEQUENCE_TIMEOUT")), 5_000)));
    const { getDb } = await import("./connection");
    let complete = false;
    const outcome = getDb().catch(error => { complete = true; return error; });
    await vi.advanceTimersByTimeAsync(51_499);
    expect(complete).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await outcome).toMatchObject({ code: "SERVICE_UNAVAILABLE" });
    expect(connection.destroy).toHaveBeenCalledTimes(2);
    expect(pool.end).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["ER_ACCESS_DENIED_ERROR", "HANDSHAKE_SSL_ERROR", "CERT_HAS_EXPIRED"])("does not retry permanent error %s", async code => {
    const { pool } = fixtures();
    pool.getConnection.mockRejectedValue(failure(code));
    const { getDb } = await import("./connection");
    await expect(getDb()).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
    expect(pool.getConnection).toHaveBeenCalledTimes(1);
    expect(pool.end).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps unconfigured local development database-free", async () => {
    fixtures();
    mocks.env.databaseUrl = "";
    const { getDb } = await import("./connection");
    expect(await getDb()).toBeNull();
    expect(mocks.createPool).not.toHaveBeenCalled();
  });
});
