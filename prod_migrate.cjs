const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.production') });

function databasePoolOptions(databaseUrl) {
  let url = new URL(databaseUrl);
  const options = {
    uri: databaseUrl,
    connectTimeout: 20000,
    connectionLimit: 3,
  };
  const hostname = url.hostname.toLowerCase();
  if (hostname.endsWith(".tidbcloud.com")) {
    options.ssl = { rejectUnauthorized: true, verifyIdentity: true };
  }
  return options;
}

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Missing DATABASE_URL in .env.production');
  
  console.log('Connecting to production DB (TiDB)...');
  const pool = mysql.createPool(databasePoolOptions(url));
  
  try {
    console.log('1. Adding hintPenalty to game_sessions...');
    try {
      await pool.query("ALTER TABLE game_sessions ADD COLUMN hintPenalty INT NOT NULL DEFAULT 0;");
      console.log(' -> hintPenalty added');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log(' -> hintPenalty already exists');
      else throw e;
    }

    console.log('2. Creating nexo_daily_challenges...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`nexo_daily_challenges\` (
        \`date\` varchar(10) NOT NULL,
        \`word\` varchar(64) NOT NULL,
        \`prompt\` varchar(255) NOT NULL,
        \`category\` varchar(64) NOT NULL,
        \`aliases_json\` text NOT NULL,
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        CONSTRAINT \`nexo_daily_challenges_date\` PRIMARY KEY(\`date\`)
      );
    `);
    console.log(' -> Table created');
    
    console.log('All migrations applied successfully to production!');
  } finally {
    await pool.end();
  }
}

run().catch(console.error);
