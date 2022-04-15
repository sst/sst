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
  await dynamoDb.delete(params).promise();

  return {
    statusCode: 200,
    body: JSON.stringify({ status: true }),
  };
}
