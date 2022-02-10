import {
  RDSDataClient,
  ExecuteStatementCommand,
} from "@aws-sdk/client-rds-data";
import { useQuery, useMutation } from "react-query";
import { RDSMetadata } from "../../../../resources/src/Metadata";
import { useClient } from "./client";

interface RDSQueryProps {
  resourceArn: string;
  secretArn: string;
  database: string;
  sql: string;
}
export function useRDSExecute() {
  const client = useClient(RDSDataClient);

  return useMutation({
    mutationKey: ["rds", "execute"],
    mutationFn: async (opts: RDSQueryProps) => {
      const command = new ExecuteStatementCommand({
        resourceArn: opts.resourceArn,
        database: opts.database,
        secretArn: opts.secretArn,
        sql: opts.sql,
        includeResultMetadata: true,
      });

      const result = await client.send(command);

      const columns = result.columnMetadata?.map((item) => item.name);
      const rows = result.records?.map((item) =>
        item.map((el) => {
          if (el.isNull) return null;
          if (el.blobValue) return "<blob value>";
          if (el.longValue) return el.longValue;
          if (el.arrayValue) return JSON.stringify(el.longValue);
          if (el.doubleValue) return el.doubleValue;
          if (el.booleanValue) return JSON.stringify(el.booleanValue);
          if (el.stringValue) return el.stringValue;
          return null;
        })
      );

      return {
        columns: columns || [],
        rows: rows || [],
        updated: result.numberOfRecordsUpdated || 0,
      };
    },
  });
}

export function getDatabases(clusters: RDSMetadata[]) {
  const dataClient = useClient(RDSDataClient);

  const defaultDatabases: Array<string> = [
    "template0",
    "template1",
    "rdsadmin",
  ];

  return useQuery(["rds", "databases"], async () => {
    const proms = clusters.map(async (cluster) => {
      const res = await dataClient.send(
        new ExecuteStatementCommand({
          resourceArn: cluster.data.clusterArn,
          secretArn: cluster.data.secretArn,
          sql: "select datname from pg_database",
        })
      );
      return [
        cluster.addr,
        res.records
          ?.map((item) => item[0].stringValue)
          .filter((i): i is string => !defaultDatabases.includes(i!)) || [],
      ];
    });
    const result = Object.fromEntries(await Promise.all(proms)) as Record<
      string,
      string[]
    >;
    console.log(result);
    return result;
  });
}
