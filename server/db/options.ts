import type { PoolOptions, SslOptions } from "mysql2/promise";

/** Keep credentials in the URI and enable verified TLS for TiDB Cloud. */
export function databasePoolOptions(databaseUrl: string): PoolOptions {
  let url: URL;
  try {
    url = new URL(databaseUrl);
    if (url.protocol !== "mysql:" || !url.hostname) throw new Error();
  } catch {
    // Never include the connection URL (and its credentials) in an error.
    throw Object.assign(new Error("DATABASE_URL must be a valid mysql:// URL"), {
      code: "INVALID_DATABASE_URL",
    });
  }

  const options: PoolOptions = {
    uri: databaseUrl,
    connectTimeout: 20_000,
    connectionLimit: 3,
    maxIdle: 1,
    idleTimeout: 60_000,
    waitForConnections: true,
    queueLimit: 10,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  };
  const hostname = url.hostname.toLowerCase();
  if (hostname.endsWith(".tidbcloud.com")) {
    let configuredSsl: SslOptions = {};
    const rawSsl = url.searchParams.get("ssl");
    if (rawSsl) {
      try {
        const value: unknown = JSON.parse(rawSsl);
        if (value && typeof value === "object" && !Array.isArray(value)) {
          configuredSsl = value as SslOptions;
        } else if (typeof value !== "boolean") {
          throw new Error();
        }
      } catch {
        throw Object.assign(new Error("Invalid TLS configuration in DATABASE_URL"), {
          code: "INVALID_DATABASE_TLS",
        });
      }
    }
    options.ssl = {
      ...configuredSsl,
      rejectUnauthorized: true,
      verifyIdentity: true,
    };
  }
  return options;
}
