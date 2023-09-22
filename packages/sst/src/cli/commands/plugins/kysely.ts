import { Kysely } from "kysely";
import { DataApiDialect } from "kysely-data-api";
import { RDSData } from "@aws-sdk/client-rds-data";
import * as fs from "fs/promises";
import {
  ExportStatementNode,
  PostgresDialect,
  MysqlDialect,
  Serializer,
  Transformer,
} from "kysely-codegen";
import { Context } from "../../../context/context.js";
import { useBus } from "../../../bus.js";
import { FunctionMetadata, RDSMetadata } from "../../../constructs/Metadata.js";
import { Logger } from "../../../logger.js";
import { useAWSClient } from "../../../credentials.js";
import { lazy } from "../../../util/lazy.js";

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

export const useKyselyTypeGenerator = lazy(async () => {
  let databases: Database[] = [];
  const bus = useBus();
  const logger = Logger.debug.bind(null, "[kysely-codegen]");

  async function generate(db: Database) {
    if (!db.types) return;
    logger("generating types for", db.migratorID);

    const dataApi = new DataApiDialect({
      mode: db.engine.includes("postgres") ? "postgres" : "mysql",
      driver: {
        secretArn: db.secretArn,
        resourceArn: db.clusterArn,
        database: db.defaultDatabaseName,
        client: useAWSClient(RDSData),
      },
    });

    const k = new Kysely<any>({
      dialect: dataApi,
    });

    const dialect = db.engine.includes("postgres")
      ? new PostgresDialect()
      : new MysqlDialect();
    const instrospection = await dialect.introspector.introspect({
      // @ts-ignore
      db: k,
    });
    logger("introspected tables");

    const transformer = new Transformer();
    const nodes = transformer.transform({
      dialect: dialect,
      camelCase: (db.types.camelCase as any) === true,
      metadata: instrospection,
    });
    logger("transformed nodes", nodes.length);
    const lastIndex = nodes.length - 1;
    const last = nodes[lastIndex] as ExportStatementNode;
    nodes[lastIndex] = {
      ...last,
      argument: {
        ...last.argument,
        name: "Database",
      },
    };
    const serializer = new Serializer();
    const data = serializer.serialize(nodes);
    await fs.writeFile(db.types.path, data);
  }

  bus.subscribe("stacks.metadata", (evt) => {
    const constructs = Object.values(evt.properties).flat();

    databases = constructs
      .filter((c): c is RDSMetadata => c.type === "RDS")
      .filter((c) => c.data.migrator)
      .filter((c) => c.data.types)
      .map((c) => ({
        migratorID: constructs.find(
          (fn): fn is FunctionMetadata => fn.addr == c.data.migrator?.node
        )!.addr,
        clusterArn: c.data.clusterArn,
        types: c.data.types,
        engine: c.data.engine,
        defaultDatabaseName: c.data.defaultDatabaseName,
        secretArn: c.data.secretArn,
      }));
    databases.map((db) =>
      generate(db).catch((err) => {
        logger(err);
      })
    );
  });

  bus.subscribe("function.success", async (evt) => {
    if (!evt.properties.body?.results) return;
    const db = databases.find(
      (db) => db.migratorID === evt.properties.functionID
    );
    if (!db) return;
    generate(db).catch((err) => {
      logger(err);
    });
  });
  logger("Loaded kyseley type generator");
});
