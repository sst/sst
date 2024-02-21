import { RDSDataClient } from "@aws-sdk/client-rds-data";
import { drizzle } from "drizzle-orm/aws-data-api/pg";
import { RDS } from "sst/node/rds";
import * as schema from "./schema";

export const db = drizzle(new RDSDataClient(), {
  database: RDS.db.defaultDatabaseName,
  secretArn: RDS.db.secretArn,
  resourceArn: RDS.db.clusterArn,
  schema,
});
