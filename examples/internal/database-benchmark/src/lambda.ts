import { sql } from "drizzle-orm";
import { pgDataApi } from "./drizzle/pg-data-api";
import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { planetscale } from "./drizzle/planetscale";

export async function handler(): Promise<APIGatewayProxyStructuredResultV2> {
  const results = {} as Record<string, number>;

  for (const connect of [pgDataApi, planetscale]) {
    const db = connect();
    // @ts-ignore
    await db.execute(sql`SELECT 1`);
    const time = Date.now();
    // @ts-ignore
    await db.execute(sql`SELECT 1`);
    const elapsed = Date.now() - time;
    results[connect.name] = elapsed;
  }

  return {
    statusCode: 200,
    body: JSON.stringify(results),
    headers: {
      "content-type": "application/json",
    },
  };
}
