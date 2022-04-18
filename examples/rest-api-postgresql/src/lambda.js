import client from "data-api-client";

const db = client({
  database: process.env.DATABASE,
  secretArn: process.env.SECRET_ARN,
  resourceArn: process.env.CLUSTER_ARN,
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
