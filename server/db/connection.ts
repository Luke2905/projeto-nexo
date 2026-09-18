/**
 * @file connection.ts
 * @description Manages the database connection using Drizzle ORM with mysql2.
 */

import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { ENV } from "../_core/env";

let _db: MySql2Database | null = null;

/**
 * Gets the database connection instance.
 * Initializes and tests the connection on first call.
 *
 * @returns {Promise<ReturnType<typeof drizzle> | null>} The Drizzle ORM instance or null if unavailable.
 */
export async function getDb() {
  if (_db) return _db;

  if (!ENV.databaseUrl) {
    console.warn("[Database] DATABASE_URL is not configured.");
    return null;
  }

  try {
    const pool = mysql.createPool(ENV.databaseUrl);

    // Test the connection immediately so we fail fast with a clear message
    const conn = await pool.getConnection();
    conn.release();
    console.log("[Database] Connection established successfully.");

    _db = drizzle(pool);
  } catch (error) {
    console.error("[Database] Failed to connect:", error);
    _db = null;
  }

  return _db;
}
