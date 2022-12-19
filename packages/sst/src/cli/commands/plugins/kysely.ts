import { Kysely } from "kysely";
import { DataApiDialect } from "kysely-data-api";
import RDSDataService from "aws-sdk/clients/rdsdataservice.js";
import * as fs from "fs/promises";
import {
  ColumnMetadata,
  DatabaseMetadata,
  EnumCollection,
  ExportStatementNode,
  PostgresDialect,
  Serializer,
  Transformer,
} from "kysely-codegen";
import { Context } from "../../../context/context.js";
import { useBus } from "../../../bus.js";
import { useProject } from "../../../app.js";
import { FunctionMetadata, RDSMetadata } from "../../../constructs/Metadata.js";
import { PostgresIntrospector } from "kysely-codegen/dist/dialects/postgres/postgres-introspector.js";

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

export const useKyselyTypeGenerator = Context.memo(async () => {
  let databases: Database[] = [];
  const bus = useBus();
  const project = useProject();

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
            region: project.region,
          }),
        },
      }),
    });
    const tables = await k.introspection.getTables();
    const metadata = db.engine.includes("postgres")
      ? tables.map((table) => ({
          ...table,
          columns: table.columns.map((column): ColumnMetadata => {
            const isArray = column.dataType.startsWith("_");
            return {
              ...column,
              dataType: isArray ? column.dataType.slice(1) : column.dataType,
              enumValues: null,
              isArray,
            };
          }),
        }))
      : tables.map((table) => ({
          ...table,
          columns: table.columns.map((column) => ({
            ...column,
            enumValues: null,
          })),
        }));

    const transformer = new Transformer();
    const nodes = transformer.transform({
      dialect: new PostgresDialect(),
      camelCase: (db.types.camelCase as any) === "true",
      metadata: new DatabaseMetadata(metadata, new EnumCollection()),
    });
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
    databases = Object.values(evt.properties)
      .flat()
      .filter((c): c is RDSMetadata => c.type === "RDS")
      .filter((c) => c.data.migrator)
      .filter((c) => c.data.types)
      .map((c) => ({
        migratorID: evt.properties.metadata.find(
          (fn): fn is FunctionMetadata => fn.addr == c.data.migrator?.node
        )!.addr,
        clusterArn: c.data.clusterArn,
        types: c.data.types,
        engine: c.data.engine,
        defaultDatabaseName: c.data.defaultDatabaseName,
        secretArn: c.data.secretArn,
      }));
    databases.map((db) => generate(db));
  });

  bus.subscribe("function.success", async (evt) => {
    const db = databases.find(
      (db) => db.migratorID === evt.properties.functionID
    );
    if (!db) return;
    generate(db);
  });
});
