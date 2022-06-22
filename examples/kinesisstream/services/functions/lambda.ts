import AWS from "aws-sdk";

const stream = new AWS.Kinesis();

export async function handler() {
  await stream
    .putRecord({
      Data: JSON.stringify({
        message: "Hello from Lambda!",
      }),
      PartitionKey: "key",
      StreamName: process.env.streamName,
    })
    .promise();

  console.log("Message queued!");
  return {
    statusCode: 200,
    body: JSON.stringify({ status: "successful" }),
  };
}
