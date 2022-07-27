import { RDS, StackContext } from "@serverless-stack/resources";

export function Database({ stack }: StackContext) {
  const rds = new RDS(stack, "rds", {
    engine: "postgresql10.14",
    migrations: "services/migrations",
    types: "services/core/sql.generated.ts",
    defaultDatabaseName: "main",
  });

  return rds;
}
