import { RDS, StackContext } from "@serverless-stack/resources";

export function Database({ stack }: StackContext) {
  const rds = new RDS(stack, "rds", {
    engine: "postgresql10.14",
    migrations: "api/migrations",
    types: "api/core/sql.generated.ts",
    defaultDatabaseName: "mysstapp",
  });

  return rds;
}
