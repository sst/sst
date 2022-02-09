import {
  RDSDataClient,
  ExecuteStatementCommand,
} from "@aws-sdk/client-rds-data";
import { useQuery } from "react-query";
import { useClient } from "./client";

export function useSqlQuery(
  sql: string,
  resourceArn: string,
  secretArn: string,
  db: string,
  refetch: () => void
) {
  const client = useClient(RDSDataClient);
  let success = false;

  return useQuery(
    ["sqlquery", sql],
    async () => {
      success = false;
      const command = new ExecuteStatementCommand({
        resourceArn: resourceArn,
        secretArn: secretArn,
        database: db,
        sql: sql,
        includeResultMetadata: true,
      });

      const result = await client.send(command);

      if (
        result.numberOfRecordsUpdated !== undefined &&
        result.numberOfRecordsUpdated >= 0
      ) {
        success = true;
      }

      const columns = result.columnMetadata?.map((item) => item.name);
      const rows = result.records?.map((item) =>
        item.map((el) => {
          switch (typeof Object.values(el)[0]) {
            case "number":
              return Object.values(el)[0];
            case "string":
              return Object.values(el)[0];
            case "boolean":
              return JSON.stringify(Object.values(el)[0]);
            case "object":
              return JSON.stringify(
                el.arrayValue && Object.values(el.arrayValue)[0]
              );
            default:
              return null;
          }
        })
      );

      if (sql.includes("database")) refetch();

      return {
        columns,
        rows,
        updated: result.numberOfRecordsUpdated,
        success,
      };
    },
    {
      enabled: sql.length > 0,
      refetchOnWindowFocus: false,
    }
  );
}

export function getDatabases(secretArn: string, clusterArn: string) {
  const dataClient = useClient(RDSDataClient);
  let databases: Array<string | undefined> = [];
  const defaultDatabases: Array<string | undefined> = [
    "postgres",
    "template0",
    "template1",
    "rdsadmin",
  ];

  return useQuery(["getDatabases", clusterArn, secretArn], async () => {
    const res = await dataClient.send(
      new ExecuteStatementCommand({
        resourceArn: clusterArn,
        secretArn: secretArn,
        sql: "select datname from pg_database",
      })
    );
    databases = res.records
      ? res.records?.map((item) => item[0].stringValue)
      : [];
    return databases.filter((el) => !defaultDatabases.includes(el));
  });
}
