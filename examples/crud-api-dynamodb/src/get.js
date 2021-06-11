import AWS from "aws-sdk";

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export async function main(event) {
  const params = {
    // Get the table name from the environment variable
    TableName: process.env.tableName,
    // Get the row where the noteId is the one in the path
    Key: {
      userId: "123",
      noteId: event.pathParameters.id,
    },
  };
  const results = await dynamoDb.get(params).promise();

  return results.Item
    ? {
        statusCode: 200,
        body: JSON.stringify(results.Item),
      }
    : {
        statusCode: 404,
        body: JSON.stringify({ error: true }),
      };
}
