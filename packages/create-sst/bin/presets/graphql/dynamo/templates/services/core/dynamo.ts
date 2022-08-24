export * as Dynamo from "./dynamo";

import { EntityConfiguration } from "electrodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { Config } from "@serverless-stack/node/config";

export const Client = new DynamoDBClient({});

export const Configuration: EntityConfiguration = {
  table: Config.TABLE_NAME,
  client: Client,
};
