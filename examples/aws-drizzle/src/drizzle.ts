import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { Resource } from "sst";
import * as schema from "./todo.sql";

const cfg = Resource.MyPostgres;
const pool = new Pool({
  host: cfg.host,
  port: cfg.port,
  user: cfg.username,
  password: cfg.password,
  database: cfg.database,
});

export const db = drizzle(pool, { schema });
