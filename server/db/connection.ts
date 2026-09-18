/** Database readiness is shared by concurrent requests in each function instance. */
import { TRPCError } from "@trpc/server";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql, { type PoolConnection } from "mysql2/promise";
import { ENV } from "../_core/env";

// Two attempts take at most about 52 seconds, leaving time within Vercel's 60s.
const CONNECT_TIMEOUT_MS = 20_000;
const READY_QUERY_TIMEOUT_MS = 5_000;
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1_500;
const TRANSIENT_CODES = new Set([
  "ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "EPIPE", "EAI_AGAIN",
  "PROTOCOL_CONNECTION_LOST", "PROTOCOL_SEQUENCE_TIMEOUT",
  "ER_CON_COUNT_ERROR", "ER_SERVER_SHUTDOWN",
]);

let database: MySql2Database | null = null;
let initialization: Promise<MySql2Database> | null = null;

function errorCode(error: unknown): string {
  return typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : "UNKNOWN";
}

async function initializeDatabase(): Promise<MySql2Database> {
  const pool = mysql.createPool({
    uri: ENV.databaseUrl,
    connectTimeout: CONNECT_TIMEOUT_MS,
    connectionLimit: 3,
    maxIdle: 1,
    idleTimeout: 60_000,
    waitForConnections: true,
    queueLimit: 10,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });

  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let connection: PoolConnection | undefined;
      try {
        connection = await pool.getConnection();
        // A completed handshake alone does not mean the database can serve SQL.
        await connection.query({ sql: "SELECT 1", timeout: READY_QUERY_TIMEOUT_MS });
        connection.release();
        database = drizzle(pool);
        return database;
      } catch (error) {
        // Discard a broken/timed-out connection instead of returning it to the pool.
        connection?.destroy();
        const code = errorCode(error);
        console.warn(`[Database] Readiness attempt ${attempt}/${MAX_ATTEMPTS} failed (${code}).`);
        if (!TRANSIENT_CODES.has(code) || attempt === MAX_ATTEMPTS) throw error;
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
    throw new Error("Database readiness attempts exhausted");
  } catch (error) {
    await pool.end().catch(() => undefined);
    // Throw instead of returning null: an outage must not look like a missing user.
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "Não foi possível conectar ao banco agora. Aguarde alguns instantes e tente novamente.",
      cause: new Error(`Database connection failed (${errorCode(error)})`),
    });
  }
}

export async function getDb(): Promise<MySql2Database | null> {
  if (database) return database;
  if (initialization) return initialization;
  if (!ENV.databaseUrl) {
    console.warn("[Database] DATABASE_URL is not configured.");
    return null;
  }

  initialization = initializeDatabase();
  try {
    return await initialization;
  } finally {
    // A later request can try again after a failed initialization.
    initialization = null;
  }
}
