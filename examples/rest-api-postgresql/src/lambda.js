import client from "data-api-client";

const db = client({
  database: process.env.dbName,
  secretArn: process.env.secretArn,
  resourceArn: process.env.clusterArn,
});

export async function handler() {
  const { records } = await db.query(
    "SELECT tally FROM tblCounter where counter='hits'"
  );

  let count = records[0].tally;

  await db.query(`UPDATE tblCounter set tally=${++count} where counter='hits'`);

  return {
    statusCode: 200,
    body: count,
  };
}
