import { Bus } from "./Bus.js";
import { Config } from "../config/index.js";
import { Kysely } from "kysely";
import { DataApiDialect } from "kysely-data-api";
import RDSDataService from "aws-sdk/clients/rdsdataservice.js";
import * as fs from "fs/promises";
import {
  ExportStatementNode,
  PostgresDialect,
  Serializer,
  Transformer
} from "kysely-codegen";

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
  types?: {
    path: string;
    camelCase?: boolean;
  };
}

export function createKyselyTypeGenerator(opts: Opts) {
  let databases: Database[] = [];

  async function generate(db: Database) {
    if (!db.types) return;

    const k = new Kysely<Database>({
      dialect: new DataApiDialect({
        mode: db.engine.includes("postgres") ? "postgres" : "mysql",
        driver: {
          secretArn: db.secretArn,
          resourceArn: db.clusterArn,
          database: db.defaultDatabaseName,
          client: new RDSDataService({
            region: opts.config.region
          })
        }
      })
    });
    const tables = await k.introspection.getTables();
    const transformer = new Transformer(
      new PostgresDialect(),
      // @ts-expect-error Issue with metadata turning everything into strings
      db.types.camelCase === "true"
    );
    const nodes = transformer.transform(tables);
    const lastIndex = nodes.length - 1;
    const last = nodes[lastIndex] as ExportStatementNode;
    nodes[lastIndex] = {
      ...last,
      argument: {
        ...last.argument,
        name: "Database"
      }
    };
    const serializer = new Serializer();
    const data = serializer.serialize(nodes);
    await fs.writeFile(db.types.path, data);
  }

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
    databases.map(db => generate(db));
  });

  opts.bus.subscribe("function.responded", async evt => {
    if (evt.properties.request.event.type !== "to") return;
    const db = databases.find(db => db.migratorID === evt.properties.localID);
    if (!db) return;
    generate(db);
  });
}
