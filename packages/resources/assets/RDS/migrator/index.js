"use strict";

import path from "path";
import { Kysely, Migrator, NO_MIGRATIONS } from "kysely";
import { DataApiDialect } from "kysely-data-api";
import RDSDataService from "aws-sdk/clients/rdsdataservice";
import url from "url";

export async function handler(evt) {
  const db = new Kysely({
    dialect: new DataApiDialect({
      mode: process.env.RDS_ENGINE_MODE,
      driver: {
        client: new RDSDataService(),
        database: evt?.database || process.env.RDS_DATABASE,
        secretArn: process.env.RDS_SECRET,
        resourceArn: process.env.RDS_ARN
      }
    })
  });

  const migrator = new Migrator({
    db,
    provider: new DynamicFileMigrationProvider(
      path.resolve(process.env.RDS_MIGRATIONS_PATH)
    )
    /*
    provider: process.env.LAMBDA_TASK_ROOT
      ? new FileMigrationProvider(path.resolve(process.env.RDS_MIGRATIONS_PATH))
      : new DynamicFileMigrationProvider(
          path.resolve(process.env.RDS_MIGRATIONS_PATH)
        ),
    */
  });

  if (!evt.type || evt.type === "latest") {
    const result = await migrator.migrateToLatest();
    const err = result.error || result.results?.find(r => r.status === "Error");
    if (err) throw err;
    return result;
  }

  if (evt.type === "to") {
    if (!evt.data.name) return await migrator.migrateTo(NO_MIGRATIONS);
    const result = await migrator.migrateTo(evt.data.name);
    const err = result.error || result.results?.find(r => r.status === "Error");
    if (err) throw err;
    return result;
  }

  if (evt.type === "list") {
    return await migrator.getMigrations();
  }
}

class DynamicFileMigrationProvider {
  #migrationFolderPath;

  constructor(migrationFolderPath) {
    this.#migrationFolderPath = migrationFolderPath;
  }

  async getMigrations() {
    // Import these dynamically so that we don't have any top level
    // node dependencies.
    const fs = await import("fs/promises");
    const path = await import("path");

    const migrations = {};
    const files = await fs.readdir(this.#migrationFolderPath);

    for (const fileName of files) {
      if (
        fileName.endsWith(".js") ||
        fileName.endsWith(".cjs") ||
        fileName.endsWith(".mjs")
      ) {
        const [name] = path.basename(fileName).split(".");
        const fullPath = path.join(this.#migrationFolderPath, fileName);
        if (process.env.LAMBDA_TASK_ROOT) {
          const migration = await import(fullPath);
          migrations[name] = migration;
          continue;
        }
        const copy = fullPath + Date.now().toString() + ".js";
        try {
          await fs.copyFile(fullPath, copy);
          const migration = await import(url.pathToFileURL(copy).href);
          migrations[name] = migration;
        } catch (ex) {
          console.error(ex);
        }
        await fs.rm(copy);
      }
    }

    return migrations;
  }
}
