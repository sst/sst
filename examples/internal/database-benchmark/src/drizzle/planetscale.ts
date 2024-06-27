import { drizzle } from "drizzle-orm/planetscale-serverless";
import { Resource } from "sst";
import { Client } from "@planetscale/database";
export * from "drizzle-orm";

export function planetscale() {
  const client = new Client({
    host: Resource.Planetscale.host,
    username: Resource.Planetscale.username,
    password: Resource.Planetscale.password,
    fetch: (url, init) => {
      delete init["cache"];
      return fetch(url, init);
    },
  });
  return drizzle(client);
}
