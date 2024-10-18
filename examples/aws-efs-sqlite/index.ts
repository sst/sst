import sqlite3 from "better-sqlite3";
const db = sqlite3("/mnt/efs/mydb.sqlite");

export const handler = async () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL
    );
  `);

  // Record a visit
  db.prepare("INSERT INTO visits (timestamp) VALUES (CURRENT_TIMESTAMP)").run();

  // Get recent visits
  const visits = db
    .prepare("SELECT * FROM visits ORDER BY timestamp DESC LIMIT 10")
    .all();

  return {
    statusCode: 200,
    body: JSON.stringify({ "10 Most recent visits": visits }, null, 2),
  };
};
