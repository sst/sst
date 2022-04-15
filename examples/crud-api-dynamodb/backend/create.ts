import AWS from "aws-sdk";
import * as uuid from "uuid";

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export async function main(event) {
  const data = JSON.parse(event.body);

  const params = {
    // Get the table name from the environment variable
    TableName: process.env.tableName,
    Item: {
      userId: "123",
      noteId: uuid.v1(), // A unique uuid
      content: data.content, // Parsed from request body
      createdAt: Date.now(),
    },
  };
  await dynamoDb.put(params).promise();

  return {
    statusCode: 200,
    body: JSON.stringify(params.Item),
  };
}
