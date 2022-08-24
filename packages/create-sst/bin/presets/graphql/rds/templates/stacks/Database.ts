import { Config, RDS, StackContext } from "@serverless-stack/resources";

export function Database({ stack }: StackContext) {
  const rds = new RDS(stack, "rds", {
    engine: "postgresql10.14",
    migrations: "services/migrations",
    types: "services/core/sql.generated.ts",
    defaultDatabaseName: "main",
  });

  return {
    rds,
    parameters: [
      new Config.Parameter(stack, "RDS_SECRET_ARN", {
        value: rds.secretArn,
      }),
      new Config.Parameter(stack, "RDS_DATABASE", {
        value: rds.defaultDatabaseName,
      }),
      new Config.Parameter(stack, "RDS_ARN", {
        value: rds.clusterArn,
      }),
    ],
  };
}
