import { Bus } from "./Bus.js";
import { Config } from "../config/index.js";
import { toTypeScript, toObject } from "@rmp135/sql-ts";
import fs from "fs/promises";
import knex from "knex";
/* @ts-ignore */
import knexDataAPiClient from "knex-aurora-data-api-client";

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

  opts.bus.subscribe("metadata.updated", metadata => {
    databases = metadata.properties
      .filter(c => c.type === "RDS")
      .map(c => ({
        migratorID: metadata.properties.find(
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

    // Trigger typegen
    /*
      *   "clusterArn": "arn:aws:rds:us-east-1:280826753141:cluster:thdxr2-my-sst-app-rds",
                "defaultDatabaseName": "mysstapp",
                "engine": "postgresql10.14",
                "secretArn": "arn:aws:secretsmanager:us-east-1:280826753141:secret:rdsClusterSecret694AB211-ZOby5iWPpyac-c6vwdV",
                "migrator": {
                    "node": "c84162f63d6ed8a85a6e0614421d03c5f5f3718a47",
                    "stack": "thdxr2-my-sst-app-Database"
                },
                "clusterIdentifier": "thdxr2-my-sst-app-rds"
      */
    const k = knex({
      client: knexDataAPiClient.postgres,
      connection: {
        secretArn: db.secretArn,
        resourceArn: db.clusterArn,
        database: db.defaultDatabaseName,
        region: opts.config.region
      } as any
    });

    console.log(
      JSON.stringify(
        await toObject(
          {
            interfaceNameFormat: "${table}"
          },
          k as any
        ),
        null,
        4
      )
    );
    const result = await toTypeScript(
      {
        interfaceNameFormat: "${table}"
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
