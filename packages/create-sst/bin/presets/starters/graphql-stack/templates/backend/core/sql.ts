import { RDSDataService } from "aws-sdk";
import { Kysely } from "kysely";
import { DataApiDialect } from "kysely-data-api";

export interface Database {}

export const DB = new Kysely<Database>({
  dialect: new DataApiDialect({
    mode: "postgres",
    driver: {
      secretArn: process.env.RDS_SECRET_ARN!,
      resourceArn: process.env.RDS_ARN!,
      database: process.env.RDS_DATABASE!,
      client: new RDSDataService(),
    },
  }),
});

export * as SQL from "./sql";
