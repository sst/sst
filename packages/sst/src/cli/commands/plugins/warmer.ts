import { useBus } from "../../../bus.js";
import { RDSMetadata } from "../../../constructs/Metadata.js";
import { Context } from "../../../context/context.js";
import {
  RDSDataClient,
  ExecuteStatementCommand,
} from "@aws-sdk/client-rds-data";
import { useAWSClient } from "../../../credentials.js";
import { lazy } from "../../../util/lazy.js";

export const useRDSWarmer = lazy(async () => {
  let interval: NodeJS.Timer;
  const bus = useBus();
  const client = useAWSClient(RDSDataClient);
  bus.subscribe("stacks.metadata", (evt) => {
    if (interval) clearInterval(interval);

    interval = setInterval(() => {
      Object.values(evt.properties)
        .flat()
        .filter((c): c is RDSMetadata => c.type === "RDS")
        .map((c) => {
          try {
            client.send(
              new ExecuteStatementCommand({
                sql: "SELECT 1",
                secretArn: c.data.secretArn,
                resourceArn: c.data.clusterArn,
                database: c.data.defaultDatabaseName,
              })
            );
          } catch (e) {
            // Ignore error
            // If the cluster is not warm, this will throw:
            //   BadRequestException: Communication link failure
          }
        });
    }, 1000 * 60);
  });
});
