import { Bus } from "./Bus.js";
import { Config } from "../config/index.js";
import { Kysely } from "kysely";
import { DataApiDialect } from "kysely-data-api";
import { RDSDataService } from "aws-sdk";
import { CodegenDialectManager } from "kysely-codegen/dist/dialect-manager";
import { CodegenSerializer } from "kysely-codegen/dist/serializer";
import { CodegenFormat } from "kysely-codegen/dist/enums/format";
import * as fs from "fs/promises";

interface Opts {
  bus: Bus;
  config: Config;
}

interface Database {
  migratorID: string;
  defaultDatabaseName: string;
  engine: string;
  secretArn: string;
  clusterArn: string;
  types?: string;
}
export function createKyselyTypeGenerator(opts: Opts) {
  let databases: Database[] = [];

  opts.bus.subscribe("stacks.deployed", evt => {
    databases = evt.properties.metadata
      .filter(c => c.type === "RDS")
      .filter(c => c.data.migrator)
      .filter(c => c.data.types)
      .map(c => ({
        migratorID: evt.properties.metadata.find(
          fn => fn.addr == c.data.migrator?.node
        ).data.localId,
        clusterArn: c.data.clusterArn,
        types: c.data.types,
        engine: c.data.engine,
        defaultDatabaseName: c.data.defaultDatabaseName,
        secretArn: c.data.secretArn
      }));
  });

  opts.bus.subscribe("function.responded", async evt => {
    const db = databases.find(db => db.migratorID === evt.properties.localID);
    if (!db) return;
    if (!db.types) return;
    if (evt.properties.request.event.type !== "to") return;

    const k = new Kysely<Database>({
      dialect: new DataApiDialect({
        mode: db.engine as any,
        driver: {
          secretArn: process.env.RDS_SECRET_ARN!,
          resourceArn: process.env.RDS_ARN!,
          database: process.env.RDS_DATABASE!,
          client: new RDSDataService({
            region: opts.config.region
          })
        }
      })
    });
    const tables = await k.introspection.getTables();
    const serializr = new CodegenSerializer({
      dialect: new CodegenDialectManager().getDialect(db.engine as any),
      format: CodegenFormat.INTERFACE,
      tables
    });
    const data = serializr.serialize();
    await fs.writeFile(db.types!, data);
  });
}
