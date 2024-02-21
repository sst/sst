import { migrate as mig } from "drizzle-orm/aws-data-api/pg/migrator";
import { db } from "./db";

export async function migrate(migrationsPath: string) {
  return mig(db, { migrationsFolder: migrationsPath });
}

await migrate("migrations");
