import path from "path";
import { Kysely, FileMigrationProvider, Migrator } from "kysely";
import { DataApiDialect } from "kysely-data-api";
import RDSDataService from "aws-sdk/clients/rdsdataservice";

export async function handler() {
  const db = new Kysely({
    dialect: new DataApiDialect({
      mode: process.env.RDS_ENGINE_MODE,
      driver: {
        client: new RDSDataService(),
        database: process.env.RDS_DATABASE,
        secretArn: process.env.RDS_SECRET,
        resourceArn: process.env.RDS_ARN,
      },
    }),
  });

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider(path.resolve(process.env.RDS_MIGRATIONS_PATH)),
  });

  const response = await migrator.migrateToLatest();
  if (response.error) throw response.error;
  return response.results;
}
