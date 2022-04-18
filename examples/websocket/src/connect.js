import AWS from "aws-sdk";

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export async function main(event) {
  const params = {
    TableName: process.env.tableName,
    Item: {
      id: event.requestContext.connectionId,
    },
  };

  await dynamoDb.put(params).promise();

  return { statusCode: 200, body: "Connected" };
}
