import { DynamoDB } from "aws-sdk";
import { Table } from "sst/node/table";

const dynamoDb = new DynamoDB.DocumentClient();

import { APIGatewayProxyHandler } from "aws-lambda";

export const main: APIGatewayProxyHandler = async (event) => {
  const params = {
    TableName: Table.Connections.tableName,
    Key: {
      id: event.requestContext.connectionId,
    },
  };

  await dynamoDb.delete(params).promise();

  return { statusCode: 200, body: "Disconnected" };
};
