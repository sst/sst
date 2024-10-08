import pg from "pg";
import { Resource } from "sst";
const { Client } = pg;
const client = new Client({
  user: Resource.MyDatabase.username,
  password: Resource.MyDatabase.password,
  database: Resource.MyDatabase.database,
  host: Resource.MyDatabase.host,
  port: Resource.MyDatabase.port,
});
await client.connect();

export async function handler() {
  const res = await client.query("SELECT $1::text as message", [
    "Hello world!",
  ]);
  return {
    statusCode: 200,
    body: res.rows[0].message,
  };
}
