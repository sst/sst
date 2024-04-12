import { drizzle } from "drizzle-orm/aws-data-api/pg";
import { RDSDataClient } from "@aws-sdk/client-rds-data";
import { Resource } from "sst";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";

const client = new RDSDataClient();
const db = drizzle(client, {
  database: Resource.Postgres.database,
  secretArn: Resource.Postgres.secretArn,
  resourceArn: Resource.Postgres.clusterArn,
});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  return {
    statusCode: 200,
    body: "ok",
  };
};
