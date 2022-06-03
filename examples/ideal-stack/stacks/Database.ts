import { RDS, StackContext } from "@serverless-stack/resources";

export function Database({ stack }: StackContext) {
  const rds = new RDS(stack, "rds", {
    engine: "postgresql10.14",
    migrations: "backend/migrations",
    types: "backend/core/sql.generated.ts",
    defaultDatabaseName: "mysstapp"
  });

  return rds;
}
