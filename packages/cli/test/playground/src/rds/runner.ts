import path from "path";
import { Kysely, FileMigrationProvider, Migrator } from "kysely";
import { DataApiDialect } from "kysely-data-api";
import RDSDataService from "aws-sdk/clients/rdsdataservice";

type TodoRow = {
  id: string;
  title: string;
  author_id: string;
};

type Database = {
  todos: TodoRow;
};

export async function main() {
  const db = new Kysely<Database>({
    dialect: new DataApiDialect({
      mode: "postgres",
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