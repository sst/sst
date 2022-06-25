export * as Dynamo from "./dynamo";

import { EntityConfiguration } from "electrodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

export const Client = new DynamoDBClient({});

export const Configuration: EntityConfiguration = {
  table: process.env.TABLE_NAME,
  client: Client,
};
