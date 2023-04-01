import { DynamoDB } from "aws-sdk";
import { Table } from "sst/node/table";

const dynamoDb = new DynamoDB.DocumentClient();

export async function main() {
  const getParams = {
    // Get the table name from the environment variable
    TableName: Table.Counter.tableName,
    // Get the row where the counter is called "hits"
    Key: {
      counter: "hits",
    },
  };
  const results = await dynamoDb.get(getParams).promise();

  // If there is a row, then get the value of the
  // column called "tally"
  let count = results.Item ? results.Item.tally : 0;

  const putParams = {
    TableName: Table.Counter.tableName,
    Key: {
      counter: "hits",
    },
    // Update the "tally" column
    UpdateExpression: "SET tally = :count",
    ExpressionAttributeValues: {
      // Increase the count
      ":count": ++count,
    },
  };
  await dynamoDb.update(putParams).promise();

  return {
    statusCode: 200,
    body: count,
  };
}
