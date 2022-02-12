import path from "path";
import { Kysely, FileMigrationProvider, Migrator, NO_MIGRATIONS } from "kysely";
import { DataApiDialect } from "kysely-data-api";
import RDSDataService from "aws-sdk/clients/rdsdataservice";

export async function handler(evt) {
  const db = new Kysely({
    dialect: new DataApiDialect({
      mode: process.env.RDS_ENGINE_MODE,
      driver: {
        client: new RDSDataService(),
        database: evt?.database || process.env.RDS_DATABASE,
        secretArn: process.env.RDS_SECRET,
        resourceArn: process.env.RDS_ARN,
      },
    }),
  });

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider(
      path.resolve(process.env.RDS_MIGRATIONS_PATH)
    ),
  });

  if (!evt.type || evt.type === "latest") {
    const response = await migrator.migrateToLatest();
    return response;
  }

  if (evt.type === "to") {
    if (!evt.data.name) return await migrator.migrateTo(NO_MIGRATIONS);
    const result = await migrator.migrateTo(evt.data.name);
    const err =
      result.error || result.results?.find((r) => r.status === "Error");
    if (err) throw err;
    return result;
  }

  if (evt.type === "list") {
    return await migrator.getMigrations();
  }
}
