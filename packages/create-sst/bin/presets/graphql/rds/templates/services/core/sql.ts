import RDSDataService from "aws-sdk/clients/rdsdataservice";
import { RDS } from "@serverless-stack/node/rds";
import { Kysely, Selectable } from "kysely";
import { DataApiDialect } from "kysely-data-api";
import type { Database } from "./sql.generated";

export const DB = new Kysely<Database>({
  dialect: new DataApiDialect({
    mode: "postgres",
    driver: {
      secretArn: RDS.db.secretArn,
      resourceArn: RDS.db.clusterArn,
      database: RDS.db.defaultDatabaseName,
      client: new RDSDataService(),
    },
  }),
});

export type Row = {
  [Key in keyof Database]: Selectable<Database[Key]>;
};

export * as SQL from "./sql";
