import { DynamoDB, ApiGatewayManagementApi } from "aws-sdk";
import { Table } from "sst/node/table";

const TableName = Table.Connections.tableName;
const dynamoDb = new DynamoDB.DocumentClient();

import { APIGatewayProxyHandler } from "aws-lambda";

export const main: APIGatewayProxyHandler = async (event) => {
  const messageData = JSON.parse(event.body).data;
  const { stage, domainName } = event.requestContext;

  const apiG = new ApiGatewayManagementApi({
    endpoint: `${domainName}/${stage}`,
  });

  const postToConnection = async function ({ id }) {
    try {
      // Send the message to the given client
      await apiG
        .postToConnection({ ConnectionId: id, Data: messageData })
        .promise();
    } catch (e) {
      if (e.statusCode === 410) {
        // Remove stale connections
        await dynamoDb.delete({ TableName, Key: { id } }).promise();
      }
    }
  };

  let connections: DynamoDB.DocumentClient.ScanOutput | undefined;

  do {
    // Scan for connections
    connections = await dynamoDb
      .scan({
        TableName,
        ProjectionExpression: "id",
        ExclusiveStartKey: connections?.LastEvaluatedKey,
      })
      .promise();

    // Iterate through all the connections
    await Promise.all(connections.Items.map(postToConnection as any));
  } while (typeof connections.LastEvaluatedKey !== "undefined");

  return { statusCode: 200, body: "Message sent" };
};
