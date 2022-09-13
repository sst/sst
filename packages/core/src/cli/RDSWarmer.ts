import { Bus } from "./Bus.js";
import { Config } from "../config/index.js";

import RDSDataService from "aws-sdk/clients/rdsdataservice.js";
import { Logger } from "./Logger.js";

interface Opts {
  bus: Bus;
  config: Config;
}

export function createRDSWarmer(opts: Opts) {
  let interval: NodeJS.Timer;
  opts.bus.subscribe("stacks.deployed", (evt) => {
    if (interval) clearInterval(interval);
    interval = setInterval(() => {
      evt.properties.metadata
        .filter((c) => c.type === "RDS")
        .map((c) => {
          const client = new RDSDataService({
            region: opts.config.region,
          });
          Logger.print("debug", `RDSWarmer: warming ${c.id}`);

          try {
            client
              .executeStatement({
                sql: "SELECT 1",
                secretArn: c.data.secretArn,
                resourceArn: c.data.clusterArn,
                database: c.data.defaultDatabaseName,
              })
              .promise();
          } catch (e) {
            // Ignore error
            // If the cluster is not warm, this will throw:
            //   BadRequestException: Communication link failure
          }
        });
    }, 1000 * 60);
  });
}
