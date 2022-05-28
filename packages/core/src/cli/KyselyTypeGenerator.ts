import { Bus } from "./Bus";
import {} from "@rmp135/sql-ts";
import knex from "knex";
/* @ts-ignore */
import knexDataAPiClient from "knex-aurora-data-api-client";

interface Opts {
  bus: Bus;
}

interface Database {
  migratorID: string;
}
export function createKyselyTypeGenerator(opts: Opts) {
  let databases: Database[] = [];

  opts.bus.subscribe("metadata.updated", (metadata) => {
    console.log(JSON.stringify(metadata, null, 4));
    databases = metadata.properties
      .filter((c) => c.type === "RDS")
      .map((c) => ({
        migratorID: metadata.properties.find(
          (fn) => fn.addr == c.data.migrator?.node
        ).data.localID,
      }));
  });

  opts.bus.subscribe("function.responded", (evt) => {
    const func = databases.find(
      (db) => db.migratorID === evt.properties.localID
    );
    if (!func) return;
    if (evt.properties.request.event.type !== "to") return;

    // Trigger typegen
  });
}
