// https://docs.sst.dev/constructs/RDS

import { RDS, RDSProps, StackContext } from "sst/constructs";

export function Database({ stack, app }: StackContext) {

  const prodConfig: RDSProps["scaling"] = {
    autoPause: false,
    minCapacity: "ACU_8",
    maxCapacity: "ACU_64",
  };
  const devConfig: RDSProps["scaling"] = {
    autoPause: true,
    minCapacity: "ACU_2",
    maxCapacity: "ACU_2",
  };

  const rds = new RDS(stack, "db", {
    engine: "postgresql11.13",
    defaultDatabaseName: "main",
    migrations: "packages/core/migrations",
    types: "packages/core/src/sql.generated.ts",
    scaling: app.stage === "prod" ? prodConfig : devConfig,
  });

  return rds;
}
