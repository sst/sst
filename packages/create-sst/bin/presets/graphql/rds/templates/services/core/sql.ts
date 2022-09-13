import RDSDataService from "aws-sdk/clients/rdsdataservice";
import { Config } from "@serverless-stack/node/config";
import { Kysely, Selectable } from "kysely";
import { DataApiDialect } from "kysely-data-api";
import type { Database } from "./sql.generated";

export const DB = new Kysely<Database>({
  dialect: new DataApiDialect({
    mode: "postgres",
    driver: {
      secretArn: Config.RDS_SECRET_ARN,
      resourceArn: Config.RDS_ARN,
      database: Config.RDS_DATABASE,
      client: new RDSDataService(),
    },
  }),
});

export type Row = {
  [Key in keyof Database]: Selectable<Database[Key]>;
};

export * as SQL from "./sql";
