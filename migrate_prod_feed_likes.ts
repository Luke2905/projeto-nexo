import { config } from "dotenv";
import { resolve } from "path";
// Force load production env
config({ path: resolve(process.cwd(), ".env.production"), override: true });

import { getDb } from "./server/db/connection";
import { sql } from "drizzle-orm";

async function run() {
  const db = await getDb();
  if (!db) {
    console.error("DB connection failed.");
    return;
  }
  
  console.log("Creating table nexo_feed_likes on PRODUCTION...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS nexo_feed_likes (
      userId INT NOT NULL,
      eventId VARCHAR(255) NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      PRIMARY KEY (userId, eventId)
    )
  `);
  console.log("nexo_feed_likes table created in production!");
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
