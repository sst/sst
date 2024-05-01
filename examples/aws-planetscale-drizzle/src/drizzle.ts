import { drizzle } from "drizzle-orm/aws-data-api/pg";
import { RDSDataClient } from "@aws-sdk/client-rds-data";
import { Resource } from "sst";

const client = new RDSDataClient({});

export const db = drizzle(client, {
  secretArn: Resource.Postgres.secretArn,
  database: Resource.Postgres.database,
  resourceArn: Resource.Postgres.clusterArn,
});
