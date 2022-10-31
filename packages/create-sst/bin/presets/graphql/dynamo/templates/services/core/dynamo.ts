export * as Dynamo from "./dynamo";

import { EntityConfiguration } from "electrodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { Table } from "@serverless-stack/node/table";

export const Client = new DynamoDBClient({});

export const Configuration: EntityConfiguration = {
  table: Table.table.tableName,
  client: Client,
};
