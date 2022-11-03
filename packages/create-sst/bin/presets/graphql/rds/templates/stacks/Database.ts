import { RDS, StackContext } from "@serverless-stack/resources";

export function Database({ stack }: StackContext) {
  const rds = new RDS(stack, "db", {
    engine: "postgresql11.13",
    defaultDatabaseName: "main",
    migrations: "services/migrations",
    types: "services/core/sql.generated.ts",
  });

  return rds;
}
