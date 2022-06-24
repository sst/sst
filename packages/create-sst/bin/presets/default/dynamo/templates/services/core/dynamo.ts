import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { EntityConfiguration } from "electrodb";

export const Client = new DynamoDBClient({});

export const Configuration: EntityConfiguration = {
  table: process.env.DYNAMO_TABLE_NAME,
  client: Client,
};

export * as Dynamo from "./dynamo";
