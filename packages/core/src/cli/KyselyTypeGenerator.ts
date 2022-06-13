import { Bus } from "./Bus.js";
import { Config } from "../config/index.js";
import { toTypeScript, toObject } from "@rmp135/sql-ts";
import fs from "fs/promises";
import knex from "knex";
/* @ts-ignore */
import knexDataApiClient from "knex-aurora-data-api-client";

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

  opts.bus.subscribe("stacks.deployed", (evt) => {
    databases = evt.properties.metadata
      .filter((c) => c.type === "RDS")
      .filter((c) => c.data.migrator)
      .filter((c) => c.data.types)
      .map((c) => ({
        migratorID: evt.properties.metadata.find(
          (fn) => fn.addr == c.data.migrator?.node
        ).data.localId,
        clusterArn: c.data.clusterArn,
        types: c.data.types,
        engine: c.data.engine,
        defaultDatabaseName: c.data.defaultDatabaseName,
        secretArn: c.data.secretArn,
      }));
  });

  opts.bus.subscribe("function.responded", async (evt) => {
    const db = databases.find((db) => db.migratorID === evt.properties.localID);
    if (!db) return;
    if (!db.types) return;
    if (evt.properties.request.event.type !== "to") return;

    const k = knex({
      client: db.engine.includes("mysql")
        ? knexDataApiClient.mysql
        : knexDataApiClient.postgres,
      connection: {
        secretArn: db.secretArn,
        resourceArn: db.clusterArn,
        database: db.defaultDatabaseName,
        region: opts.config.region,
      } as any,
    });

    const result = await toTypeScript(
      {
        interfaceNameFormat: "${table}",
      },
      k as any
    );
    const lines = [result, "export interface Database {"];
    for (const match of result.matchAll(/export interface ([^\s]+)\s/g)) {
      lines.push(`  "${match[1]}": ${match[1]}`);
    }
    lines.push("}");
    fs.writeFile(db.types, lines.join("\n"));
  });
}
