import { sql } from "drizzle-orm";
import { planetscale } from "./drizzle/planetscale";

export default {
  async fetch(event: any) {
    const results = {} as Record<string, number>;

    for (const connect of [planetscale]) {
      const db = connect();
      // @ts-ignore
      await db.execute(sql`SELECT 1`);
      const time = Date.now();
      // @ts-ignore
      await db.execute(sql`SELECT 1`);
      const elapsed = Date.now() - time;
      results[connect.name] = elapsed;
    }

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    });
  },
};
