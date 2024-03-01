export * as Dynamo from "./dynamo";

import { EntityConfiguration } from "electrodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { Table } from "sst/node/table";

export const Client = new DynamoDBClient({});

export const Configuration: EntityConfiguration = {
  table: Table.db.tableName,
  client: Client,
};
