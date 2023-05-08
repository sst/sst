import { DynamoDB } from "aws-sdk";
import { Table } from "sst/node/table";

const dynamoDb = new DynamoDB.DocumentClient();

import { APIGatewayProxyHandler } from "aws-lambda";

export const main: APIGatewayProxyHandler = async (event) => {
  const params = {
    TableName: Table.Connections.tableName,
    Item: {
      id: event.requestContext.connectionId,
    },
  };

  await dynamoDb.put(params).promise();

  return { statusCode: 200, body: "Connected" };
};
