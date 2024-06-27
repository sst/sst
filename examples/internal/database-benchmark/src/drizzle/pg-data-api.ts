import { Resource } from "sst";
import { drizzle } from "drizzle-orm/aws-data-api/pg";
import { RDSDataClient } from "@aws-sdk/client-rds-data";

export function pgDataApi() {
  const client = new RDSDataClient({});

  return drizzle(client, {
    database: Resource.Postgres.database,
    secretArn: Resource.Postgres.secretArn,
    resourceArn: Resource.Postgres.clusterArn,
  });
}
