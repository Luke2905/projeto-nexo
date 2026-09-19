const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

async function syncChallenges() {
  console.log('Connecting to local DB...');
  const localConfig = dotenv.config({ path: path.resolve(process.cwd(), '.env') }).parsed;
  const localPool = mysql.createPool(localConfig.DATABASE_URL);
  
  console.log('Connecting to production DB...');
  const prodConfig = dotenv.config({ path: path.resolve(process.cwd(), '.env.production') }).parsed;
  const prodUrl = new URL(prodConfig.DATABASE_URL);
  const prodOptions = {
    uri: prodConfig.DATABASE_URL,
    connectTimeout: 20000,
    connectionLimit: 3,
  };
  if (prodUrl.hostname.toLowerCase().endsWith(".tidbcloud.com")) {
    prodOptions.ssl = { rejectUnauthorized: true, verifyIdentity: true };
  }
  const prodPool = mysql.createPool(prodOptions);
  
  try {
    const [rows] = await localPool.query("SELECT * FROM nexo_daily_challenges");
    console.log(`Found ${rows.length} challenges in local DB.`);
    
    if (rows.length === 0) {
      console.log('No challenges to sync.');
      return;
    }
    
    for (const row of rows) {
      await prodPool.query(
        "INSERT IGNORE INTO nexo_daily_challenges (`date`, `word`, `prompt`, `category`, `aliases_json`, `createdAt`) VALUES (?, ?, ?, ?, ?, ?)",
        [row.date, row.word, row.prompt, row.category, row.aliases_json, row.createdAt]
      );
    }
    console.log('Successfully copied challenges to production DB!');
  } finally {
    await localPool.end();
    await prodPool.end();
  }
}

syncChallenges().catch(console.error);
