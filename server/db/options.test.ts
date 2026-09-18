import { describe, expect, it } from "vitest";
import mysql from "mysql2/promise";
import { databasePoolOptions } from "./options";

const tidbUrl = "mysql://test:local@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/test";

describe("TiDB connection options", () => {
  it("enables verified TLS for a TiDB URI without SSL parameters", async () => {
    const options = databasePoolOptions(tidbUrl);
    expect(options.ssl).toEqual({ rejectUnauthorized: true, verifyIdentity: true });
    // Use the real driver's parser without opening any network connections.
    const pool = mysql.createPool(options);
    try {
      expect(pool.pool.config.connectionConfig.ssl).toMatchObject({ rejectUnauthorized: true, verifyIdentity: true });
      expect(pool.pool.config.connectionConfig.port).toBe(4000);
      expect(pool.pool.config.connectionConfig.connectTimeout).toBe(20_000);
    } finally {
      await pool.end();
    }
  });

  it("preserves a custom CA and enforces certificate verification", () => {
    const url = new URL(tidbUrl);
    url.searchParams.set("ssl", JSON.stringify({ ca: "custom-ca", rejectUnauthorized: false }));
    expect(databasePoolOptions(url.toString()).ssl).toEqual({
      ca: "custom-ca", rejectUnauthorized: true, verifyIdentity: true,
    });
  });

  it("keeps TLS enabled even when a TiDB URI contains ssl=false", () => {
    expect(databasePoolOptions(`${tidbUrl}?ssl=false`).ssl).toMatchObject({ rejectUnauthorized: true });
  });

  it.each(["localhost", "db.example.com", "tidbcloud.com.example.com"])("preserves existing connection behavior for %s", host => {
    expect(databasePoolOptions(`mysql://test:local@${host}:3306/test`).ssl).toBeUndefined();
  });

  it("rejects malformed TLS settings without leaking the URL", () => {
    expect(() => databasePoolOptions(`${tidbUrl}?ssl=invalid`)).toThrow("Invalid TLS configuration in DATABASE_URL");
  });

  it.each(["not-a-url", "https://test:private@localhost/test"])("rejects invalid connection URLs without revealing credentials", uri => {
    try {
      databasePoolOptions(uri);
      throw new Error("Expected validation failure");
    } catch (error) {
      expect(error).toMatchObject({ code: "INVALID_DATABASE_URL" });
      expect(String(error)).not.toContain(uri);
      expect(String(error)).not.toContain("private");
    }
  });
});
