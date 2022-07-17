import { RDS, StackContext } from "@serverless-stack/resources";

export function Database({ stack }: StackContext) {
  const databaseName: string = process.env.DATABASE_NAME || "rds";

  const rds = new RDS(stack, databaseName, {
    engine: "postgresql10.14",
    migrations: "services/migrations",
    types: "services/core/sql.generated.ts",
    defaultDatabaseName: "main",
  });

  return rds;
}
