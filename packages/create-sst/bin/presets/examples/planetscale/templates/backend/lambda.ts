import { PSDB } from "planetscale-node";
// connect to main branch
const db = new PSDB("main");

export async function handler() {
  // increment tally by 1
  await db.query("UPDATE counter SET tally = tally + 1 WHERE counter = 'hits'");

  // get tally from counter table
  const [rows] = await db.query(
    "SELECT tally FROM counter WHERE counter = 'hits'"
  );

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/plain" },
    body: rows[0].tally,
  };
}
