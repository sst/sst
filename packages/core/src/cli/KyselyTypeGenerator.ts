import { Bus } from "./Bus.js";
import { Config } from "../config/index.js";
import { Kysely } from "kysely";
import { DataApiDialect } from "kysely-data-api";
import RDSDataService from "aws-sdk/clients/rdsdataservice.js";
import { CodegenSerializer } from "kysely-codegen/dist/serializer.js";
import { CodegenFormat } from "kysely-codegen/dist/enums/format.js";
import * as fs from "fs/promises";
import { CodegenDialect } from "kysely-codegen/dist/dialect.js";

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
    const serializr = new CodegenSerializer({
      dialect: new CodegenPostgresDialect(),
      format: CodegenFormat.INTERFACE,
      tables
    });
    const data = serializr.serialize();
    await fs.writeFile(db.types!, data);
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
    databases.map(db => generate(db))
  });

  opts.bus.subscribe("function.responded", async evt => {
    if (evt.properties.request.event.type !== "to") return;
    const db = databases.find(db => db.migratorID === evt.properties.localID);
    if (!db) return;
    generate(db)
  });
}

export class CodegenPostgresDialect extends CodegenDialect {
  override readonly defaultType = 'string';
  readonly definitions = {
    Circle: {
      radius: 'number',
      x: 'number',
      y: 'number',
    },
  };
  override readonly imports = {
    IPostgresInterval: 'postgres-interval',
  };
  override readonly schema = 'public';
  override readonly types = {
    bool: 'boolean',
    bytea: 'Buffer',
    circle: 'Circle',
    float4: 'number',
    float8: 'number',
    int2: 'number',
    int4: 'number',
    int8: 'number',
    interval: 'IPostgresInterval',
    json: 'unknown',
    jsonb: 'unknown',
    numeric: 'number',
    oid: 'number',
    text: 'string',
    timestamp: 'number | string | Date',
    timestamptz: 'number | string | Date',
  };

  instantiate(options: { connectionString: string; ssl: boolean }) {
    return null as any
  }
}
