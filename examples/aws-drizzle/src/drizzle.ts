import { Resource } from "sst";
import { drizzle } from "drizzle-orm/aws-data-api/pg";
import { RDSDataClient } from "@aws-sdk/client-rds-data";
import * as schema from "./todo.sql";

const client = new RDSDataClient({});

export const db = drizzle(client, {
  schema,
  database: Resource.MyPostgres.database,
  secretArn: Resource.MyPostgres.secretArn,
  resourceArn: Resource.MyPostgres.clusterArn,
});
