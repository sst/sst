import { DynamoDB } from "aws-sdk";

const dynamoDb = new DynamoDB.DocumentClient({
  region: process.env.REGION,
});

export async function getCount() {
  const results = await dynamoDb.get({
    // Get the table name from the environment variable
    TableName: process.env.TABLE_NAME!,
    // Get the row where the counter is called "clicks"
    Key: {
      counter: "clicks",
    },
  }).promise();

  // If there is a row, then get the value of the
  // column called "tally"
  let count = results.Item
    ? results.Item.tally as number
    : 0;

  return count;
}

export async function incrementCount() {
  const results = await dynamoDb.update({
    TableName: process.env.TABLE_NAME!,
    Key: {
      counter: "clicks",
    },
    // Update the "tally" column
    UpdateExpression: "ADD tally :inc",
    ExpressionAttributeValues: {
      // Increase the count
      ":inc": 1,
    },
    ReturnValues: "UPDATED_NEW",
  }).promise();

  console.log("== results ==", results)

  // If there is a row, then get the value of the
  // column called "tally"
  let count = results.Attributes!.tally;

  return count;
}