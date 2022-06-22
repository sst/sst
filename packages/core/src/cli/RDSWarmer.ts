import { Bus } from "./Bus.js";
import { Config } from "../config/index.js";

import RDSDataService from "aws-sdk/clients/rdsdataservice.js";
import { Logger } from "./Logger.js";

interface Opts {
  bus: Bus;
  config: Config;
}

export function createRDSWarmer(opts: Opts) {
  opts.bus.subscribe("stacks.deployed", (evt) => {
    evt.properties.metadata
      .filter((c) => c.type === "RDS")
      .map((c) => {
        const client = new RDSDataService({
          region: opts.config.region,
        });
        Logger.print("debug", `RDSWarmer: warming ${c.id}`);

        client
          .executeStatement({
            sql: "SELECT 1",
            secretArn: c.data.secretArn,
            resourceArn: c.data.clusterArn,
            database: c.data.defaultDatabaseName,
          })
          .promise();
      });
  });
}
